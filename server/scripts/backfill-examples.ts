/**
 * Gives every existing word a short bilingual example (German + English). Dry-run by default.
 *
 * - No simple example (at most 12 words, current spelling): take the word's own KaikkiEntry example if it is simple (with its paired translation, else a machine
 *   translation), else a Tatoeba sentence pair (services/enrichment/tatoeba.ts; run `npm run import:tatoeba` first).
 *   Written to the vault card for linked-vault users, and to the Word row (and its rawBlock) for everyone.
 * - Short example but no translation: translate it (exampleTranslation is app-only, so this is safe on any card).
 * - Protected cards (manual/mt, or review for another reason) keep their example; a card flagged for review only
 *   because it had no short example is filled and the flag is cleared.
 *
 * Apply only after reviewing the JSONL report:
 *   npm run backfill:examples -- --apply [--user-id=<id>]
 */
import "dotenv/config";
import { appendFile, copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/db.js";
import {
  cleanExampleTranslation,
  findPrimaryEntry,
  isPedagogicalExample,
  translateText,
} from "../src/services/enrichment/kaikki.js";
import { findTatoebaExample, isSimpleExample, wordForms } from "../src/services/enrichment/tatoeba.js";
import { formatCardLine, shouldProtectCard, type CardCuration } from "../src/services/vault/format.js";
import { parseMasterFile } from "../src/services/vault/parser.js";
import { cardFromBlock } from "../src/services/vault/sync.js";
import { atomicWrite, serializeMasterFile } from "../src/services/vault/writer.js";

const TRANSLATE_DELAY_MS = 250;
const MISSING_EXAMPLE_NOTE = "No short pedagogical example was found";

const normalize = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
const pause = () => new Promise((resolve) => setTimeout(resolve, TRANSLATE_DELAY_MS));

/** Protected unless the only reason for review was the missing example this script fills. */
function keepsExample(curation: CardCuration, reviewNote: string | null): boolean {
  if (curation === "review" && reviewNote?.startsWith(MISSING_EXAMPLE_NOTE)) return false;
  return shouldProtectCard(curation);
}

type Found = { example: string; translation: string | null; source: "kaikki" | "machine-translation" | "tatoeba" };

async function findExample(word: { headword: string; grammar: string | null; declension: unknown; conjugation: unknown }): Promise<Found | null> {
  const entry = await findPrimaryEntry(word.headword);
  const candidate = entry?.example?.trim() ?? null;
  if (candidate && isPedagogicalExample(candidate) && isSimpleExample(candidate)) {
    const sourced = cleanExampleTranslation(entry?.exampleTranslation ?? null);
    if (sourced) return { example: candidate, translation: sourced, source: "kaikki" };
    const translated = await translateText(candidate);
    await pause();
    if (translated) return { example: candidate, translation: translated, source: "machine-translation" };
  }
  const tatoeba = await findTatoebaExample(word.headword, wordForms(word.headword, word));
  return tatoeba ? { example: tatoeba.de, translation: tatoeba.en, source: "tatoeba" } : null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const requestedUser = process.argv.find((arg) => arg.startsWith("--user-id="))?.slice(10);
  const users = await prisma.user.findMany({
    where: requestedUser ? { id: requestedUser } : {},
    select: { id: true, vaultPath: true },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.resolve(`data/backfill-examples-${timestamp}.jsonl`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  const report = (row: object) => appendFile(reportPath, `${JSON.stringify(row)}\n`);
  const counts = { examples: 0, translations: 0, protected: 0, unavailable: 0, total: 0, bilingualBefore: 0 };

  for (const user of users) {
    const words = await prisma.word.findMany({ where: { userId: user.id } });
    const masterPath = user.vaultPath ? path.join(user.vaultPath, "Vocab", "master.md") : null;
    const parsed = masterPath ? parseMasterFile(await readFile(masterPath, "utf8")) : null;
    const cards = new Map(parsed?.cards.map((c) => [c.sortKey, c]) ?? []);
    let fileChanged = false;

    for (const word of words) {
      counts.total++;
      const short = isPedagogicalExample(word.example) && isSimpleExample(word.example);
      if (short && word.exampleTranslation) {
        counts.bilingualBefore++;
        continue;
      }
      const base = { userId: user.id, headword: word.headword, oldExample: word.example, oldTranslation: word.exampleTranslation };

      if (short) {
        const translation = await translateText(word.example!);
        await pause();
        if (!translation) {
          counts.unavailable++;
          await report({ ...base, action: "translation-unavailable" });
          continue;
        }
        counts.translations++;
        await report({ ...base, action: apply ? "applied-translation" : "would-translate", newTranslation: translation });
        if (apply) await prisma.word.update({ where: { id: word.id }, data: { exampleTranslation: translation } });
        continue;
      }

      if (keepsExample(word.curation, word.reviewNote)) {
        counts.protected++;
        await report({ ...base, action: "skipped-protected", curation: word.curation });
        continue;
      }
      const found = await findExample(word);
      if (!found) {
        counts.unavailable++;
        await report({ ...base, action: "unavailable" });
        continue;
      }
      counts.examples++;
      await report({ ...base, action: apply ? "applied" : "would-apply", newExample: found.example, newTranslation: found.translation, source: found.source });
      if (!apply) continue;

      const clearsReview = word.curation === "review";
      const fields = {
        meaning: word.meaning,
        ipa: word.ipa,
        grammar: word.grammar,
        form: word.form,
        example: found.example,
        lesson: word.lesson,
        audioPath: word.audioPath,
        curation: clearsReview ? ("generated" as const) : word.curation,
        reviewNote: clearsReview ? null : word.reviewNote,
      };
      const cardLine = formatCardLine({ front: word.headword, ...fields });
      const card = cards.get(word.sortKey);
      if (card && normalize(card.fields.example ?? "") === normalize(word.example ?? "")) {
        card.cardLine = cardLine;
        card.fields = { ...card.fields, example: found.example, curation: fields.curation, reviewNote: fields.reviewNote };
        fileChanged = true;
      }
      await prisma.word.update({
        where: { id: word.id },
        data: {
          example: found.example,
          exampleTranslation: found.translation,
          curation: fields.curation,
          reviewNote: fields.reviewNote,
          rawBlock: cardLine + cardFromBlock(word.rawBlock).srLines.join(""),
        },
      });
    }

    if (apply && fileChanged && masterPath && parsed) {
      await copyFile(masterPath, `${masterPath}.bak.${timestamp}`);
      await atomicWrite(masterPath, serializeMasterFile(parsed.headerLines, parsed.cards));
    }
  }

  const after = counts.bilingualBefore + counts.examples + counts.translations;
  console.log(
    `${apply ? "Applied" : "Would apply"}: ${counts.examples} new examples, ${counts.translations} translations. ` +
      `Skipped ${counts.protected} protected cards; ${counts.unavailable} had nothing suitable.`,
  );
  console.log(`Bilingual examples: ${counts.bilingualBefore}/${counts.total} before, ${after}/${counts.total} after.`);
  console.log(`JSONL report: ${reportPath}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

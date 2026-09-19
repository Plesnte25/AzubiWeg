/**
 * Example-only repair for existing vocabulary.
 *
 * Dry-run by default. It never re-resolves meanings, IPA, grammar, audio, or
 * SRS state. Generated cards with no pedagogical example are filled from their
 * own KaikkiEntry example and its paired translation, with sentence translation
 * as a fallback. Manual/review/mt cards are reported and skipped.
 *
 * Apply only after reviewing the JSONL report:
 *   npm run backfill:examples -- --apply
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
import { formatCardLine, shouldProtectCard } from "../src/services/vault/format.js";
import { parseMasterFile } from "../src/services/vault/parser.js";
import { atomicWrite, serializeMasterFile } from "../src/services/vault/writer.js";

const MAX_DELAY_MS = 250;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isRepairTarget(example: string | null): boolean {
  return !isPedagogicalExample(example);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const requestedUser = process.argv.find((arg) => arg.startsWith("--user-id="))?.slice(10);
  const users = await prisma.user.findMany({
    where: { ...(requestedUser ? { id: requestedUser } : {}), vaultPath: { not: null } },
    select: { id: true, vaultPath: true },
  });
  if (!users.length) throw new Error("No linked-vault users matched.");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.resolve(`data/backfill-examples-${timestamp}.jsonl`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  let changed = 0;
  let skipped = 0;
  let unavailable = 0;

  for (const user of users) {
    const vaultPath = user.vaultPath!;
    const masterPath = path.join(vaultPath, "Vocab", "master.md");
    const content = await readFile(masterPath, "utf8");
    const parsed = parseMasterFile(content);
    let fileChanged = false;

    for (const card of parsed.cards) {
      if (!isRepairTarget(card.fields.example)) continue;
      const base = {
        userId: user.id,
        headword: card.front,
        oldExample: card.fields.example,
        oldTranslation: null as string | null,
      };
      if (shouldProtectCard(card.fields.curation)) {
        skipped++;
        await appendFile(reportPath, `${JSON.stringify({ ...base, action: "skipped-protected", curation: card.fields.curation })}\n`);
        continue;
      }

      const entry = await findPrimaryEntry(card.front);
      const candidate = entry?.example?.trim() ?? null;
      let translation = cleanExampleTranslation(entry?.exampleTranslation ?? null);
      const paired = !!candidate && normalize(candidate) === normalize(card.fields.example ?? "");
      if (!candidate || !isPedagogicalExample(candidate)) {
        unavailable++;
        await appendFile(reportPath, `${JSON.stringify({ ...base, action: "unavailable", candidate })}\n`);
        continue;
      }
      if (!translation || !paired) translation = await translateText(candidate);

      const nextFields = { ...card.fields, example: candidate };
      card.cardLine = formatCardLine({ front: card.front, ...nextFields });
      card.fields = nextFields;
      fileChanged = true;
      changed++;
      await appendFile(reportPath, `${JSON.stringify({
        ...base,
        action: apply ? "applied" : "would-apply",
        newExample: candidate,
        newTranslation: translation,
        source: paired && entry?.exampleTranslation ? "kaikki" : "machine-translation",
      })}\n`);
      if (apply) {
        await prisma.word.updateMany({
          where: { userId: user.id, sortKey: card.sortKey },
          data: translation ? { example: candidate, exampleTranslation: translation } : { example: candidate },
        });
      }
      await new Promise((resolve) => setTimeout(resolve, MAX_DELAY_MS));
    }

    if (apply && fileChanged) {
      await copyFile(masterPath, `${masterPath}.bak.${timestamp}`);
      await atomicWrite(masterPath, serializeMasterFile(parsed.headerLines, parsed.cards));
    }
  }

  console.log(`${apply ? "Applied" : "Would apply"} ${changed} example repairs; skipped ${skipped} protected cards; ${unavailable} had no suitable candidate.`);
  console.log(`JSONL report: ${reportPath}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

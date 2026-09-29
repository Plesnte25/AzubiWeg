/**
 * Old cards whose meaning is only a cross-reference ("Begrüßungen — (Noun) plural of Begrüßung") are refiled the way
 * adding the word today would file them: under the base word with its real meaning, the typed form kept as a form
 * note on it ("Begrüßungen = plural of Begrüßung"). Dry run by default.
 *
 * Each card goes back through vaultSync.enrichIntoVault(), the add-word path itself: it resolves the lemma via
 * kaikki, merges the form note onto an existing lemma card or writes a new one carrying the old card's review
 * history, drops the old card, and reconciles the DB. Protected cards (manual / review / mt) are never touched, and
 * only vault-linked users are handled (every such card came from the vault's add_word.py era).
 *
 *   npm run backfill:form-meanings                dry run: what each card would become
 *   npm run backfill:form-meanings -- --apply     refile them (backs up master.md first)
 */
import "dotenv/config";
import { copyFile } from "node:fs/promises";
import { prisma } from "../src/db.js";
import { delay, resolveWordSafe } from "../src/services/enrichment/index.js";
import { formOfTargets, isFormOfMeaning } from "../src/services/enrichment/kaikki.js";
import { shouldProtectCard } from "../src/services/vault/format.js";
import { vaultFiles, vaultSync } from "../src/services/vault/sync.js";
import type { Prisma } from "@prisma/client";

const apply = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({ where: { vaultPath: { not: null } }, select: { id: true, email: true, vaultPath: true } });
  let found = 0;
  let refiled = 0;
  for (const user of users) {
    const words = (await prisma.word.findMany({ where: { userId: user.id }, orderBy: { sortKey: "asc" } })).filter(
      (w) => isFormOfMeaning(w.meaning) && !shouldProtectCard(w.curation),
    );
    if (words.length === 0) continue;
    console.log(`${user.email}: ${words.length} card(s) with a cross-reference meaning${apply ? "" : " (dry run)"}`);
    if (apply) {
      const { master } = vaultFiles(user.vaultPath!);
      await copyFile(master, `${master}.bak.form-meanings-${Date.now()}`);
    }
    for (const word of words) {
      found++;
      const { res } = await resolveWordSafe(word.headword);
      // only refile under a base word the old meaning itself names ("plural of Begrüßung" → Begrüßung)
      const named = formOfTargets(word.meaning!).map((t) => t.toLowerCase());
      const target = res.headword.toLowerCase() !== word.sortKey && named.includes(res.headword.toLowerCase()) ? res.headword : null;
      console.log(`  ${word.headword} — "${word.meaning}" → ${target ? `${target} — "${res.meaning ?? "?"}" · form: ${res.formNote ?? "-"}` : "no base word found, left as is"}`);
      if (!apply || !target) continue;
      const result = await vaultSync.enrichIntoVault(user.id, user.vaultPath!, word.headword, word.lesson);
      if (result.skipped || result.rejected) {
        console.log(`    skipped (${result.rejected ?? "protected"})`);
        continue;
      }
      // app-only columns the add route also writes (never part of the vault card)
      const data: Prisma.WordUpdateInput = {
        ...(result.declension != null ? { declension: result.declension as Prisma.InputJsonValue } : {}),
        ...(result.conjugation != null ? { conjugation: result.conjugation as Prisma.InputJsonValue } : {}),
        ...(result.exampleTranslation ? { exampleTranslation: result.exampleTranslation } : {}),
      };
      if (Object.keys(data).length) {
        await prisma.word.updateMany({ where: { userId: user.id, sortKey: result.headword.toLowerCase() }, data });
      }
      refiled++;
      console.log(`    refiled under ${result.headword}${result.merged ? " (form note added to the existing card)" : ""}`);
      await delay(400);
    }
  }
  console.log(`\n${found} card(s) found${apply ? `, ${refiled} refiled` : " — pass --apply to refile"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

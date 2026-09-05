/**
 * One-off backfill: populates exampleTranslation on existing Word rows that
 * already have `example` (German) set but no `exampleTranslation` — words
 * enriched before that column existed. First tries the matching
 * KaikkiEntry's own sourced translation (same pattern as
 * backfill-kaikki.ts's declension/conjugation backfill); when no
 * KaikkiEntry match exists, its own example doesn't match the Word's
 * example, or it has no real translation, falls back to a live machine
 * translation of the word's own German example via translateText() — the
 * same free/unofficial endpoint the enrichment pipeline now uses for the
 * same fallback on new words.
 *
 * **The KaikkiEntry.example match check matters**: `Word.example` for
 * already-imported words came from the user's original vault import, not
 * from any particular KaikkiEntry — trusting `entry.exampleTranslation`
 * without checking `entry.example` corresponds to the same sentence grafts
 * a translation from an unrelated Wiktionary citation onto the Word's real
 * example (confirmed live for "Lehrer": KaikkiEntry's own example was an
 * unrelated bibliographic fragment, but its exampleTranslation got stored
 * as if it translated the Word's real, different example sentence).
 *
 * Scoped narrow like backfill-kaikki.ts: exampleTranslation is a brand new
 * app-only column with no prior value, so there's nothing hand-curated to
 * risk overwriting.
 *
 * A per-word delay (matching BATCH_DELAY_MS's existing politeness
 * convention) and a try/catch around the live-translation call keep one
 * transient network hiccup from aborting the whole run.
 *
 * Safe to re-run: only touches rows where exampleTranslation is still null.
 *
 * Run with `npm run backfill:example-translation`.
 *
 * `--fix-mismatched`: a separate corrective mode for rows that already got
 * a *wrong* exampleTranslation from this bug before the guard above
 * existed (the normal mode's `exampleTranslation: null` filter doesn't
 * touch those — they're not null, just wrong). Re-checks every Word with
 * both fields set against its KaikkiEntry and re-derives via
 * translateText() whenever the pairing doesn't hold. Combine with
 * `--dry-run` to preview what would change before writing.
 *
 * Run with `npm run backfill:example-translation -- --fix-mismatched
 * --dry-run` first, review the log, then drop `--dry-run` to apply.
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { cleanExampleTranslation, findPrimaryEntry, translateText } from "../src/services/enrichment/kaikki.js";
import { BATCH_DELAY_MS, delay } from "../src/services/enrichment/index.js";

function normalizeExample(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

async function backfillMissing() {
  const words = await prisma.word.findMany({
    where: { example: { not: null }, exampleTranslation: null },
    select: { id: true, headword: true, example: true },
  });
  console.log(`Backfilling exampleTranslation for ${words.length} words...`);

  let fromKaikki = 0;
  let fromTranslation = 0;
  for (const [i, word] of words.entries()) {
    const entry = await findPrimaryEntry(word.headword);
    const sourced = cleanExampleTranslation(entry?.exampleTranslation ?? null);
    const pairingHolds = !!entry?.example && normalizeExample(entry.example) === normalizeExample(word.example!);
    let translation = sourced && pairingHolds ? sourced : null;
    if (translation) {
      fromKaikki++;
    } else {
      try {
        translation = await translateText(word.example!);
        if (translation) fromTranslation++;
      } catch (e) {
        console.error(`Translation failed for "${word.headword}":`, e instanceof Error ? e.message : e);
      }
    }
    if (translation) {
      await prisma.word.update({ where: { id: word.id }, data: { exampleTranslation: translation } });
    }
    if (i < words.length - 1) await delay(BATCH_DELAY_MS);
  }

  console.log(`Done. ${fromKaikki} from KaikkiEntry, ${fromTranslation} from live translation, ${words.length - fromKaikki - fromTranslation} still without one.`);
}

async function fixMismatched(dryRun: boolean) {
  const words = await prisma.word.findMany({
    where: { example: { not: null }, exampleTranslation: { not: null } },
    select: { id: true, headword: true, example: true, exampleTranslation: true },
  });
  console.log(`Checking ${words.length} words with an existing translation for a KaikkiEntry pairing mismatch...`);

  let fixed = 0;
  for (const [i, word] of words.entries()) {
    const entry = await findPrimaryEntry(word.headword);
    const pairingHolds = !!entry?.example && normalizeExample(entry.example) === normalizeExample(word.example!);
    if (pairingHolds) continue;

    try {
      const retranslated = await translateText(word.example!);
      if (retranslated && retranslated !== word.exampleTranslation) {
        console.log(`${dryRun ? "[dry run] Would fix" : "Fixing"} "${word.headword}":\n  old: ${word.exampleTranslation}\n  new: ${retranslated}`);
        if (!dryRun) {
          await prisma.word.update({ where: { id: word.id }, data: { exampleTranslation: retranslated } });
        }
        fixed++;
      }
    } catch (e) {
      console.error(`Re-translation failed for "${word.headword}":`, e instanceof Error ? e.message : e);
    }
    if (i < words.length - 1) await delay(BATCH_DELAY_MS);
  }

  console.log(`${dryRun ? "[dry run] Would fix" : "Fixed"} ${fixed} mismatched word(s) out of ${words.length} checked.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  if (args.includes("--fix-mismatched")) {
    await fixMismatched(dryRun);
  } else {
    await backfillMissing();
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

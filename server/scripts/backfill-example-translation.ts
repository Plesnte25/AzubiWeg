/**
 * One-off backfill: populates exampleTranslation on existing Word rows that
 * already have `example` (German) set but no `exampleTranslation` — words
 * enriched before that column existed. First tries the matching
 * KaikkiEntry's own sourced translation (same pattern as
 * backfill-kaikki.ts's declension/conjugation backfill); when no
 * KaikkiEntry match exists or it has no real translation, falls back to a
 * live machine translation of the word's own German example via
 * translateText() — the same free/unofficial endpoint the enrichment
 * pipeline now uses for the same fallback on new words.
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
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { cleanExampleTranslation, findPrimaryEntry, translateText } from "../src/services/enrichment/kaikki.js";
import { BATCH_DELAY_MS, delay } from "../src/services/enrichment/index.js";

async function main() {
  const words = await prisma.word.findMany({
    where: { example: { not: null }, exampleTranslation: null },
    select: { id: true, headword: true, example: true },
  });
  console.log(`Backfilling exampleTranslation for ${words.length} words...`);

  let fromKaikki = 0;
  let fromTranslation = 0;
  for (const [i, word] of words.entries()) {
    const entry = await findPrimaryEntry(word.headword);
    let translation = cleanExampleTranslation(entry?.exampleTranslation ?? null);
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
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

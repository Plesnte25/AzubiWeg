/**
 * One-off backfill: populates exampleTranslation on existing Word rows that
 * already have `example` (German) set but no `exampleTranslation` — words
 * enriched before that column existed. Looks up the matching KaikkiEntry by
 * headword and copies its exampleTranslation across, same pattern as
 * backfill-kaikki.ts's declension/conjugation backfill.
 *
 * Scoped narrow like that script: exampleTranslation is a brand new
 * app-only column with no prior value, so there's nothing hand-curated to
 * risk overwriting.
 *
 * Safe to re-run: only touches rows where exampleTranslation is still null.
 *
 * Run with `npm run backfill:example-translation`.
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { cleanExampleTranslation, findPrimaryEntry } from "../src/services/enrichment/kaikki.js";

async function main() {
  const words = await prisma.word.findMany({
    where: { example: { not: null }, exampleTranslation: null },
    select: { id: true, headword: true },
  });
  console.log(`Backfilling exampleTranslation for ${words.length} words...`);

  let updated = 0;
  for (const word of words) {
    const entry = await findPrimaryEntry(word.headword);
    const translation = cleanExampleTranslation(entry?.exampleTranslation ?? null);
    if (!translation) continue;
    await prisma.word.update({
      where: { id: word.id },
      data: { exampleTranslation: translation },
    });
    updated++;
  }

  console.log(`Done. ${updated} of ${words.length} words got an exampleTranslation.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

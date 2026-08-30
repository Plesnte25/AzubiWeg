/**
 * One-off backfill: populates declension/conjugation on every existing Word
 * row from the newly-imported KaikkiEntry table (run import:kaikki first).
 *
 * Scoped deliberately narrow — only declension/conjugation, both brand new
 * app-only columns with no prior value ever (unlike meaning/ipa/grammar/
 * example, which are vault-format fields a user may have hand-edited; this
 * TS pipeline has no "curated, don't touch" marker the way add_word.py's
 * `<!--curated:...-->` convention does, so leaving those alone here is the
 * safe default rather than risking a silent overwrite of hand-curated text).
 *
 * Safe to re-run: always re-derives from the current KaikkiEntry data,
 * no state of its own.
 *
 * Run with `npm run backfill:kaikki`.
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/db.js";
import { findPrimaryEntry } from "../src/services/enrichment/kaikki.js";

async function main() {
  const words = await prisma.word.findMany({ select: { id: true, headword: true } });
  console.log(`Backfilling ${words.length} words...`);

  let updated = 0;
  let matched = 0;
  for (const word of words) {
    const entry = await findPrimaryEntry(word.headword);
    if (!entry) continue;
    matched++;
    if (!entry.declension && !entry.conjugation) continue;
    await prisma.word.update({
      where: { id: word.id },
      data: {
        declension: (entry.declension ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        conjugation: (entry.conjugation ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    updated++;
  }

  console.log(`Done. ${matched} words matched a KaikkiEntry, ${updated} got declension/conjugation data.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

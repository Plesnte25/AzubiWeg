/**
 * One-off data migration for the Sources rebuild (Claude Design handoff
 * turn 10a): folds the old 4-value StudySourceType (youtube/nicos_weg/
 * duolingo/other) into the new 7-value one (youtube/audio/video/book/
 * course/article/link), and moves every SavedLink row into StudySource as
 * a real type="link" row, so "Saved links" isn't a separate hardcoded
 * concept anymore.
 *
 * Mapping, per an explicit user decision (no smarter auto-guessing than
 * this):
 *   - nicos_weg -> course (unambiguous, Nicos Weg already has a real
 *     "course" fetch engine)
 *   - duolingo, other -> link (placeholder; the user re-categorizes these
 *     by hand afterward, on purpose — not something this script should
 *     try to guess more precisely)
 *   - every SavedLink -> a new StudySource(type: "link"), title/url/notes
 *     preserved, createdAt preserved (so it still sorts correctly in the
 *     activity feed); SavedLink.skill is dropped (an explicit decision —
 *     the new Sources model has no per-source skill field, and the design
 *     spec's link cards don't show one)
 *   - provider is backfilled from each migrated row's own url hostname
 *     where a url exists and provider is still null — a formatting
 *     nicety (What domain is this?), not a type guess
 *
 * Safe to re-run: the type remap only touches rows still on the old
 * values, and SavedLink migration only runs while SavedLink rows still
 * exist (delete them once you've verified this ran cleanly, before the
 * follow-up migration that drops the SavedLink table itself).
 *
 * Run with `npx tsx scripts/migrate-source-types-and-links.ts --dry-run`
 * first, review the log, then drop `--dry-run` to apply.
 */
import "dotenv/config";
import { prisma } from "../src/db.js";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function remapTypes(dryRun: boolean) {
  const nicosWeg = await prisma.studySource.findMany({ where: { type: "nicos_weg" }, select: { id: true, title: true } });
  const legacy = await prisma.studySource.findMany({ where: { type: { in: ["duolingo", "other"] } }, select: { id: true, title: true, type: true } });

  console.log(`${dryRun ? "[dry run] Would remap" : "Remapping"} ${nicosWeg.length} nicos_weg -> course, ${legacy.length} duolingo/other -> link.`);
  if (!dryRun) {
    await prisma.studySource.updateMany({ where: { type: "nicos_weg" }, data: { type: "course" } });
    await prisma.studySource.updateMany({ where: { type: { in: ["duolingo", "other"] } }, data: { type: "link" } });
  }
}

async function backfillProvider(dryRun: boolean) {
  const rows = await prisma.studySource.findMany({
    where: { provider: null, url: { not: null } },
    select: { id: true, url: true },
  });
  let updated = 0;
  for (const row of rows) {
    const host = hostnameOf(row.url!);
    if (!host) continue;
    if (!dryRun) await prisma.studySource.update({ where: { id: row.id }, data: { provider: host } });
    updated++;
  }
  console.log(`${dryRun ? "[dry run] Would backfill" : "Backfilled"} provider (from url hostname) on ${updated} of ${rows.length} candidate row(s).`);
}

async function migrateSavedLinks(dryRun: boolean) {
  const links = await prisma.savedLink.findMany();
  console.log(`${dryRun ? "[dry run] Would migrate" : "Migrating"} ${links.length} SavedLink row(s) into StudySource(type: "link").`);
  for (const link of links) {
    const provider = hostnameOf(link.url);
    if (dryRun) {
      console.log(`  [dry run] "${link.title}" (${link.url}) -> StudySource link, provider=${provider ?? "null"}`);
      continue;
    }
    await prisma.studySource.create({
      data: {
        userId: link.userId,
        type: "link",
        title: link.title,
        url: link.url,
        provider,
        notes: link.note,
        createdAt: link.createdAt,
      },
    });
  }
  console.log(`${dryRun ? "[dry run] Would create" : "Created"} ${links.length} new StudySource row(s) from SavedLink.`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await remapTypes(dryRun);
  await backfillProvider(dryRun);
  await migrateSavedLinks(dryRun);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

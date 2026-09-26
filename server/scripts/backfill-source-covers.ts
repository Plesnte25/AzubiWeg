/**
 * Gives existing study sources what new ones get on create: a default cover fetched from the link (YouTube
 * thumbnail or the page's og:image) when there's neither an uploaded nor a fetched one, and DW's lesson descriptions
 * for Nicos Weg course units that have none. Dry-run by default.
 *
 *   npm run backfill:source-covers -- --apply
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { fetchCoverUrl } from "../src/services/learning/cover.js";
import { extractCourseId, fetchCourse } from "../src/services/learning/nicosweg.js";

async function main() {
  const apply = process.argv.includes("--apply");
  const sources = await prisma.studySource.findMany({ where: { url: { not: null } }, include: { units: true } });
  let covers = 0;
  let descriptions = 0;

  for (const source of sources) {
    if (!source.coverFileId && !source.coverImageUrl) {
      const cover = await fetchCoverUrl(source.url!, source.units);
      console.log(`${source.title}: cover ${cover ?? "(none found)"}`);
      if (cover) {
        covers++;
        if (apply) await prisma.studySource.update({ where: { id: source.id }, data: { coverImageUrl: cover } });
      }
    }

    const courseId = extractCourseId(source.url!);
    const missing = source.units.filter((u) => !u.description && u.url);
    if (courseId && missing.length > 0) {
      const course = await fetchCourse(courseId);
      const byUrl = new Map(course?.lessons.map((l) => [l.url, l.description]) ?? []);
      for (const unit of missing) {
        const description = byUrl.get(unit.url!);
        if (!description) continue;
        descriptions++;
        if (apply) await prisma.studySourceUnit.update({ where: { id: unit.id }, data: { description } });
      }
      console.log(`${source.title}: ${missing.length} lessons without a description`);
    }
  }

  console.log(`${apply ? "Applied" : "Would apply"}: ${covers} covers, ${descriptions} lesson descriptions.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

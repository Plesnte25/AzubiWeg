import { prisma } from "../../db.js";
import { DEFAULT_SYLLABUS_ITEMS, SYLLABUS_VERSION, syllabusItemSeed } from "./syllabus-defaults.js";

const key = (level: string, title: string) => `${level}|${title.trim().toLowerCase()}`;

/**
 * Lazily seeds a user's syllabus on first use, or reseeds it in place on a
 * SYLLABUS_VERSION bump — preserving completions and Grammar Notebook notes
 * by (level, normalized title) match, and re-attaching note files to the
 * same-titled item in the new set. Shared by `GET /syllabus` and the
 * roadmap's `ensureCurrentVersion` (roadmap-generator.ts needs live
 * SyllabusItem rows to exist before it can derive anything from them).
 */
export async function ensureSyllabusSeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!user.learningSeededAt) {
    // seed once per user; the stamp guards re-seeding
    await prisma.$transaction([
      prisma.syllabusItem.createMany({
        data: DEFAULT_SYLLABUS_ITEMS.map((item, i) => ({ userId, ...syllabusItemSeed(item), sortOrder: i })),
      }),
      prisma.user.update({
        where: { id: userId },
        data: { learningSeededAt: new Date(), syllabusVersion: SYLLABUS_VERSION },
      }),
    ]);
    return;
  }

  if (user.syllabusVersion >= SYLLABUS_VERSION) return;

  // Apply authored changes only while advancing the version. Keeping this
  // inside one transaction makes repeated/concurrent requests idempotent and
  // prevents a current-version user from receiving an unexpected write.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, syllabusVersion: { lt: SYLLABUS_VERSION } },
      data: { syllabusVersion: SYLLABUS_VERSION },
    });
    if (claimed.count === 0) return;

    const existing = await tx.syllabusItem.findMany({
      where: { userId },
      select: {
        id: true,
        level: true,
        title: true,
      },
    });
    const existingByKey = new Map(existing.map((item) => [key(item.level, item.title), item.id]));
    for (const [sortOrder, item] of DEFAULT_SYLLABUS_ITEMS.entries()) {
      const seed = syllabusItemSeed(item);
      const existingId = existingByKey.get(key(item.level, item.title));
      if (existingId) {
        await tx.syllabusItem.update({
          where: { id: existingId },
          data: { ...seed, sortOrder },
        });
      } else {
        await tx.syllabusItem.create({
          data: { userId, ...seed, sortOrder },
        });
      }
    }
  });
}

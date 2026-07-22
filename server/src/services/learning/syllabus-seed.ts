import { prisma } from "../../db.js";
import { DEFAULT_SYLLABUS_ITEMS, SYLLABUS_VERSION } from "./syllabus-defaults.js";

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
    // seed once per user; the stamp guards re-seeding (same as the checklist)
    await prisma.$transaction([
      prisma.syllabusItem.createMany({
        data: DEFAULT_SYLLABUS_ITEMS.map((item, i) => ({ userId, ...item, sortOrder: i })),
      }),
      prisma.user.update({
        where: { id: userId },
        data: { learningSeededAt: new Date(), syllabusVersion: SYLLABUS_VERSION },
      }),
    ]);
    return;
  }

  if (user.syllabusVersion >= SYLLABUS_VERSION) return;

  // the authored syllabus was revised: replace the user's copy, carrying
  // completions/notes over wherever a (level, title) still exists in the new set
  await prisma.$transaction(async (tx) => {
    const existing = await tx.syllabusItem.findMany({
      where: { userId },
      select: {
        id: true,
        level: true,
        title: true,
        completedAt: true,
        examples: true,
        exceptions: true,
        commonMistakes: true,
      },
    });
    const oldKeyById = new Map(existing.map((i) => [i.id, key(i.level, i.title)]));
    const completedAt = new Map(
      existing.filter((i) => i.completedAt !== null).map((i) => [key(i.level, i.title), i.completedAt]),
    );
    // Grammar Notebook fields are the user's own notes, not authored
    // content — carried over the same way completedAt is, never reset from
    // DEFAULT_SYLLABUS_ITEMS (which has no opinion on these fields at all)
    const notesByKey = new Map(
      existing
        .filter((i) => i.examples || i.exceptions || i.commonMistakes)
        .map((i) => [
          key(i.level, i.title),
          { examples: i.examples, exceptions: i.exceptions, commonMistakes: i.commonMistakes },
        ]),
    );
    // detach note files first — deleting items would cascade them away
    const attachedFiles = await tx.uploadedFile.findMany({
      where: { userId, syllabusItemId: { not: null } },
      select: { id: true, syllabusItemId: true },
    });
    await tx.uploadedFile.updateMany({
      where: { userId, syllabusItemId: { not: null } },
      data: { syllabusItemId: null },
    });

    await tx.syllabusItem.deleteMany({ where: { userId } });
    await tx.syllabusItem.createMany({
      data: DEFAULT_SYLLABUS_ITEMS.map((item, i) => {
        const notes = notesByKey.get(key(item.level, item.title));
        return {
          userId,
          ...item,
          sortOrder: i,
          completedAt: completedAt.get(key(item.level, item.title)) ?? null,
          examples: notes?.examples ?? null,
          exceptions: notes?.exceptions ?? null,
          commonMistakes: notes?.commonMistakes ?? null,
        };
      }),
    });

    // re-attach notes to same-titled items in the new syllabus
    const fresh = await tx.syllabusItem.findMany({
      where: { userId },
      select: { id: true, level: true, title: true },
    });
    const newIdByKey = new Map(fresh.map((i) => [key(i.level, i.title), i.id]));
    for (const file of attachedFiles) {
      const oldKey = file.syllabusItemId ? oldKeyById.get(file.syllabusItemId) : undefined;
      const newId = oldKey ? newIdByKey.get(oldKey) : undefined;
      if (newId) {
        await tx.uploadedFile.update({ where: { id: file.id }, data: { syllabusItemId: newId } });
      }
    }

    await tx.user.update({ where: { id: userId }, data: { syllabusVersion: SYLLABUS_VERSION } });
  });
}

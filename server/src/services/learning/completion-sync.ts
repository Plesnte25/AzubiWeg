import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Mastery follows completion only for items with no exercise (custom items): completing one counts as a pass for
 * Level % (stations.ts), un-completing takes it back. Items with an exercise get mastery solely from passing it
 * (routes/learning.ts), so they're left alone here.
 */
export function masteryForCompletion(
  item: { exerciseType: string | null; masteryState: string },
  completed: boolean,
): { masteryState: "passed" | "not_started" } | Record<string, never> {
  if (item.exerciseType) return {};
  if (completed && item.masteryState === "not_started") return { masteryState: "passed" };
  if (!completed && item.masteryState === "passed") return { masteryState: "not_started" };
  return {};
}

/**
 * Toggles a SyllabusItem's completion and mirrors it onto every linked
 * RoadmapTask (there may be none, if this item was seeded before the
 * roadmap/syllabus merge or isn't in the current phase's generated range).
 * completedAt on the item and its linked task(s) are the same fact — this is
 * the only place either should be written from a "completed" toggle.
 */
export async function setSyllabusItemCompletion(tx: Tx, userId: string, itemId: string, completed: boolean) {
  const item = await tx.syllabusItem.findFirst({ where: { id: itemId, userId } });
  if (!item) return null;

  const completedAt = completed ? (item.completedAt ?? new Date()) : null;
  const [updated] = await Promise.all([
    tx.syllabusItem.update({
      where: { id: item.id },
      data: { completedAt, ...masteryForCompletion(item, completed) },
      include: { files: true },
    }),
    tx.roadmapTask.updateMany({ where: { syllabusItemId: item.id, day: { userId } }, data: { completedAt } }),
  ]);

  return updated;
}

/**
 * Sets a source lesson's completion and recomputes the source's counters. A lesson turning done counts as streak
 * activity (a StudySourceLog row), as when it's ticked in the Library.
 */
export async function setUnitCompletion(tx: Tx, unitId: string, completedAt: Date | null) {
  const unit = await tx.studySourceUnit.findUnique({ where: { id: unitId } });
  if (!unit) return null;
  const turningDone = completedAt !== null && unit.completedAt === null;
  if ((unit.completedAt === null) === (completedAt === null)) return unit;
  await tx.studySourceUnit.update({ where: { id: unit.id }, data: { completedAt } });
  const [total, done] = await Promise.all([
    tx.studySourceUnit.count({ where: { sourceId: unit.sourceId } }),
    tx.studySourceUnit.count({ where: { sourceId: unit.sourceId, completedAt: { not: null } } }),
  ]);
  await tx.studySource.update({ where: { id: unit.sourceId }, data: { totalUnits: total, completedUnits: done } });
  if (turningDone) await tx.studySourceLog.create({ data: { sourceId: unit.sourceId, delta: 1 } });
  return unit;
}

/**
 * Toggles a RoadmapTask's completion and, if it's linked to a syllabus item
 * or a source lesson, mirrors it there too. Never calls setSyllabusItemCompletion (no
 * recursion) — both setters write the same two tables directly.
 */
export async function setRoadmapTaskCompletion(tx: Tx, userId: string, taskId: string, completed: boolean) {
  const task = await tx.roadmapTask.findFirst({ where: { id: taskId, day: { userId } } });
  if (!task) return null;

  const completedAt = completed ? (task.completedAt ?? new Date()) : null;
  const item = task.syllabusItemId
    ? await tx.syllabusItem.findFirst({ where: { id: task.syllabusItemId, userId }, select: { exerciseType: true, masteryState: true } })
    : null;
  await Promise.all([
    tx.roadmapTask.update({ where: { id: task.id }, data: { completedAt } }),
    task.syllabusItemId && item
      ? tx.syllabusItem.updateMany({
          where: { id: task.syllabusItemId, userId },
          data: { completedAt, ...masteryForCompletion(item, completed) },
        })
      : Promise.resolve(),
  ]);
  if (task.studySourceUnitId) await setUnitCompletion(tx, task.studySourceUnitId, completedAt);

  return tx.roadmapTask.findUniqueOrThrow({ where: { id: task.id }, include: { files: true } });
}

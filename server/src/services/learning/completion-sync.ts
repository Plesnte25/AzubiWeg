import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

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
    tx.syllabusItem.update({ where: { id: item.id }, data: { completedAt }, include: { files: true } }),
    tx.roadmapTask.updateMany({ where: { syllabusItemId: item.id, day: { userId } }, data: { completedAt } }),
  ]);

  return updated;
}

/**
 * Toggles a RoadmapTask's completion and, if it's linked to a syllabus item,
 * mirrors it there too. Never calls setSyllabusItemCompletion (no
 * recursion) — both setters write the same two tables directly.
 */
export async function setRoadmapTaskCompletion(tx: Tx, userId: string, taskId: string, completed: boolean) {
  const task = await tx.roadmapTask.findFirst({ where: { id: taskId, day: { userId } } });
  if (!task) return null;

  const completedAt = completed ? (task.completedAt ?? new Date()) : null;
  await Promise.all([
    tx.roadmapTask.update({ where: { id: task.id }, data: { completedAt } }),
    task.syllabusItemId
      ? tx.syllabusItem.updateMany({ where: { id: task.syllabusItemId, userId }, data: { completedAt } })
      : Promise.resolve(),
  ]);

  return tx.roadmapTask.findUniqueOrThrow({ where: { id: task.id }, include: { files: true } });
}

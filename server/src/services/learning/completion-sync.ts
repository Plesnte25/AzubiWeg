import type { Prisma } from "@prisma/client";
import { checkAndAwardBadges } from "../gamification/engine.js";

type Tx = Prisma.TransactionClient;

const DAY_BONUS_POINTS = 5;

/** Awards each day's one-time +5 completion bonus the moment its last task
 * finishes — gated by bonusAwardedAt so re-toggling never re-awards it. */
async function maybeAwardDayBonuses(tx: Tx, userId: string, dayIds: string[]): Promise<void> {
  if (dayIds.length === 0) return;
  const days = await tx.roadmapDay.findMany({
    where: { id: { in: dayIds }, userId, bonusAwardedAt: null },
    select: { id: true, tasks: { select: { completedAt: true } } },
  });
  const nowlyComplete = days.filter((d) => d.tasks.length > 0 && d.tasks.every((t) => t.completedAt !== null));
  if (nowlyComplete.length === 0) return;

  await Promise.all([
    ...nowlyComplete.map((d) => tx.roadmapDay.update({ where: { id: d.id }, data: { bonusAwardedAt: new Date() } })),
    tx.user.update({ where: { id: userId }, data: { points: { increment: DAY_BONUS_POINTS * nowlyComplete.length } } }),
  ]);
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
  const linkedTasks = await tx.roadmapTask.findMany({
    where: { syllabusItemId: item.id, day: { userId } },
    select: { dayId: true },
  });
  const [updated] = await Promise.all([
    tx.syllabusItem.update({ where: { id: item.id }, data: { completedAt }, include: { files: true } }),
    tx.roadmapTask.updateMany({ where: { syllabusItemId: item.id, day: { userId } }, data: { completedAt } }),
  ]);

  if (completed) {
    await maybeAwardDayBonuses(tx, userId, linkedTasks.map((t) => t.dayId));
    await checkAndAwardBadges(tx, userId);
  }
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

  if (completed) {
    await maybeAwardDayBonuses(tx, userId, [task.dayId]);
    await checkAndAwardBadges(tx, userId);
  }
  return tx.roadmapTask.findUniqueOrThrow({ where: { id: task.id }, include: { files: true } });
}

import type { CefrLevel, Prisma } from "@prisma/client";
import { computeDayStreak } from "../learning/activity.js";
import type { BadgeDefinition, BadgeKey } from "./badge-defaults.js";
import { BADGE_DEFAULTS, MILESTONE_DAY_OFFSETS } from "./badge-defaults.js";

type Tx = Prisma.TransactionClient;

export interface GamificationSnapshot {
  learningTimestamps: Date[];
  now: Date;
  syllabusByLevel: Record<CefrLevel, { total: number; done: number }>;
  completedMilestoneDayOffsets: number[];
  perfectDayCount: number;
  vocabCount: number;
  reviewCount: number;
}

/** Pure threshold check against a snapshot of raw counts/timestamps — same
 * "derive over raw data" recipe as computeDayStreak/computeBacklog. */
export function evaluateNewBadges(snapshot: GamificationSnapshot, alreadyUnlocked: Set<BadgeKey>): BadgeDefinition[] {
  const earned = new Set<BadgeKey>();

  const streak = computeDayStreak(snapshot.learningTimestamps, snapshot.now);
  if (streak >= 3) earned.add("streak_3");
  if (streak >= 7) earned.add("streak_7");
  if (streak >= 30) earned.add("streak_30");

  for (const level of ["a1", "a2", "b1"] as const) {
    const lv = snapshot.syllabusByLevel[level];
    if (lv.total > 0 && lv.done === lv.total) {
      earned.add(`syllabus_${level}_complete` as BadgeKey);
    }
  }

  for (const [key, offset] of Object.entries(MILESTONE_DAY_OFFSETS) as [BadgeKey, number][]) {
    if (snapshot.completedMilestoneDayOffsets.includes(offset)) earned.add(key);
  }

  if (snapshot.perfectDayCount >= 7) earned.add("perfect_days_7");
  if (snapshot.perfectDayCount >= 30) earned.add("perfect_days_30");

  if (snapshot.vocabCount >= 100) earned.add("vocab_100");
  if (snapshot.vocabCount >= 500) earned.add("vocab_500");

  if (snapshot.reviewCount >= 500) earned.add("reviews_500");

  return BADGE_DEFAULTS.filter((b) => earned.has(b.key) && !alreadyUnlocked.has(b.key));
}

/** Builds the snapshot from live data, diffs against unlocked badges, and
 * awards anything newly earned + its points, all in the given transaction. */
export async function checkAndAwardBadges(tx: Tx, userId: string): Promise<BadgeDefinition[]> {
  const now = new Date();
  const activityHorizon = new Date(now);
  activityHorizon.setDate(activityHorizon.getDate() - 366);

  const [
    syllabusRows,
    syllabusActivity,
    sourceActivity,
    testActivity,
    roadmapActivity,
    milestoneDays,
    perfectDayCount,
    vocabCount,
    reviewCount,
    existingBadges,
  ] = await Promise.all([
    tx.syllabusItem.findMany({ where: { userId }, select: { level: true, completedAt: true } }),
    tx.syllabusItem.findMany({ where: { userId, completedAt: { gte: activityHorizon } }, select: { completedAt: true } }),
    tx.studySourceLog.findMany({ where: { source: { userId }, loggedAt: { gte: activityHorizon } }, select: { loggedAt: true } }),
    tx.selfTestResult.findMany({ where: { userId, takenAt: { gte: activityHorizon } }, select: { takenAt: true } }),
    tx.roadmapTask.findMany({ where: { completedAt: { gte: activityHorizon }, day: { userId } }, select: { completedAt: true } }),
    tx.roadmapDay.findMany({
      where: { userId, dayOffset: { in: Object.values(MILESTONE_DAY_OFFSETS) } },
      select: { dayOffset: true, tasks: { select: { completedAt: true } } },
    }),
    tx.roadmapDay.count({ where: { userId, bonusAwardedAt: { not: null } } }),
    tx.word.count({ where: { userId } }),
    tx.reviewLog.count({ where: { word: { userId } } }),
    tx.userBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
  ]);

  const learningTimestamps = [
    ...syllabusActivity.map((r) => r.completedAt as Date),
    ...sourceActivity.map((r) => r.loggedAt),
    ...testActivity.map((r) => r.takenAt),
    ...roadmapActivity.map((r) => r.completedAt as Date),
  ];

  const syllabusByLevel: Record<CefrLevel, { total: number; done: number }> = {
    a1: { total: 0, done: 0 },
    a2: { total: 0, done: 0 },
    b1: { total: 0, done: 0 },
  };
  for (const r of syllabusRows) {
    syllabusByLevel[r.level].total++;
    if (r.completedAt) syllabusByLevel[r.level].done++;
  }

  const completedMilestoneDayOffsets = milestoneDays
    .filter((d) => d.tasks.length > 0 && d.tasks.every((t) => t.completedAt !== null))
    .map((d) => d.dayOffset);

  const snapshot: GamificationSnapshot = {
    learningTimestamps,
    now,
    syllabusByLevel,
    completedMilestoneDayOffsets,
    perfectDayCount,
    vocabCount,
    reviewCount,
  };

  const alreadyUnlocked = new Set(existingBadges.map((b) => b.badgeKey as BadgeKey));
  const newlyEarned = evaluateNewBadges(snapshot, alreadyUnlocked);
  if (newlyEarned.length === 0) return [];

  const totalPoints = newlyEarned.reduce((sum, b) => sum + b.points, 0);
  await Promise.all([
    tx.userBadge.createMany({ data: newlyEarned.map((b) => ({ userId, badgeKey: b.key })) }),
    tx.user.update({ where: { id: userId }, data: { points: { increment: totalPoints } } }),
  ]);
  return newlyEarned;
}

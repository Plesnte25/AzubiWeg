import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BADGE_DEFAULTS } from "../services/gamification/badge-defaults.js";
import { computeDayStreak, localDateKey } from "../services/learning/activity.js";
import { addDaysUTC, dayStatus } from "../services/learning/roadmap.js";
import { EXPIRY_WARN_DAYS, expiryStatus } from "../services/reminders.js";

function todayUtcFromLocal(): Date {
  const [y, m, d] = localDateKey(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d));
}

/** Monday of the UTC week containing `d` (Monday-aligned, matching the roadmap calendar convention). */
function mondayOf(d: Date): Date {
  const dayIdx = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDaysUTC(d, -dayIdx);
}

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/", async (req, res) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const expiryHorizon = new Date();
  expiryHorizon.setDate(expiryHorizon.getDate() + EXPIRY_WARN_DAYS + 1);

  // learning activity only matters for the streak, so a year back is plenty
  const activityHorizon = new Date();
  activityHorizon.setDate(activityHorizon.getDate() - 366);

  const todayUtc = todayUtcFromLocal();
  const weekStart = mondayOf(todayUtc);
  const weekEnd = addDaysUTC(weekStart, 7);

  const [
    totalWords,
    dueToday,
    newWords,
    reviewsToday,
    lessons,
    recentLogs,
    expiringItems,
    appsByStatus,
    syllabusRows,
    syllabusActivity,
    sourceActivity,
    testActivity,
    roadmapActivity,
    lastSelfTest,
    user,
    weekDays,
    badgeCount,
    recentBadges,
  ] = await Promise.all([
    prisma.word.count({ where: { userId: req.userId } }),
    prisma.word.count({ where: { userId: req.userId, srDue: { lte: endOfToday } } }),
    prisma.word.count({ where: { userId: req.userId, srDue: null } }),
    prisma.reviewLog.count({
      where: { word: { userId: req.userId }, reviewedAt: { gte: startOfToday } },
    }),
    prisma.word.groupBy({
      by: ["lesson"],
      where: { userId: req.userId },
      _count: true,
      orderBy: { lesson: "asc" },
    }),
    prisma.reviewLog.findMany({
      where: { word: { userId: req.userId } },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 5000,
    }),
    prisma.checklistItem.findMany({
      where: {
        userId: req.userId,
        status: { notIn: ["done", "not_applicable"] },
        expiresAt: { not: null, lte: expiryHorizon },
      },
      select: { id: true, title: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
      take: 8,
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: true,
    }),
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      select: { level: true, completedAt: true },
    }),
    prisma.syllabusItem.findMany({
      where: { userId: req.userId, completedAt: { gte: activityHorizon } },
      select: { completedAt: true },
    }),
    prisma.studySourceLog.findMany({
      where: { source: { userId: req.userId }, loggedAt: { gte: activityHorizon } },
      select: { loggedAt: true },
    }),
    prisma.selfTestResult.findMany({
      where: { userId: req.userId, takenAt: { gte: activityHorizon } },
      select: { takenAt: true },
    }),
    prisma.roadmapTask.findMany({
      where: { completedAt: { gte: activityHorizon }, day: { userId: req.userId } },
      select: { completedAt: true },
    }),
    prisma.selfTestResult.findFirst({
      where: { userId: req.userId },
      orderBy: { takenAt: "desc" },
      select: { score: true, total: true, takenAt: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { roadmapStartedAt: true, points: true } }),
    prisma.roadmapDay.findMany({
      where: { userId: req.userId, date: { gte: weekStart, lt: weekEnd } },
      select: {
        date: true,
        dayOffset: true,
        theme: true,
        tasks: { select: { completedAt: true, title: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.userBadge.count({ where: { userId: req.userId } }),
    prisma.userBadge.findMany({
      where: { userId: req.userId },
      orderBy: { unlockedAt: "desc" },
      take: 5,
      select: { badgeKey: true, unlockedAt: true },
    }),
  ]);

  // review activity per day (last 14 days) + study streak
  const reviewDays = new Set(recentLogs.map((l) => localDateKey(l.reviewedAt)));
  const activity: { date: string; count: number }[] = [];
  const counts = new Map<string, number>();
  for (const log of recentLogs) {
    const key = localDateKey(log.reviewedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    activity.push({ date: key, count: counts.get(key) ?? 0 });
  }

  let streak = 0;
  const cursor = new Date();
  if (!reviewDays.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (reviewDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // learning: per-level syllabus progress + activity streak across all hub actions
  const levels = (["a1", "a2", "b1"] as const).map((level) => {
    const inLevel = syllabusRows.filter((r) => r.level === level);
    const done = inLevel.filter((r) => r.completedAt !== null).length;
    return {
      level,
      total: inLevel.length,
      done,
      percent: inLevel.length === 0 ? 0 : Math.round((done / inLevel.length) * 100),
    };
  });
  const learningTimestamps = [
    ...syllabusActivity.map((r) => r.completedAt as Date),
    ...sourceActivity.map((r) => r.loggedAt),
    ...testActivity.map((r) => r.takenAt),
    ...roadmapActivity.map((r) => r.completedAt as Date),
  ];

  // GitHub-style heatmap: last 15 full weeks of reviews + learning activity,
  // aligned so the grid starts on a Monday and ends today
  const HEATMAP_DAYS = 7 * 15;
  const reviewCounts = new Map<string, number>();
  for (const log of recentLogs) {
    const key = localDateKey(log.reviewedAt);
    reviewCounts.set(key, (reviewCounts.get(key) ?? 0) + 1);
  }
  const learningCounts = new Map<string, number>();
  for (const ts of learningTimestamps) {
    const key = localDateKey(ts);
    learningCounts.set(key, (learningCounts.get(key) ?? 0) + 1);
  }
  const heatmap: { date: string; reviews: number; learning: number }[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    heatmap.push({
      date: key,
      reviews: reviewCounts.get(key) ?? 0,
      learning: learningCounts.get(key) ?? 0,
    });
  }

  const now = new Date();
  const applications: Record<string, number> = {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const g of appsByStatus) applications[g.status] = g._count;

  const roadmapWeekStrip = weekDays.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    dayOffset: d.dayOffset,
    status: dayStatus(d, todayUtc),
  }));
  const todayRow = weekDays.find((d) => d.date.getTime() === todayUtc.getTime());
  const roadmapToday =
    user.roadmapStartedAt && todayRow
      ? {
          theme: todayRow.theme,
          tasksDone: todayRow.tasks.filter((t) => t.completedAt !== null).length,
          tasksTotal: todayRow.tasks.length,
          nextIncompleteTitle: todayRow.tasks.find((t) => t.completedAt === null)?.title ?? null,
        }
      : null;

  const badgeLabelByKey = new Map<string, string>(BADGE_DEFAULTS.map((b) => [b.key, b.label]));

  res.json({
    totalWords,
    dueToday,
    newWords,
    reviewsToday,
    streak,
    lessons: lessons.map((l) => ({ lesson: l.lesson, count: l._count })),
    activity,
    expiringDocuments: expiringItems.map((i) => ({
      id: i.id,
      title: i.title,
      expiresAt: i.expiresAt,
      expiry: expiryStatus(i.expiresAt, now),
    })),
    applications,
    heatmap,
    learning: {
      levels,
      streak: computeDayStreak(learningTimestamps, now),
      lastSelfTest,
    },
    roadmapToday,
    roadmapWeekStrip,
    gamification: {
      points: user.points,
      badgeCount,
      recentBadges: recentBadges.map((b) => ({
        key: b.badgeKey,
        label: badgeLabelByKey.get(b.badgeKey) ?? b.badgeKey,
        unlockedAt: b.unlockedAt,
      })),
    },
  });
});

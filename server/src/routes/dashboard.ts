import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { EXPIRY_WARN_DAYS, expiryStatus } from "../services/reminders.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

dashboardRouter.get("/", async (req, res) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const expiryHorizon = new Date();
  expiryHorizon.setDate(expiryHorizon.getDate() + EXPIRY_WARN_DAYS + 1);

  const [totalWords, dueToday, newWords, reviewsToday, lessons, recentLogs, expiringItems, appsByStatus] =
    await Promise.all([
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

  const now = new Date();
  const applications: Record<string, number> = {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const g of appsByStatus) applications[g.status] = g._count;

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
  });
});

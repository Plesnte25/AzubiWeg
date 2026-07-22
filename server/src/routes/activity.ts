import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { localDateKey } from "../services/learning/activity.js";
import { totalActiveMinutes } from "../services/activity/session.js";

export const activityRouter = Router();
activityRouter.use(requireAuth);

function utcDateFromLocalKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d));
}

/** Folds any ActivityPings from before today into DailyActiveMinutes rollup
 * rows, then deletes them — pings never outlive the day they belong to. */
async function finalizePastDays(userId: string, now: Date): Promise<void> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const pastPings = await prisma.activityPing.findMany({
    where: { userId, pingedAt: { lt: startOfToday } },
  });
  if (pastPings.length === 0) return;

  const byDay = new Map<string, Date[]>();
  for (const p of pastPings) {
    const key = localDateKey(p.pingedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p.pingedAt);
  }

  await prisma.$transaction(async (tx) => {
    for (const [key, pings] of byDay) {
      const minutes = totalActiveMinutes(pings);
      const date = utcDateFromLocalKey(key);
      await tx.dailyActiveMinutes.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, minutes },
        update: { minutes },
      });
    }
    await tx.activityPing.deleteMany({ where: { userId, pingedAt: { lt: startOfToday } } });
  });
}

activityRouter.post("/ping", async (req, res) => {
  const now = new Date();
  await prisma.activityPing.create({ data: { userId: req.userId, pingedAt: now } });
  await finalizePastDays(req.userId, now);
  res.status(204).end();
});

activityRouter.get("/summary", async (req, res) => {
  const now = new Date();
  await finalizePastDays(req.userId, now);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todaysPings = await prisma.activityPing.findMany({
    where: { userId: req.userId, pingedAt: { gte: startOfToday } },
    orderBy: { pingedAt: "asc" },
  });
  const minutesToday = totalActiveMinutes(todaysPings.map((p) => p.pingedAt));

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // trailing 7-day window including today
  const sevenDaysAgoUtc = utcDateFromLocalKey(localDateKey(sevenDaysAgo));

  const history = await prisma.dailyActiveMinutes.findMany({
    where: { userId: req.userId, date: { gte: sevenDaysAgoUtc } },
    orderBy: { date: "asc" },
  });
  const minutesThisWeek = history.reduce((sum, d) => sum + d.minutes, 0) + minutesToday;

  res.json({
    minutesToday,
    minutesThisWeek,
    history: history.map((d) => ({ date: d.date.toISOString().slice(0, 10), minutes: d.minutes })),
  });
});

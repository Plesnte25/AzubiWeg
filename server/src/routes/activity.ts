import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { localDateKey } from "../services/learning/activity.js";
import { totalActiveMinutes } from "../services/activity/session.js";

export const activityRouter = Router();
activityRouter.use(requireAuth);

const DAYS_QUERY = z.coerce.number().int().min(1).max(90).default(7);

function utcDateFromLocalKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d));
}

/** Folds any ActivityPings from before today into DailyActiveMinutes AND
 * HourlyActiveMinutes rollup rows, then deletes them — pings never outlive
 * the day they belong to. The hourly rollup is the only place hour-of-day
 * history survives past today (see HourlyActiveMinutes' schema comment). */
async function finalizePastDays(userId: string, now: Date): Promise<void> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const pastPings = await prisma.activityPing.findMany({
    where: { userId, pingedAt: { lt: startOfToday } },
  });
  if (pastPings.length === 0) return;

  const byDay = new Map<string, Date[]>();
  const byDayHour = new Map<string, { date: string; hour: number; pings: Date[] }>();
  for (const p of pastPings) {
    const key = localDateKey(p.pingedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p.pingedAt);

    const hour = p.pingedAt.getHours();
    const hourKey = `${key}|${hour}`;
    if (!byDayHour.has(hourKey)) byDayHour.set(hourKey, { date: key, hour, pings: [] });
    byDayHour.get(hourKey)!.pings.push(p.pingedAt);
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
    for (const { date: key, hour, pings } of byDayHour.values()) {
      const minutes = totalActiveMinutes(pings);
      const date = utcDateFromLocalKey(key);
      await tx.hourlyActiveMinutes.upsert({
        where: { userId_date_hour: { userId, date, hour } },
        create: { userId, date, hour, minutes },
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
  const parsedDays = DAYS_QUERY.safeParse(req.query.days);
  if (!parsedDays.success) return res.status(400).json({ error: z.prettifyError(parsedDays.error) });
  const days = parsedDays.data;

  const now = new Date();
  await finalizePastDays(req.userId, now);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todaysPings = await prisma.activityPing.findMany({
    where: { userId: req.userId, pingedAt: { gte: startOfToday } },
    orderBy: { pingedAt: "asc" },
  });
  const minutesToday = totalActiveMinutes(todaysPings.map((p) => p.pingedAt));

  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (days - 1)); // trailing `days`-day window including today
  const windowStartUtc = utcDateFromLocalKey(localDateKey(windowStart));

  const history = await prisma.dailyActiveMinutes.findMany({
    where: { userId: req.userId, date: { gte: windowStartUtc } },
    orderBy: { date: "asc" },
  });
  const minutesThisWeek = history.reduce((sum, d) => sum + d.minutes, 0) + minutesToday;

  res.json({
    minutesToday,
    minutesThisWeek,
    history: history.map((d) => ({ date: d.date.toISOString().slice(0, 10), minutes: d.minutes })),
  });
});

/** All-time hour-of-day distribution (0-23, zero-filled) — the finalized
 * rollup plus today's still-live pings bucketed the same way, for freshness. */
activityRouter.get("/hourly", async (req, res) => {
  const now = new Date();
  await finalizePastDays(req.userId, now);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [rolledUp, todaysPings] = await Promise.all([
    prisma.hourlyActiveMinutes.groupBy({
      by: ["hour"],
      where: { userId: req.userId },
      _sum: { minutes: true },
    }),
    prisma.activityPing.findMany({
      where: { userId: req.userId, pingedAt: { gte: startOfToday } },
      orderBy: { pingedAt: "asc" },
    }),
  ]);

  const minutesByHour = new Array<number>(24).fill(0);
  for (const row of rolledUp) minutesByHour[row.hour]! += row._sum.minutes ?? 0;

  const todaysPingsByHour = new Map<number, Date[]>();
  for (const p of todaysPings) {
    const hour = p.pingedAt.getHours();
    if (!todaysPingsByHour.has(hour)) todaysPingsByHour.set(hour, []);
    todaysPingsByHour.get(hour)!.push(p.pingedAt);
  }
  for (const [hour, pings] of todaysPingsByHour) minutesByHour[hour]! += totalActiveMinutes(pings);

  res.json({ hours: minutesByHour.map((minutes, hour) => ({ hour, minutes })) });
});

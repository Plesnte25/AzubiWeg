import { rm } from "node:fs/promises";
import { Router } from "express";
import { z } from "zod";
import type { RoadmapSkill } from "@prisma/client";
import { prisma } from "../db.js";
import { deleteStoredFile } from "./files.js";
import { requireAuth } from "../middleware/auth.js";
import { computeBestStreak, computeDayStreak, localDateKey } from "../services/learning/activity.js";
import { setRoadmapTaskCompletion } from "../services/learning/completion-sync.js";
import { applyTimerIntent, bankTimer, startsTimer } from "../services/learning/timer.js";
import { levelProgress, levelStates } from "../services/learning/progress.js";
import { aggregateReview, goetheReadiness, masteryDistribution, masteryTrend, skillPerformance, weakAreasFromBreakdowns } from "../services/learning/review.js";
import { addDaysUTC } from "../services/learning/roadmap.js";
import { DEFAULT_ROADMAP_DAYS, ROADMAP_VERSION } from "../services/learning/roadmap-defaults.js";
import { ensureSyllabusSeeded } from "../services/learning/syllabus-seed.js";
import { appAudioDir } from "../services/vault/sync.js";
import { isStudyDay, isValidCapacity, taskEstimateMinutes } from "../services/learning/daily-plan.js";
import { planSelfPacedCleanup } from "../services/learning/self-paced.js";
import { currentByLine, forecastDates, loadQueue, topicTaskData } from "../services/learning/queue.js";
import { TOPIC_MINUTES, planTicket, queueOrder } from "../services/learning/ticket.js";
import { EXTRAS } from "../services/learning/extras.js";

export const roadmapRouter = Router();
roadmapRouter.use(requireAuth);

const toDate = (s: string) => new Date(s + "T00:00:00Z");
const todayLocal = () => toDate(localDateKey(new Date()));

const SKILL_ENUM = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading", "bureaucracy", "milestone", "reflection"]);

const journalSchema = z.object({
  learned: z.string().trim().max(3000).nullish(),
  difficult: z.string().trim().max(3000).nullish(),
  nextStep: z.string().trim().max(3000).nullish(),
});

roadmapRouter.get("/journal/day/:date", async (req, res) => {
  const parsed = z.iso.date().safeParse(req.params.date);
  if (!parsed.success) return res.status(400).json({ error: "Invalid date" });
  const journal = await prisma.dailyJournal.findUnique({
    where: { userId_date: { userId: req.userId, date: toDate(parsed.data) } },
  });
  res.json({ journal });
});

roadmapRouter.put("/journal/day/:date", async (req, res) => {
  const date = z.iso.date().safeParse(req.params.date);
  if (!date.success) return res.status(400).json({ error: "Invalid date" });
  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const journal = await prisma.dailyJournal.upsert({
    where: { userId_date: { userId: req.userId, date: toDate(date.data) } },
    create: { userId: req.userId, date: toDate(date.data), ...parsed.data },
    update: { ...parsed.data },
  });
  res.json({ journal });
});

const TASK_INCLUDE = {
  tasks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      files: true,
      // just enough to show "From syllabus: A1 > Theme" on a linked task
      syllabusItem: { select: { id: true, level: true, theme: true, description: true, sortOrder: true, masteryState: true } },
    },
  },
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Every title the old 182-day calendar generated without a syllabus link (its skeleton plus the v5 fillers) — how
 * the self-paced upgrade tells a user's own tasks from calendar content. */
const SKELETON_TITLES = new Set([
  ...DEFAULT_ROADMAP_DAYS.flatMap((d) => d.tasks.map((t) => t.title)),
  "Grammar consolidation",
  "Vocabulary review",
]);

/**
 * One-time move from the pre-generated calendar to the self-paced queue (ROADMAP_VERSION 7): keeps completed,
 * worked-on and user-added tasks as the log, deletes untouched generated ones (planSelfPacedCleanup), then drops
 * days left empty. scripts/migrate-self-paced.ts runs the same thing as a dry run / explicit apply.
 */
export async function upgradeToSelfPaced(userId: string, roadmapVersion: number): Promise<void> {
  if (roadmapVersion >= ROADMAP_VERSION) return;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({ where: { id: userId, roadmapVersion: { lt: ROADMAP_VERSION } }, data: { roadmapVersion: ROADMAP_VERSION } });
    if (claimed.count === 0) return;
    const { plan } = await selfPacedCleanupFor(tx, userId);
    await tx.roadmapTask.deleteMany({ where: { id: { in: plan.delete } } });
    await tx.roadmapDay.deleteMany({ where: { userId, tasks: { none: {} } } });
  });
}

/** What upgradeToSelfPaced would keep and delete for a user (also the migration script's dry run). */
export async function selfPacedCleanupFor(db: Tx | typeof prisma, userId: string) {
  const tasks = await db.roadmapTask.findMany({
    where: { day: { userId } },
    select: {
      id: true, title: true, syllabusItemId: true, completedAt: true, droppedAt: true, timerSeconds: true, minutesSpent: true, journalEntry: true,
      day: { select: { date: true } },
      _count: { select: { files: true, notes: true } },
    },
    orderBy: { day: { date: "asc" } },
  });
  const plan = planSelfPacedCleanup(
    tasks.map(({ _count, day: _d, ...t }) => ({ ...t, fileCount: _count.files, noteCount: _count.notes })),
    SKELETON_TITLES,
  );
  return { tasks, plan };
}

/** Whole days from the roadmap start to `date` (both @db.Date UTC midnights). */
const dayOffsetOf = (startedAt: Date, date: Date) => Math.round((date.getTime() - startedAt.getTime()) / 86_400_000);

/** The log row for a date, created on first use — days only exist once something is taken or added on them. */
async function dayFor(db: Tx | typeof prisma, userId: string, startedAt: Date, date: Date) {
  const dayOffset = dayOffsetOf(startedAt, date);
  return db.roadmapDay.upsert({
    where: { userId_dayOffset: { userId, dayOffset } },
    create: { userId, dayOffset, date },
    update: {},
  });
}

/** Serializes ticket writes per user, so two tabs refreshing Today can't take the same topic twice. */
async function lockUser(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`;
}

async function nextSortOrder(db: Tx | typeof prisma, dayId: string) {
  const max = await db.roadmapTask.aggregate({ where: { dayId }, _max: { sortOrder: true } });
  return (max._max.sortOrder ?? -1) + 1;
}

roadmapRouter.get("/status", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({
    activated: user.roadmapStartedAt !== null,
    startedAt: user.roadmapStartedAt,
    studyCapacityMinutes: user.studyCapacityMinutes,
    studyDays: user.studyDays,
    newWordsPerDay: user.newWordsPerDay,
  });
});

/** Settings → Capacity (saves immediately; any subset of the three). */
const capacitySchema = z
  .object({
    minutes: z.number().refine(isValidCapacity, "Minutes a day must be 10–180 in steps of 5").optional(),
    studyDays: z.array(z.boolean()).length(7).optional(),
    newWordsPerDay: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]).optional(),
  })
  .refine((d) => d.minutes !== undefined || d.studyDays !== undefined || d.newWordsPerDay !== undefined, { message: "Nothing to update" });

roadmapRouter.patch("/capacity", async (req, res) => {
  const parsed = capacitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { minutes, studyDays, newWordsPerDay } = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(minutes !== undefined ? { studyCapacityMinutes: minutes } : {}),
      ...(studyDays !== undefined ? { studyDays } : {}),
      ...(newWordsPerDay !== undefined ? { newWordsPerDay } : {}),
    },
  });
  res.json({ studyCapacityMinutes: user.studyCapacityMinutes, studyDays: user.studyDays, newWordsPerDay: user.newWordsPerDay });
});

const examTargetSchema = z.object({ examTargetDate: z.iso.date().nullable() });

roadmapRouter.patch("/exam-target", async (req, res) => {
  const parsed = examTargetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { examTargetDate: parsed.data.examTargetDate ? toDate(parsed.data.examTargetDate) : null },
  });
  res.json({ examTargetDate: user.examTargetDate });
});

const activateSchema = z.object({ startDate: z.iso.date().optional() });

/** Activates a user's roadmap at `startedAt`: seeds the syllabus and sets the day-0 anchor. Nothing is generated in
 * advance any more — the queue builds each day's ticket (GET /today). Idempotent no-op if already activated (unlike
 * the route, which 409s on a direct hit) — shared with scripts/seed-demo.ts. */
export async function activateRoadmapForUser(userId: string, startedAt: Date): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.roadmapStartedAt) return;
  await ensureSyllabusSeeded(userId);
  await prisma.user.update({ where: { id: userId }, data: { roadmapStartedAt: startedAt, roadmapVersion: ROADMAP_VERSION } });
}

roadmapRouter.post("/activate", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (user.roadmapStartedAt) return res.status(409).json({ error: "Roadmap already activated" });

  const startedAt = parsed.data.startDate ? toDate(parsed.data.startDate) : todayLocal();
  await activateRoadmapForUser(user.id, startedAt);
  res.status(201).json({ startedAt });
});

const resetSchema = z.object({
  keepWords: z.boolean().default(true),
  keepNotes: z.boolean().default(true),
  keepApplications: z.boolean().default(true),
});

/** Settings → Reset plan: wipes the route (every RoadmapDay/RoadmapTask and any files attached to a task), builds a
 * fresh one from today, and starts the current streak again (User.streakResetAt). Deleting RoadmapDay rows cascades to
 * RoadmapTask and then to UploadedFile in the DB, but never touches bytes on disk — those are unlinked explicitly
 * first, same as DELETE /syllabus/:id does. Syllabus completion and self-test history always stay.
 *
 * The keep flags (all true by default) can also clear words + their review history, notes, or applications. Words
 * can't be cleared while a vault is linked: they live in the user's Obsidian vault, and this won't delete vault cards. */
roadmapRouter.post("/reset", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { keepWords, keepNotes, keepApplications } = parsed.data;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!keepWords && user.vaultPath) return res.status(409).json({ error: "Words live in your Obsidian vault. Unlink it to clear them here." });

  const [days, notes] = await Promise.all([
    prisma.roadmapDay.findMany({ where: { userId: req.userId }, select: { tasks: { select: { id: true } } } }),
    keepNotes ? [] : prisma.note.findMany({ where: { userId: req.userId }, select: { id: true } }),
  ]);
  const taskIds = days.flatMap((d) => d.tasks.map((t) => t.id));
  const files = await prisma.uploadedFile.findMany({
    where: { OR: [{ roadmapTaskId: { in: taskIds } }, { noteId: { in: notes.map((n) => n.id) } }] },
    select: { storedName: true },
  });
  for (const file of files) {
    await deleteStoredFile(req.userId, file.storedName);
  }
  if (!keepWords) await rm(appAudioDir(req.userId), { recursive: true, force: true });

  // word deletion cascades to ReviewLog; notes to their UploadedFile rows; applications to their events and phrases
  const cleared = await prisma.$transaction(async (tx) => {
    await tx.roadmapDay.deleteMany({ where: { userId: req.userId } });
    const words = keepWords ? 0 : (await tx.word.deleteMany({ where: { userId: req.userId } })).count;
    const notes = keepNotes ? 0 : (await tx.note.deleteMany({ where: { userId: req.userId } })).count;
    const applications = keepApplications ? 0 : (await tx.application.deleteMany({ where: { userId: req.userId } })).count;
    await tx.user.update({ where: { id: req.userId }, data: { roadmapStartedAt: null, roadmapVersion: 0, streakResetAt: new Date() } });
    return { words, notes, applications };
  });
  const startedAt = todayLocal();
  await activateRoadmapForUser(req.userId, startedAt);
  res.json({ startedAt, cleared });
});

/** Due word reviews on the ticket: same count as the dashboard's dueToday, same estimate as the client's reviewMinutes. */
async function dueReview(userId: string) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const cards = await prisma.word.count({ where: { userId, srDue: { lte: endOfToday }, meaning: { not: null } } });
  return { cards, minutes: cards === 0 ? 0 : Math.max(1, Math.round(cards / 3)) };
}

/**
 * Today's ticket (self-paced queue, plans/self-paced-queue.md). Builds itself on every read:
 * 1. unfinished tasks from earlier days move onto today — nothing is ever overdue, it just stays on the ticket;
 * 2. open topics are taken onto today until the minutes goal is met (never on a rest day);
 * 3. `next` is what "Take another" (POST /take) would add beyond that.
 */
roadmapRouter.get("/today", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  const startedAt = user.roadmapStartedAt;
  await upgradeToSelfPaced(user.id, user.roadmapVersion);

  const today = todayLocal();
  const restDay = !isStudyDay(user.studyDays, today);
  const [review, topicReviews] = await Promise.all([
    dueReview(user.id),
    prisma.syllabusItem.findMany({
      where: { userId: user.id, reviewDueAt: { lte: new Date() }, masteryState: { not: "not_started" } },
      orderBy: { reviewDueAt: "asc" },
      take: 5,
      select: { id: true, title: true, level: true, theme: true, reviewDueAt: true },
    }),
  ]);
  // due reviews come first and count toward the goal: words at their estimate, topic reviews at a topic's 10 min
  const reviewMinutes = review.minutes + topicReviews.length * TOPIC_MINUTES;

  const { dayId, queue, next } = await prisma.$transaction(async (tx) => {
    await lockUser(tx, user.id);
    const day = await dayFor(tx, user.id, startedAt, today);
    await tx.roadmapTask.updateMany({
      where: { day: { userId: user.id, date: { lt: today } }, completedAt: null, droppedAt: null },
      data: { dayId: day.id },
    });
    const queue = await loadQueue(tx, user.id);
    const onToday = await tx.roadmapTask.findMany({ where: { dayId: day.id, droppedAt: null }, select: { type: true, syllabusItemId: true } });
    const plan = planTicket({
      open: queue.open,
      plannedMinutes: reviewMinutes + onToday.reduce((n, t) => n + taskEstimateMinutes(t.type), 0),
      goalMinutes: user.studyCapacityMinutes,
      restDay,
      hasTopicToday: onToday.some((t) => t.syllabusItemId !== null),
    });
    let sortOrder = await nextSortOrder(tx, day.id);
    for (const id of plan.autoTake) {
      await tx.roadmapTask.create({ data: { dayId: day.id, sortOrder: sortOrder++, ...topicTaskData(queue.byId.get(id)!) } });
      queue.taken.add(id);
    }
    return { dayId: day.id, queue, next: plan.next ? queue.byId.get(plan.next)! : null };
  }, { timeout: 15_000 });

  const [tasks, tasksDone] = await Promise.all([
    prisma.roadmapTask.findMany({ where: { dayId }, orderBy: { sortOrder: "asc" }, include: TASK_INCLUDE.tasks.include }),
    prisma.roadmapTask.count({ where: { day: { userId: user.id }, completedAt: { not: null } } }),
  ]);
  const live = tasks.filter((t) => !t.droppedAt);

  res.json({
    date: today,
    restDay,
    tasks,
    review,
    goal: {
      minutes: user.studyCapacityMinutes,
      plannedMinutes: reviewMinutes + live.reduce((n, t) => n + taskEstimateMinutes(t.type), 0),
      doneMinutes: live.filter((t) => t.completedAt).reduce((n, t) => n + taskEstimateMinutes(t.type), 0),
    },
    next: next ? { id: next.id, title: next.title, category: next.category, theme: next.theme } : null,
    lines: currentByLine(queue),
    activeLevel: queue.activeLevel,
    queues: { topicReviews },
    overview: { dayNumber: dayOffsetOf(startedAt, today) + 1, tasksDone },
  });
});

const takeSchema = z.object({ syllabusItemId: z.string().min(1).optional() });

/** "Take another": puts an open topic on today — the given one, or the next in queue order. */
roadmapRouter.post("/take", async (req, res) => {
  const parsed = takeSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  const startedAt = user.roadmapStartedAt;
  await upgradeToSelfPaced(user.id, user.roadmapVersion);

  const result = await prisma.$transaction(async (tx) => {
    await lockUser(tx, user.id);
    const queue = await loadQueue(tx, user.id);
    const id = parsed.data.syllabusItemId ?? queueOrder(queue.open)[0]?.id;
    if (!id) return { error: "Nothing open to take — pass a topic to open the next one" };
    if (!queue.open.some((t) => t.id === id)) {
      return { error: queue.taken.has(id) ? "That topic is already on your ticket" : "That topic isn't open yet" };
    }
    const day = await dayFor(tx, user.id, startedAt, todayLocal());
    const task = await tx.roadmapTask.create({
      data: { dayId: day.id, sortOrder: await nextSortOrder(tx, day.id), ...topicTaskData(queue.byId.get(id)!) },
      include: TASK_INCLUDE.tasks.include,
    });
    return { task };
  });
  if ("error" in result) return res.status(409).json({ error: result.error });
  res.status(201).json(result);
});

const MONTH_RE = /^\d{4}-\d{2}$/;

function monthRange(monthStr: string): { start: Date; end: Date } {
  const [year, m] = monthStr.split("-").map(Number);
  return { start: new Date(Date.UTC(year, m - 1, 1)), end: new Date(Date.UTC(year, m, 1)) };
}

/** Monday of the UTC week containing `d` (Monday-aligned, matching the calendar/heatmap convention). */
function mondayOf(d: Date): Date {
  const dayIdx = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDaysUTC(d, -dayIdx);
}

/** Plan's per-level Extras (services/learning/extras.ts) with where each stands: done (a completed task with its
 * title) or on the ticket (an open one). "Add to today" is an ordinary POST /tasks. */
roadmapRouter.get("/extras", async (req, res) => {
  const tasks = await prisma.roadmapTask.findMany({
    where: { day: { userId: req.userId }, droppedAt: null, title: { in: EXTRAS.map((e) => e.title) } },
    select: { id: true, title: true, completedAt: true },
  });
  res.json({
    extras: EXTRAS.map((e) => {
      const mine = tasks.filter((t) => t.title === e.title);
      return {
        ...e,
        doneAt: mine.find((t) => t.completedAt)?.completedAt ?? null,
        taskId: mine.find((t) => !t.completedAt)?.id ?? null,
      };
    }),
  });
});

/**
 * The Week modal: the last 7 days as they actually went (tasks finished per day, Lernzeit minutes), and what's next
 * on each line with a projected date from real pace (queue.ts forecastDates).
 */
roadmapRouter.get("/week", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  await upgradeToSelfPaced(user.id, user.roadmapVersion);

  const today = todayLocal();
  const start = addDaysUTC(today, -6);
  const [done, minutes, queue] = await Promise.all([
    prisma.roadmapTask.findMany({
      where: { day: { userId: user.id }, completedAt: { gte: start } },
      select: { id: true, title: true, skill: true, completedAt: true },
      orderBy: { completedAt: "asc" },
    }),
    prisma.dailyActiveMinutes.findMany({ where: { userId: user.id, date: { gte: start, lte: today } }, select: { date: true, minutes: true, learningMinutes: true } }),
    loadQueue(prisma, user.id),
  ]);
  const minutesByDate = new Map(minutes.map((m) => [m.date.toISOString().slice(0, 10), m.learningMinutes ?? m.minutes]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysUTC(start, i).toISOString().slice(0, 10);
    const tasks = done.filter((t) => localDateKey(t.completedAt!) === key).map(({ completedAt: _c, ...t }) => t);
    return { date: key, studyDay: isStudyDay(user.studyDays, addDaysUTC(start, i)), tasks, minutes: minutesByDate.get(key) ?? 0 };
  });

  const projected = forecastDates(queue, user, today);
  const current = currentByLine(queue);
  const upNext = current.map((c) => {
    const lineItems = queue.items
      .filter((i) => i.level === queue.activeLevel && i.category === c.line && i.masteryState !== "passed" && i.masteryState !== "mastered" && i.skippedAt === null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 3);
    return {
      line: c.line,
      topics: lineItems.map((i) => ({ id: i.id, title: i.title, theme: i.theme, taken: queue.taken.has(i.id), locked: queue.blocked.has(i.id), projectedDate: projected.get(i.id) ?? null })),
    };
  });

  res.json({
    days,
    thisWeek: { done: done.length, minutes: days.reduce((n, d) => n + d.minutes, 0), goalMinutes: user.studyCapacityMinutes * user.studyDays.filter(Boolean).length },
    upNext,
  });
});

const toggleSchema = z
  .object({
    completed: z.boolean().optional(),
    dropped: z.boolean().optional(),
    journalEntry: z.string().max(5000).nullish(),
    minutesSpent: z.int().min(0).max(1440).nullish(),
    // reschedules the task onto another day (see routes/roadmap.ts's
    // dayByOffset helper) — never edits date/dayOffset directly, only which
    // RoadmapDay owns the task, so the immutable date-from-offset invariant
    // (schema.prisma's RoadmapDay comment) is untouched.
    dayOffset: z.int().min(0).optional(),
    // Task Detail modal's running stopwatch — start/pause toggle the running
    // state, reset zeroes it, setSeconds is "Enter manually" (a correction to
    // the exact total, not an add). Quick-add pills go through setSeconds too
    // (current elapsed + delta, computed client-side) rather than a separate
    // "add" action, so there's one code path for "the total is now exactly N".
    timerAction: z.enum(["start", "pause", "reset"]).optional(),
    setSeconds: z.int().min(0).max(24 * 3600).optional(),
  })
  .refine(
    (d) =>
      d.completed !== undefined ||
      d.dropped !== undefined ||
      d.journalEntry !== undefined ||
      d.minutesSpent !== undefined ||
      d.dayOffset !== undefined ||
      d.timerAction !== undefined ||
      d.setSeconds !== undefined,
    { message: "Nothing to update" },
  );

/** A single task by id, regardless of which day it's scheduled on — used by
 * the Syllabus station accordion's "Practice" deep link
 * (push("/plan", {state:{openTaskId}})), since a syllabus-linked task can
 * live on an overdue backlog day or a future day, not just today's list
 * Plan.tsx already has loaded. Registered before PATCH /tasks/:id for
 * clarity even though Express dispatches by method, not just path. */
roadmapRouter.get("/tasks/:id", async (req, res) => {
  const task = await prisma.roadmapTask.findFirst({
    where: { id: req.params.id, day: { userId: req.userId } },
    include: { files: true, syllabusItem: { select: { level: true, theme: true, description: true } } },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

roadmapRouter.patch("/tasks/:id", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.roadmapTask.findFirst({
    where: { id: req.params.id, day: { userId: req.userId } },
    include: { syllabusItem: { select: { id: true, exerciseType: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  if (parsed.data.completed === true && existing.syllabusItem?.exerciseType) {
    const passedAttempt = await prisma.exerciseAttempt.findFirst({
      where: { userId: req.userId, syllabusItemId: existing.syllabusItem.id, passed: true },
    });
    if (!passedAttempt) return res.status(409).json({ error: "Complete and pass the exercise before marking this topic complete" });
  }

  let targetDay = null;
  if (parsed.data.dayOffset !== undefined) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { roadmapStartedAt: true } });
    if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
    targetDay = await dayFor(prisma, req.userId, user.roadmapStartedAt, addDaysUTC(user.roadmapStartedAt, parsed.data.dayOffset));
  }

  // Timer fields are folded down to a single new (seconds, runningSince) pair before touching the DB (see
  // services/learning/timer.ts). Completing a running task also stops its timer.
  const now = new Date();
  const completing = parsed.data.completed === true && !!existing.timerRunningSince;
  const timerTouched = parsed.data.setSeconds !== undefined || parsed.data.timerAction !== undefined || completing;
  const { timerSeconds, timerRunningSince } = applyTimerIntent(
    existing,
    { setSeconds: parsed.data.setSeconds, action: parsed.data.timerAction, completing },
    now,
  );
  const startsRunning = startsTimer(existing, { timerSeconds, timerRunningSince });

  const task = await prisma.$transaction(async (tx) => {
    if (startsRunning) {
      // One timer app-wide: bank whatever else this user has running before this one starts.
      const others = await tx.roadmapTask.findMany({
        where: { day: { userId: req.userId }, timerRunningSince: { not: null }, id: { not: existing.id } },
        select: { id: true, timerSeconds: true, timerRunningSince: true },
      });
      for (const other of others) {
        const banked = bankTimer(other, now);
        await tx.roadmapTask.update({
          where: { id: other.id },
          data: { ...banked, minutesSpent: Math.round(banked.timerSeconds / 60) },
        });
      }
    }
    if (parsed.data.completed !== undefined) {
      // also mirrors onto the linked SyllabusItem, if any (completion-sync.ts)
      await setRoadmapTaskCompletion(tx, req.userId, existing.id, parsed.data.completed);
    }
    const fieldUpdate = {
      ...(parsed.data.dropped !== undefined ? { droppedAt: parsed.data.dropped ? new Date() : null } : {}),
      ...(parsed.data.journalEntry !== undefined ? { journalEntry: parsed.data.journalEntry ?? null } : {}),
      ...(parsed.data.minutesSpent !== undefined
        ? { minutesSpent: parsed.data.minutesSpent ?? null }
        : timerTouched
          ? { minutesSpent: Math.round(timerSeconds / 60) }
          : {}),
      ...(timerTouched ? { timerSeconds, timerRunningSince } : {}),
      ...(targetDay ? { dayId: targetDay.id, sortOrder: 1_000_000 } : {}),
    };
    if (Object.keys(fieldUpdate).length > 0) {
      await tx.roadmapTask.update({ where: { id: existing.id }, data: fieldUpdate });
    }
    return tx.roadmapTask.findUniqueOrThrow({
      where: { id: existing.id },
      include: { files: true, syllabusItem: { select: { level: true, theme: true, description: true } } },
    });
  });
  res.json({ task });
});

// ── custom tasks (Today's "+ add", Jobs "Rehearse") — dated, unlike queue topics; unfinished ones roll onto today ──

const createTaskSchema = z.object({
  date: z.iso.date(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullish(),
  skill: SKILL_ENUM.nullish(),
});

roadmapRouter.post("/tasks", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { roadmapStartedAt: true } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  const date = toDate(parsed.data.date);
  if (date < user.roadmapStartedAt) return res.status(400).json({ error: "That date is before your roadmap started" });
  const day = await dayFor(prisma, req.userId, user.roadmapStartedAt, date);

  const task = await prisma.roadmapTask.create({
    data: {
      dayId: day.id,
      sortOrder: await nextSortOrder(prisma, day.id),
      type: "generic",
      skill: parsed.data.skill ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
    include: { files: true, syllabusItem: { select: { level: true, theme: true, description: true } } },
  });
  res.status(201).json({ task });
});

roadmapRouter.get("/journal/:skill", async (req, res) => {
  const parsed = SKILL_ENUM.safeParse(req.params.skill);
  if (!parsed.success) return res.status(400).json({ error: "Unknown skill" });

  const tasks = await prisma.roadmapTask.findMany({
    where: { skill: parsed.data, day: { userId: req.userId } },
    include: {
      day: { select: { date: true, theme: true } },
      files: true,
      syllabusItem: { select: { level: true, theme: true, description: true } },
    },
    orderBy: { day: { date: "asc" } },
  });
  res.json({ tasks });
});

/** Shared aggregation over a [start, end) date range — same recipe dashboard.ts
 * uses for its heatmap/streak (narrow Prisma selects, then pure JS math). */
async function reviewForRange(userId: string, start: Date, end: Date) {
  const [wordsAdded, reviewsCount, syllabusCompletions, roadmapTasks, selfTests] = await Promise.all([
    prisma.word.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.reviewLog.count({ where: { word: { userId }, reviewedAt: { gte: start, lt: end } } }),
    prisma.syllabusItem.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      select: { id: true, title: true },
    }),
    prisma.roadmapTask.findMany({
      where: {
        day: { userId },
        OR: [{ day: { date: { gte: start, lt: end } } }, { completedAt: { gte: start, lt: end } }],
      },
      select: { skill: true, completedAt: true, minutesSpent: true, day: { select: { date: true } } },
    }),
    prisma.selfTestResult.findMany({
      where: { userId, takenAt: { gte: start, lt: end } },
      select: { breakdown: true },
    }),
  ]);

  const selfTestBreakdowns = selfTests.flatMap((r) =>
    Array.isArray(r.breakdown) ? (r.breakdown as { topic: string; correct: number; total: number }[]) : [],
  );

  return aggregateReview({
    wordsAdded,
    reviewsCount,
    syllabusCompletions,
    roadmapTasks: roadmapTasks.map((t) => ({
      skill: t.skill,
      completedAt: t.completedAt,
      minutesSpent: t.minutesSpent,
      scheduledInRange: t.day.date >= start && t.day.date < end,
      completedInRange: t.completedAt !== null && t.completedAt >= start && t.completedAt < end,
    })),
    selfTestBreakdowns,
  });
}

const weekQuerySchema = z.object({ date: z.iso.date().optional() });

roadmapRouter.get("/review/week", async (req, res) => {
  const parsed = weekQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const anchor = parsed.data.date ? toDate(parsed.data.date) : todayLocal();
  const weekStart = mondayOf(anchor);
  const weekEndExclusive = addDaysUTC(weekStart, 7);
  const summary = await reviewForRange(req.userId, weekStart, weekEndExclusive);
  res.json({ weekStart, weekEnd: addDaysUTC(weekStart, 6), ...summary });
});

roadmapRouter.get("/review/month", async (req, res) => {
  const month = z.string().regex(MONTH_RE).safeParse(req.query.month);
  if (!month.success) return res.status(400).json({ error: "month must be YYYY-MM" });

  const { start, end } = monthRange(month.data);
  const summary = await reviewForRange(req.userId, start, end);
  res.json({ monthStart: start, monthEnd: addDaysUTC(end, -1), ...summary });
});

roadmapRouter.get("/readiness", async (req, res) => {
  const [items, recentResults] = await Promise.all([
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      select: { id: true, level: true, sortOrder: true, title: true, completedAt: true },
    }),
    prisma.selfTestResult.findMany({
      where: { userId: req.userId },
      orderBy: { takenAt: "desc" },
      take: 10,
      select: { score: true, total: true, level: true },
    }),
  ]);
  const readiness = goetheReadiness(levelProgress(items), recentResults);
  res.json(readiness);
});

// ── unified Progress destination (period selector: 7d/30d/90d/all) ──

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;
const periodSchema = z.enum(["7d", "30d", "90d", "all"]);

function dailyTotals(dailyMinutesBySkill: { date: string; minutes: number }[], start: Date, days: number): number[] {
  const byDate = new Map<string, number>();
  for (const d of dailyMinutesBySkill) byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.minutes);
  return Array.from({ length: days }, (_, i) => byDate.get(addDaysUTC(start, i).toISOString().slice(0, 10)) ?? 0);
}

roadmapRouter.get("/progress", async (req, res) => {
  const parsed = periodSchema.safeParse(req.query.period);
  const period = parsed.success ? parsed.data : "30d";

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });

  const today = todayLocal();
  const rangeEnd = addDaysUTC(today, 1); // exclusive
  const days = period === "all" ? Math.round((today.getTime() - user.roadmapStartedAt.getTime()) / 86_400_000) + 1 : PERIOD_DAYS[period];
  const rangeStart = period === "all" ? user.roadmapStartedAt : addDaysUTC(today, -(days - 1));
  const prevStart = addDaysUTC(rangeStart, -days);

  const [current, previous, currentTests, previousTests] = await Promise.all([
    reviewForRange(req.userId, rangeStart, rangeEnd),
    period === "all" ? null : reviewForRange(req.userId, prevStart, rangeStart),
    prisma.selfTestResult.findMany({ where: { userId: req.userId, takenAt: { gte: rangeStart, lt: rangeEnd } }, select: { score: true, total: true } }),
    period === "all"
      ? []
      : prisma.selfTestResult.findMany({ where: { userId: req.userId, takenAt: { gte: prevStart, lt: rangeStart } }, select: { score: true, total: true } }),
  ]);

  const avgPercent = (rows: { score: number; total: number }[]) => {
    const pcts = rows.filter((r) => r.total > 0).map((r) => (r.score / r.total) * 100);
    return pcts.length === 0 ? null : Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  };
  const testAvg = avgPercent(currentTests);
  const prevTestAvg = avgPercent(previousTests);

  // syllabus % now vs as-of-rangeStart, both scoped to the current active level
  const items = await prisma.syllabusItem.findMany({
    where: { userId: req.userId },
    select: { level: true, completedAt: true, skippedAt: true },
  });
  const levels = levelProgress(
    items.map((i, idx) => ({ id: String(idx), level: i.level, title: "", sortOrder: idx, completedAt: i.completedAt })),
  );
  const states = levelStates(levels);
  const activeIdx = states.indexOf("active");
  const activeLevel = (activeIdx === -1 ? levels[levels.length - 1] : levels[activeIdx])?.level;
  const activeItems = items.filter((i) => i.level === activeLevel && i.skippedAt === null);
  const percentAsOf = (asOf: Date) => {
    if (activeItems.length === 0) return 0;
    const done = activeItems.filter((i) => i.completedAt !== null && i.completedAt <= asOf).length;
    return Math.round((done / activeItems.length) * 100);
  };
  const syllabusPercentNow = percentAsOf(rangeEnd);
  const syllabusPercentThen = percentAsOf(rangeStart);

  // by-skill done/planned/dropped over the period (aggregateReview's bySkill
  // has done/total only — dropped needs its own pass over the same rows)
  const skillTasks = await prisma.roadmapTask.findMany({
    where: { day: { userId: req.userId, date: { gte: rangeStart, lt: rangeEnd } } },
    select: { skill: true, completedAt: true, droppedAt: true },
  });
  const bySkillMap = new Map<string, { done: number; planned: number; dropped: number }>();
  for (const t of skillTasks) {
    if (!t.skill) continue;
    const entry = bySkillMap.get(t.skill) ?? { done: 0, planned: 0, dropped: 0 };
    entry.planned += 1;
    if (t.completedAt !== null) entry.done += 1;
    if (t.droppedAt !== null) entry.dropped += 1;
    bySkillMap.set(t.skill, entry);
  }
  const bySkill = [...bySkillMap.entries()].map(([skill, v]) => ({ skill, ...v }));

  // self-test accuracy by skill, scoped to the same period — the same
  // computation dashboard.ts uses (all-time there), reused here so "weakest
  // skill" means the same thing (mastery/accuracy, not plan completion rate)
  // on both the Today screen and Stats. bySkill above (done/planned/dropped
  // roadmap tasks) is a pace metric, not a mastery one — real per-skill
  // percentages disagreed between screens because Stats used to source its
  // gauges from bySkill's completion-rate instead of this accuracy figure.
  const skillTestRows = await prisma.selfTestResult.findMany({
    where: { userId: req.userId, takenAt: { gte: rangeStart, lt: rangeEnd } },
    select: { breakdown: true },
  });
  const skillTestBreakdownEntries = skillTestRows.flatMap((r) =>
    Array.isArray(r.breakdown) ? (r.breakdown as { skill?: RoadmapSkill; correct: number; total: number }[]) : [],
  );
  const skillPerf = skillPerformance(skillTestBreakdownEntries);

  // improved-most: topics present in both periods, biggest percent gain first
  const prevWeakAreas = previous ? weakAreasFromBreakdowns(previous.weakAreas.map((w) => ({ topic: w.topic, correct: w.correct, total: w.total }))) : [];
  const prevByTopic = new Map(prevWeakAreas.map((w) => [w.topic, w.percent]));
  const improvedMost = current.weakAreas
    .filter((w) => prevByTopic.has(w.topic))
    .map((w) => ({ topic: w.topic, percent: w.percent, deltaPoints: w.percent - prevByTopic.get(w.topic)! }))
    .filter((w) => w.deltaPoints > 0)
    .sort((a, b) => b.deltaPoints - a.deltaPoints)
    .slice(0, 5);

  // streak: current + best, over the account's whole history (not
  // period-scoped) — includes review activity (reviewLogActivity) so this
  // matches dashboard.ts's consolidated streak exactly; the two used to
  // disagree because dashboard.ts's header badge was review-only while this
  // one excluded reviews entirely.
  const [syllabusActivity, sourceActivity, testActivity, roadmapActivity, reviewLogActivity] = await Promise.all([
    prisma.syllabusItem.findMany({ where: { userId: req.userId, completedAt: { not: null } }, select: { completedAt: true } }),
    prisma.studySourceLog.findMany({ where: { source: { userId: req.userId } }, select: { loggedAt: true } }),
    prisma.selfTestResult.findMany({ where: { userId: req.userId }, select: { takenAt: true } }),
    prisma.roadmapTask.findMany({ where: { day: { userId: req.userId }, completedAt: { not: null } }, select: { completedAt: true } }),
    prisma.reviewLog.findMany({ where: { word: { userId: req.userId } }, select: { reviewedAt: true } }),
  ]);
  const streakUser = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { streakResetAt: true } });
  const learningTimestamps = [
    ...syllabusActivity.map((r) => r.completedAt as Date),
    ...sourceActivity.map((r) => r.loggedAt),
    ...testActivity.map((r) => r.takenAt),
    ...roadmapActivity.map((r) => r.completedAt as Date),
    ...reviewLogActivity.map((r) => r.reviewedAt),
  ];

  // streak grid: last 28 days of real in-app time (DailyActiveMinutes), not
  // the self-reported task minutes the chart above uses
  const GRID_DAYS = 28;
  const gridStart = addDaysUTC(today, -(GRID_DAYS - 1));
  const dailyActive = await prisma.dailyActiveMinutes.findMany({
    where: { userId: req.userId, date: { gte: gridStart, lt: rangeEnd } },
  });
  const activeByDate = new Map(dailyActive.map((d) => [d.date.toISOString().slice(0, 10), d.minutes]));
  const streakGrid = Array.from({ length: GRID_DAYS }, (_, i) => {
    const date = addDaysUTC(gridStart, i).toISOString().slice(0, 10);
    return { date, minutes: activeByDate.get(date) ?? 0 };
  });

  const [readinessItems, recentResults] = await Promise.all([
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      select: { id: true, level: true, sortOrder: true, title: true, completedAt: true },
    }),
    prisma.selfTestResult.findMany({
      where: { userId: req.userId },
      orderBy: { takenAt: "desc" },
      take: 10,
      select: { score: true, total: true, level: true },
    }),
  ]);

  const [masteryItems, exerciseAttempts] = await Promise.all([
    prisma.syllabusItem.findMany({ where: { userId: req.userId }, select: { masteryState: true } }),
    // last 6 months is plenty for a weekly-bucketed trend line without
    // scanning a personal instance's entire attempt history every load
    prisma.exerciseAttempt.findMany({
      where: { userId: req.userId, createdAt: { gte: addDaysUTC(today, -182) } },
      select: { createdAt: true, passed: true },
    }),
  ]);

  res.json({
    period,
    rangeStart,
    rangeEnd: addDaysUTC(rangeEnd, -1),
    kpis: {
      tasksKept: { value: current.tasksCompleted, total: current.tasksTotal, delta: previous ? current.tasksCompleted - previous.tasksCompleted : null },
      minutes: {
        value: current.loggedMinutes,
        deltaPercent: previous && previous.loggedMinutes > 0 ? Math.round(((current.loggedMinutes - previous.loggedMinutes) / previous.loggedMinutes) * 100) : null,
      },
      testAvg: { value: testAvg, deltaPoints: testAvg !== null && prevTestAvg !== null ? testAvg - prevTestAvg : null },
      syllabusPercent: { value: syllabusPercentNow, deltaPoints: syllabusPercentNow - syllabusPercentThen },
      streak: { current: computeDayStreak(learningTimestamps, new Date(), streakUser.streakResetAt), best: computeBestStreak(learningTimestamps) },
    },
    chart: {
      labels: Array.from({ length: days }, (_, i) => addDaysUTC(rangeStart, i).toISOString().slice(0, 10)),
      current: dailyTotals(current.dailyMinutesBySkill, rangeStart, days),
      previous: previous ? dailyTotals(previous.dailyMinutesBySkill, prevStart, days) : [],
    },
    bySkill,
    skillPerformance: skillPerf,
    weakAreas: current.weakAreas.filter((w) => w.percent < 60),
    improvedMost,
    streakGrid,
    readiness: goetheReadiness(levelProgress(readinessItems), recentResults),
    masteryDistribution: masteryDistribution(masteryItems),
    masteryTrend: masteryTrend(exerciseAttempts),
    timeCoverage: { tasksCompleted: current.tasksCompleted, tasksWithLoggedTime: current.tasksWithLoggedTime },
  });
});

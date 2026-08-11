import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeBestStreak, computeDayStreak, localDateKey } from "../services/learning/activity.js";
import { setRoadmapTaskCompletion } from "../services/learning/completion-sync.js";
import { levelProgress, levelStates } from "../services/learning/progress.js";
import { aggregateReview, goetheReadiness, weakAreasFromBreakdowns } from "../services/learning/review.js";
import { computeRoadmapPace } from "../services/learning/pace.js";
import { addDaysUTC, computeBacklog, dayStatus, diffReseed } from "../services/learning/roadmap.js";
import { DEFAULT_ROADMAP_DAYS, ROADMAP_VERSION, type DefaultRoadmapDay } from "../services/learning/roadmap-defaults.js";
import { buildUserRoadmapPlan, type SyllabusRowForGeneration } from "../services/learning/roadmap-generator.js";
import { ensureSyllabusSeeded } from "../services/learning/syllabus-seed.js";

export const roadmapRouter = Router();
roadmapRouter.use(requireAuth);

const toDate = (s: string) => new Date(s + "T00:00:00Z");
const todayLocal = () => toDate(localDateKey(new Date()));

const SKILL_ENUM = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading", "bureaucracy", "milestone", "reflection"]);

const TASK_INCLUDE = {
  tasks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      files: true,
      // just enough to show "From syllabus: A1 > Theme" on a linked task
      syllabusItem: { select: { level: true, theme: true } },
    },
  },
};

/** Ensures the user's syllabus is seeded/current, then builds this user's
 * full roadmap plan (hand-authored skeleton + syllabus-derived Mon/Tue/Wed
 * tasks) — the one thing that must happen before either activating or
 * reseeding a roadmap. */
async function buildPlanForUser(userId: string): Promise<DefaultRoadmapDay[]> {
  await ensureSyllabusSeeded(userId);
  const rows: SyllabusRowForGeneration[] = await prisma.syllabusItem.findMany({
    where: { userId },
    select: { id: true, level: true, category: true, sortOrder: true, title: true, description: true, completedAt: true },
  });
  return buildUserRoadmapPlan(rows);
}

/** Reseeds a user's roadmap to ROADMAP_VERSION in place if they're behind,
 * preserving completions and re-attaching UploadedFile.roadmapTaskId onto
 * the freshly-created tasks — by syllabusItemId for linked tasks (stable,
 * survives title changes), by (dayOffset, title) for hand-authored ones. */
async function ensureCurrentVersion(userId: string, roadmapVersion: number, roadmapStartedAt: Date) {
  if (roadmapVersion >= ROADMAP_VERSION) return;
  const plan = await buildPlanForUser(userId);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.roadmapDay.findMany({
      where: { userId },
      include: { tasks: { select: { id: true, title: true, completedAt: true, droppedAt: true, syllabusItemId: true } } },
    });
    const reseedPlan = diffReseed(existing, plan);

    const keyFor = (dayOffset: number, title: string, syllabusItemId: string | null) =>
      syllabusItemId ? `s:${syllabusItemId}` : `t:${dayOffset}|${title.trim().toLowerCase()}`;

    const oldKeyByTaskId = new Map(
      existing.flatMap((d) => d.tasks.map((t) => [t.id, keyFor(d.dayOffset, t.title, t.syllabusItemId)])),
    );
    const oldTaskIds = [...oldKeyByTaskId.keys()];
    const attachedFiles = await tx.uploadedFile.findMany({
      where: { roadmapTaskId: { in: oldTaskIds } },
      select: { id: true, roadmapTaskId: true },
    });

    await tx.roadmapDay.deleteMany({ where: { userId } });

    const newIdByKey = new Map<string, string>();
    for (const day of reseedPlan) {
      const created = await tx.roadmapDay.create({
        data: {
          userId,
          dayOffset: day.dayOffset,
          date: addDaysUTC(roadmapStartedAt, day.dayOffset),
          theme: day.theme,
          tasks: { create: day.tasks },
        },
        include: { tasks: true },
      });
      for (const t of created.tasks) {
        newIdByKey.set(keyFor(day.dayOffset, t.title, t.syllabusItemId), t.id);
      }
    }

    for (const file of attachedFiles) {
      const oldKey = file.roadmapTaskId ? oldKeyByTaskId.get(file.roadmapTaskId) : undefined;
      const newId = oldKey ? newIdByKey.get(oldKey) : undefined;
      if (newId) {
        await tx.uploadedFile.update({ where: { id: file.id }, data: { roadmapTaskId: newId } });
      }
    }

    await tx.user.update({ where: { id: userId }, data: { roadmapVersion: ROADMAP_VERSION } });
  });
}

roadmapRouter.get("/status", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({ activated: user.roadmapStartedAt !== null, startedAt: user.roadmapStartedAt });
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

roadmapRouter.post("/activate", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (user.roadmapStartedAt) return res.status(409).json({ error: "Roadmap already activated" });

  const startedAt = parsed.data.startDate ? toDate(parsed.data.startDate) : todayLocal();
  // ensures the syllabus exists first, then generates this user's Mon/Tue/Wed
  // grammar/vocab tasks from it — a fresh activation may already have some of
  // those syllabus items completed, which lands as already-completed here
  const plan = await buildPlanForUser(user.id);

  await prisma.$transaction([
    ...plan.map((day) =>
      prisma.roadmapDay.create({
        data: {
          userId: user.id,
          dayOffset: day.dayOffset,
          date: addDaysUTC(startedAt, day.dayOffset),
          theme: day.theme,
          tasks: { create: day.tasks.map((t, i) => ({ sortOrder: i, ...t })) },
        },
      }),
    ),
    prisma.user.update({
      where: { id: user.id },
      data: { roadmapStartedAt: startedAt, roadmapVersion: ROADMAP_VERSION },
    }),
  ]);
  res.status(201).json({ startedAt });
});

roadmapRouter.get("/today", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  await ensureCurrentVersion(user.id, user.roadmapVersion, user.roadmapStartedAt);

  const today = todayLocal();
  const [days, todayRow] = await Promise.all([
    prisma.roadmapDay.findMany({ where: { userId: user.id }, include: TASK_INCLUDE }),
    prisma.roadmapDay.findFirst({ where: { userId: user.id, date: today }, include: TASK_INCLUDE }),
  ]);

  const allTasks = days.flatMap((d) => d.tasks);
  const tasksDone = allTasks.filter((t) => t.completedAt !== null).length;
  const currentDayOffset = Math.round((today.getTime() - user.roadmapStartedAt.getTime()) / 86_400_000);

  // Deutschland-Context ("bureaucracy") tasks stay real roadmap content —
  // they still count toward overview progress below — but the user only
  // wants paperwork-flavored to-dos surfaced on the dedicated Checklist
  // page, not mixed into Today's plan or the overdue backlog list.
  const visibleTasks = (tasks: (typeof allTasks)[number][]) => tasks.filter((t) => t.skill !== "bureaucracy");

  res.json({
    date: todayRow?.date ?? today,
    theme: todayRow?.theme ?? null,
    tasks: visibleTasks(todayRow?.tasks ?? []),
    backlog: computeBacklog(days, today)
      .map((g) => ({ ...g, tasks: visibleTasks(g.tasks) }))
      .filter((g) => g.tasks.length > 0),
    overview: {
      totalDays: DEFAULT_ROADMAP_DAYS.length,
      currentDayOffset,
      tasksDone,
      tasksTotal: allTasks.length,
      percent: allTasks.length === 0 ? 0 : Math.round((tasksDone / allTasks.length) * 100),
    },
  });
});

roadmapRouter.get("/backlog", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  await ensureCurrentVersion(user.id, user.roadmapVersion, user.roadmapStartedAt);

  const days = await prisma.roadmapDay.findMany({ where: { userId: user.id }, include: TASK_INCLUDE });
  const groups = computeBacklog(days, todayLocal());
  res.json({ groups, totalOverdueTasks: groups.reduce((n, g) => n + g.tasks.length, 0) });
});

roadmapRouter.get("/day/:date", async (req, res) => {
  const parsed = z.iso.date().safeParse(req.params.date);
  if (!parsed.success) return res.status(400).json({ error: "Invalid date" });

  const day = await prisma.roadmapDay.findFirst({
    where: { userId: req.userId, date: toDate(parsed.data) },
    include: TASK_INCLUDE,
  });
  if (!day) return res.status(404).json({ error: "No roadmap day at that date" });
  res.json({ day });
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

roadmapRouter.get("/calendar", async (req, res) => {
  const month = z.string().regex(MONTH_RE).safeParse(req.query.month);
  if (!month.success) return res.status(400).json({ error: "month must be YYYY-MM" });

  const { start: monthStart, end: monthEnd } = monthRange(month.data);

  const days = await prisma.roadmapDay.findMany({
    where: { userId: req.userId, date: { gte: monthStart, lt: monthEnd } },
    include: TASK_INCLUDE,
    orderBy: { date: "asc" },
  });
  const today = todayLocal();
  res.json({
    days: days.map((d) => ({
      date: d.date,
      dayOffset: d.dayOffset,
      theme: d.theme,
      totalTasks: d.tasks.length,
      completedTasks: d.tasks.filter((t) => t.completedAt !== null).length,
      status: dayStatus(d, today),
    })),
  });
});

// milestone weeks match roadmap-defaults.ts's buildMilestoneWeek() call sites —
// these double as "exam week" markers on the month strip / week overview
const MILESTONE_WEEKS = new Set([8, 16, 25, 26]);
const TOTAL_WEEKS = Math.ceil(DEFAULT_ROADMAP_DAYS.length / 7);

roadmapRouter.get("/week", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.roadmapStartedAt) return res.status(404).json({ error: "Roadmap not activated" });
  await ensureCurrentVersion(user.id, user.roadmapVersion, user.roadmapStartedAt);

  const weekParsed = z.coerce.number().int().min(1).max(TOTAL_WEEKS).safeParse(req.query.week);
  const today = todayLocal();
  const currentWeek = Math.floor(
    Math.round((today.getTime() - user.roadmapStartedAt.getTime()) / 86_400_000) / 7,
  ) + 1;
  const week = weekParsed.success ? weekParsed.data : Math.min(Math.max(currentWeek, 1), TOTAL_WEEKS);

  const allDays = await prisma.roadmapDay.findMany({ where: { userId: user.id }, include: TASK_INCLUDE });
  const weekStart = addDaysUTC(user.roadmapStartedAt, (week - 1) * 7);
  const weekEnd = addDaysUTC(weekStart, 6);
  const days = allDays
    .filter((d) => d.date.getTime() >= weekStart.getTime() && d.date.getTime() <= weekEnd.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((d) => ({
      date: d.date,
      dayOffset: d.dayOffset,
      theme: d.theme,
      tasks: d.tasks,
      status: dayStatus(d, today),
    }));

  const weekTasks = days.flatMap((d) => d.tasks).filter((t) => !t.droppedAt);
  const thisWeek = { done: weekTasks.filter((t) => t.completedAt !== null).length, total: weekTasks.length };

  const weeksOverview = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const wk = i + 1;
    const wStart = addDaysUTC(user.roadmapStartedAt as Date, i * 7);
    const wEnd = addDaysUTC(wStart, 6);
    const wDays = allDays.filter((d) => d.date.getTime() >= wStart.getTime() && d.date.getTime() <= wEnd.getTime());
    const wTasks = wDays.flatMap((d) => d.tasks).filter((t) => !t.droppedAt);
    return {
      week: wk,
      taskCount: wTasks.length,
      doneCount: wTasks.filter((t) => t.completedAt !== null).length,
      isCurrentWeek: wk === currentWeek,
      isExamWeek: MILESTONE_WEEKS.has(wk),
    };
  });

  const allTasks = allDays.flatMap((d) => d.tasks).filter((t) => !t.droppedAt);
  const pace = computeRoadmapPace({
    totalDays: DEFAULT_ROADMAP_DAYS.length,
    totalTasks: allTasks.length,
    tasksDone: allTasks.filter((t) => t.completedAt !== null).length,
    daysElapsed: Math.round((today.getTime() - user.roadmapStartedAt.getTime()) / 86_400_000) + 1,
  });

  const groups = computeBacklog(allDays, today);
  res.json({
    week,
    totalWeeks: TOTAL_WEEKS,
    weekStart,
    weekEnd,
    theme: days.find((d) => d.theme)?.theme ?? null,
    days,
    thisWeek,
    lateAcrossPlan: groups.reduce((n, g) => n + g.tasks.length, 0),
    pace,
    weeksOverview,
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
  })
  .refine(
    (d) =>
      d.completed !== undefined ||
      d.dropped !== undefined ||
      d.journalEntry !== undefined ||
      d.minutesSpent !== undefined ||
      d.dayOffset !== undefined,
    { message: "Nothing to update" },
  );

/** Every dayOffset in [0, DEFAULT_ROADMAP_DAYS.length) always has a materialized
 * RoadmapDay row from activation onward — reschedule/custom-add targets never
 * need to create one, only look it up. */
async function dayByOffset(userId: string, dayOffset: number) {
  return prisma.roadmapDay.findUnique({ where: { userId_dayOffset: { userId, dayOffset } } });
}

roadmapRouter.patch("/tasks/:id", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.roadmapTask.findFirst({
    where: { id: req.params.id, day: { userId: req.userId } },
  });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  let targetDay = null;
  if (parsed.data.dayOffset !== undefined) {
    targetDay = await dayByOffset(req.userId, parsed.data.dayOffset);
    if (!targetDay) return res.status(400).json({ error: "No roadmap day at that offset" });
  }

  const task = await prisma.$transaction(async (tx) => {
    if (parsed.data.completed !== undefined) {
      // also mirrors onto the linked SyllabusItem, if any (completion-sync.ts)
      await setRoadmapTaskCompletion(tx, req.userId, existing.id, parsed.data.completed);
    }
    const fieldUpdate = {
      ...(parsed.data.dropped !== undefined ? { droppedAt: parsed.data.dropped ? new Date() : null } : {}),
      ...(parsed.data.journalEntry !== undefined ? { journalEntry: parsed.data.journalEntry ?? null } : {}),
      ...(parsed.data.minutesSpent !== undefined ? { minutesSpent: parsed.data.minutesSpent ?? null } : {}),
      ...(targetDay ? { dayId: targetDay.id, sortOrder: 1_000_000 } : {}),
    };
    if (Object.keys(fieldUpdate).length > 0) {
      await tx.roadmapTask.update({ where: { id: existing.id }, data: fieldUpdate });
    }
    return tx.roadmapTask.findUniqueOrThrow({
      where: { id: existing.id },
      include: { files: true, syllabusItem: { select: { level: true, theme: true } } },
    });
  });
  res.json({ task });
});

// ── custom tasks ("+ Task" on Roadmap, and the inline "+" on a future day) ──

const createTaskSchema = z.object({
  date: z.iso.date(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullish(),
  skill: SKILL_ENUM.nullish(),
});

roadmapRouter.post("/tasks", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const day = await prisma.roadmapDay.findFirst({ where: { userId: req.userId, date: toDate(parsed.data.date) } });
  if (!day) return res.status(400).json({ error: "No roadmap day at that date" });

  const maxSort = await prisma.roadmapTask.aggregate({ where: { dayId: day.id }, _max: { sortOrder: true } });
  const task = await prisma.roadmapTask.create({
    data: {
      dayId: day.id,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      type: "generic",
      skill: parsed.data.skill ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
    include: { files: true, syllabusItem: { select: { level: true, theme: true } } },
  });
  res.status(201).json({ task });
});

// ── backlog bulk actions ──

/** Overdue tasks paired with their originating dayOffset — the "moved" list
 * both bulk endpoints return carries this so the client can offer a real
 * Undo (reschedule each task back to where it came from) without a
 * dedicated undo endpoint. */
async function overdueTasksWithOrigin(userId: string) {
  const days = await prisma.roadmapDay.findMany({ where: { userId }, include: TASK_INCLUDE });
  const groups = computeBacklog(days, todayLocal());
  const dayOffsetByDayId = new Map(days.map((d) => [d.id, d.dayOffset]));
  return groups.flatMap((g) => g.tasks.map((t) => ({ task: t, fromDayOffset: dayOffsetByDayId.get(g.dayId)! })));
}

roadmapRouter.post("/backlog/pull-into-today", async (req, res) => {
  const overdue = await overdueTasksWithOrigin(req.userId);
  const today = await prisma.roadmapDay.findFirst({ where: { userId: req.userId, date: todayLocal() } });
  if (!today) return res.status(404).json({ error: "Roadmap not activated" });

  const maxSort = await prisma.roadmapTask.aggregate({ where: { dayId: today.id }, _max: { sortOrder: true } });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;
  await prisma.$transaction(
    overdue.map(({ task }) => prisma.roadmapTask.update({ where: { id: task.id }, data: { dayId: today.id, sortOrder: nextSort++ } })),
  );
  res.json({ moved: overdue.map(({ task, fromDayOffset }) => ({ id: task.id, fromDayOffset })) });
});

const SPREAD_DAYS = 3;

roadmapRouter.post("/backlog/spread", async (req, res) => {
  const overdue = await overdueTasksWithOrigin(req.userId);
  const today = todayLocal();
  const targets = await Promise.all(
    Array.from({ length: SPREAD_DAYS }, (_, i) => prisma.roadmapDay.findFirst({ where: { userId: req.userId, date: addDaysUTC(today, i) } })),
  );
  const validTargets = targets.filter((d): d is NonNullable<typeof d> => d !== null);
  if (validTargets.length === 0) return res.status(404).json({ error: "Roadmap not activated" });

  const sortCursor = new Map<string, number>();
  await prisma.$transaction(
    overdue.map(({ task }, i) => {
      const target = validTargets[i % validTargets.length];
      const next = (sortCursor.get(target.id) ?? 1_000_000) + 1;
      sortCursor.set(target.id, next);
      return prisma.roadmapTask.update({ where: { id: task.id }, data: { dayId: target.id, sortOrder: next } });
    }),
  );
  res.json({
    moved: overdue.map(({ task, fromDayOffset }) => ({ id: task.id, fromDayOffset })),
    overDays: validTargets.length,
  });
});

roadmapRouter.get("/journal/:skill", async (req, res) => {
  const parsed = SKILL_ENUM.safeParse(req.params.skill);
  if (!parsed.success) return res.status(400).json({ error: "Unknown skill" });

  const tasks = await prisma.roadmapTask.findMany({
    where: { skill: parsed.data, day: { userId: req.userId } },
    include: {
      day: { select: { date: true, theme: true } },
      files: true,
      syllabusItem: { select: { level: true, theme: true } },
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

  // improved-most: topics present in both periods, biggest percent gain first
  const prevWeakAreas = previous ? weakAreasFromBreakdowns(previous.weakAreas.map((w) => ({ topic: w.topic, correct: w.correct, total: w.total }))) : [];
  const prevByTopic = new Map(prevWeakAreas.map((w) => [w.topic, w.percent]));
  const improvedMost = current.weakAreas
    .filter((w) => prevByTopic.has(w.topic))
    .map((w) => ({ topic: w.topic, percent: w.percent, deltaPoints: w.percent - prevByTopic.get(w.topic)! }))
    .filter((w) => w.deltaPoints > 0)
    .sort((a, b) => b.deltaPoints - a.deltaPoints)
    .slice(0, 5);

  // streak: current + best, over the account's whole history (not period-scoped)
  const [syllabusActivity, sourceActivity, testActivity, roadmapActivity] = await Promise.all([
    prisma.syllabusItem.findMany({ where: { userId: req.userId, completedAt: { not: null } }, select: { completedAt: true } }),
    prisma.studySourceLog.findMany({ where: { source: { userId: req.userId } }, select: { loggedAt: true } }),
    prisma.selfTestResult.findMany({ where: { userId: req.userId }, select: { takenAt: true } }),
    prisma.roadmapTask.findMany({ where: { day: { userId: req.userId }, completedAt: { not: null } }, select: { completedAt: true } }),
  ]);
  const learningTimestamps = [
    ...syllabusActivity.map((r) => r.completedAt as Date),
    ...sourceActivity.map((r) => r.loggedAt),
    ...testActivity.map((r) => r.takenAt),
    ...roadmapActivity.map((r) => r.completedAt as Date),
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
      streak: { current: computeDayStreak(learningTimestamps, new Date()), best: computeBestStreak(learningTimestamps) },
    },
    chart: {
      labels: Array.from({ length: days }, (_, i) => addDaysUTC(rangeStart, i).toISOString().slice(0, 10)),
      current: dailyTotals(current.dailyMinutesBySkill, rangeStart, days),
      previous: previous ? dailyTotals(previous.dailyMinutesBySkill, prevStart, days) : [],
    },
    bySkill,
    weakAreas: current.weakAreas.filter((w) => w.percent < 60),
    improvedMost,
    streakGrid,
    readiness: goetheReadiness(levelProgress(readinessItems), recentResults),
    timeCoverage: { tasksCompleted: current.tasksCompleted, tasksWithLoggedTime: current.tasksWithLoggedTime },
  });
});

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { localDateKey } from "../services/learning/activity.js";
import { setRoadmapTaskCompletion } from "../services/learning/completion-sync.js";
import { levelProgress } from "../services/learning/progress.js";
import { aggregateReview, goetheReadiness } from "../services/learning/review.js";
import { addDaysUTC, computeBacklog, dayStatus, diffReseed } from "../services/learning/roadmap.js";
import { DEFAULT_ROADMAP_DAYS, ROADMAP_VERSION, type DefaultRoadmapDay } from "../services/learning/roadmap-defaults.js";
import { buildUserRoadmapPlan, type SyllabusRowForGeneration } from "../services/learning/roadmap-generator.js";
import { ensureSyllabusSeeded } from "../services/learning/syllabus-seed.js";

export const roadmapRouter = Router();
roadmapRouter.use(requireAuth);

const toDate = (s: string) => new Date(s + "T00:00:00Z");
const todayLocal = () => toDate(localDateKey(new Date()));

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
      include: { tasks: { select: { id: true, title: true, completedAt: true, syllabusItemId: true } } },
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

  res.json({
    date: todayRow?.date ?? today,
    theme: todayRow?.theme ?? null,
    tasks: todayRow?.tasks ?? [],
    backlog: computeBacklog(days, today),
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

const toggleSchema = z
  .object({
    completed: z.boolean().optional(),
    journalEntry: z.string().max(5000).nullish(),
    minutesSpent: z.int().min(0).max(1440).nullish(),
  })
  .refine((d) => d.completed !== undefined || d.journalEntry !== undefined || d.minutesSpent !== undefined, {
    message: "Nothing to update",
  });

roadmapRouter.patch("/tasks/:id", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.roadmapTask.findFirst({
    where: { id: req.params.id, day: { userId: req.userId } },
  });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const task = await prisma.$transaction(async (tx) => {
    if (parsed.data.completed !== undefined) {
      // also mirrors onto the linked SyllabusItem, if any (completion-sync.ts)
      await setRoadmapTaskCompletion(tx, req.userId, existing.id, parsed.data.completed);
    }
    const fieldUpdate = {
      ...(parsed.data.journalEntry !== undefined ? { journalEntry: parsed.data.journalEntry ?? null } : {}),
      ...(parsed.data.minutesSpent !== undefined ? { minutesSpent: parsed.data.minutesSpent ?? null } : {}),
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

const SKILL = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading", "bureaucracy", "milestone", "reflection"]);

roadmapRouter.get("/journal/:skill", async (req, res) => {
  const parsed = SKILL.safeParse(req.params.skill);
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
      where: { day: { userId, date: { gte: start, lt: end } } },
      select: { skill: true, completedAt: true, minutesSpent: true },
    }),
    prisma.selfTestResult.findMany({
      where: { userId, takenAt: { gte: start, lt: end } },
      select: { breakdown: true },
    }),
  ]);

  const selfTestBreakdowns = selfTests.flatMap((r) =>
    Array.isArray(r.breakdown) ? (r.breakdown as { topic: string; correct: number; total: number }[]) : [],
  );

  return aggregateReview({ wordsAdded, reviewsCount, syllabusCompletions, roadmapTasks, selfTestBreakdowns });
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

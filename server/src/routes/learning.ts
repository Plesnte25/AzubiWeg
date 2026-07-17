import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { buildSession } from "../services/learning/engine.js";
import { levelProgress, levelStates, sourcePercent } from "../services/learning/progress.js";
import { QUESTION_BANK } from "../services/learning/question-bank.js";
import { DEFAULT_SYLLABUS_ITEMS, SYLLABUS_VERSION } from "../services/learning/syllabus-defaults.js";
import { extractCourseId, fetchCourse } from "../services/learning/nicosweg.js";
import { buildCourseUnits, buildManualUnits, buildPlaylistUnits, resizeManualUnits, unitProgress } from "../services/learning/units.js";
import { extractPlaylistId, fetchPlaylist } from "../services/learning/youtube.js";
import { deleteStoredFile } from "./files.js";

export const learningRouter = Router();
learningRouter.use(requireAuth);

const LEVEL = z.enum(["a1", "a2", "b1"]);
const SOURCE_TYPE = z.enum(["youtube", "nicos_weg", "duolingo", "other"]);
const DIRECTION = z.enum(["de_to_meaning", "meaning_to_de"]);

// ── syllabus ──

learningRouter.get("/syllabus", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.learningSeededAt) {
    // seed once per user; the stamp guards re-seeding (same as the checklist)
    await prisma.$transaction([
      prisma.syllabusItem.createMany({
        data: DEFAULT_SYLLABUS_ITEMS.map((item, i) => ({
          userId: user.id,
          ...item,
          sortOrder: i,
        })),
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { learningSeededAt: new Date(), syllabusVersion: SYLLABUS_VERSION },
      }),
    ]);
  } else if (user.syllabusVersion < SYLLABUS_VERSION) {
    // the authored syllabus was revised: replace the user's copy, carrying
    // completions over wherever a (level, title) still exists in the new set
    const key = (level: string, title: string) => `${level}|${title.trim().toLowerCase()}`;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.syllabusItem.findMany({
        where: { userId: user.id },
        select: { id: true, level: true, title: true, completedAt: true },
      });
      const oldKeyById = new Map(existing.map((i) => [i.id, key(i.level, i.title)]));
      const completedAt = new Map(
        existing
          .filter((i) => i.completedAt !== null)
          .map((i) => [key(i.level, i.title), i.completedAt]),
      );
      // detach note files first — deleting items would cascade them away
      const attachedFiles = await tx.uploadedFile.findMany({
        where: { userId: user.id, syllabusItemId: { not: null } },
        select: { id: true, syllabusItemId: true },
      });
      await tx.uploadedFile.updateMany({
        where: { userId: user.id, syllabusItemId: { not: null } },
        data: { syllabusItemId: null },
      });

      await tx.syllabusItem.deleteMany({ where: { userId: user.id } });
      await tx.syllabusItem.createMany({
        data: DEFAULT_SYLLABUS_ITEMS.map((item, i) => ({
          userId: user.id,
          ...item,
          sortOrder: i,
          completedAt: completedAt.get(key(item.level, item.title)) ?? null,
        })),
      });

      // re-attach notes to same-titled items in the new syllabus
      const fresh = await tx.syllabusItem.findMany({
        where: { userId: user.id },
        select: { id: true, level: true, title: true },
      });
      const newIdByKey = new Map(fresh.map((i) => [key(i.level, i.title), i.id]));
      for (const file of attachedFiles) {
        const oldKey = file.syllabusItemId ? oldKeyById.get(file.syllabusItemId) : undefined;
        const newId = oldKey ? newIdByKey.get(oldKey) : undefined;
        if (newId) {
          await tx.uploadedFile.update({ where: { id: file.id }, data: { syllabusItemId: newId } });
        }
      }

      await tx.user.update({
        where: { id: user.id },
        data: { syllabusVersion: SYLLABUS_VERSION },
      });
    });
  }

  const items = await prisma.syllabusItem.findMany({
    where: { userId: req.userId },
    include: { files: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });
  res.json({ levels: levelProgress(items), items });
});

const toggleSchema = z.object({ completed: z.boolean() });

learningRouter.patch("/syllabus/:id", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.syllabusItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Syllabus item not found" });

  const item = await prisma.syllabusItem.update({
    where: { id: existing.id },
    data: { completedAt: parsed.data.completed ? new Date() : null },
    include: { files: true },
  });
  res.json({ item });
});

// ── study sources ──

const withPercent = <T extends { completedUnits: number; totalUnits: number | null }>(s: T) => ({
  ...s,
  percent: sourcePercent(s.completedUnits, s.totalUnits),
});

const SOURCE_INCLUDE = {
  files: true,
  units: { orderBy: { position: "asc" as const } },
};

learningRouter.get("/sources", async (req, res) => {
  const sources = await prisma.studySource.findMany({
    where: { userId: req.userId },
    include: SOURCE_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  res.json({ sources: sources.map(withPercent) });
});

const createSourceSchema = z.object({
  type: SOURCE_TYPE.default("other"),
  // may be blank on create when a playlist URL is given — the scraped
  // playlist title fills it (validated after the fetch)
  title: z.string().trim().max(200).default(""),
  url: z.url().max(500).nullish(),
  level: LEVEL.nullish(),
  totalUnits: z.int().min(1).max(10000).nullish(),
  completedUnits: z.int().min(0).max(10000).optional(),
  notes: z.string().max(1000).nullish(),
  // fetch the lesson list from a YouTube playlist URL (no API key — scraped;
  // pages embed only the first ~100 videos, and scrape failure falls back to
  // the manual totalUnits path)
  autoFetch: z.boolean().default(true),
});

learningRouter.post("/sources", async (req, res) => {
  const parsed = createSourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const { totalUnits, completedUnits, autoFetch, ...rest } = parsed.data;

  let fetchOutcome: "playlist" | "course" | "manual" | "failed" = "manual";
  let units: { position: number; title: string; videoId?: string; url?: string }[] = [];
  let scrapedTitle: string | null = null;

  const playlistId = autoFetch && rest.url ? extractPlaylistId(rest.url) : null;
  const courseId = autoFetch && rest.url ? extractCourseId(rest.url) : null;
  if (playlistId) {
    const playlist = await fetchPlaylist(playlistId);
    if (playlist) {
      units = buildPlaylistUnits(playlist.videos);
      scrapedTitle = playlist.title;
      fetchOutcome = "playlist";
    } else {
      fetchOutcome = "failed";
    }
  } else if (courseId) {
    const course = await fetchCourse(courseId);
    if (course) {
      units = buildCourseUnits(course.lessons);
      scrapedTitle = course.title;
      fetchOutcome = "course";
    } else {
      fetchOutcome = "failed";
    }
  }
  if (units.length === 0 && totalUnits) units = buildManualUnits(totalUnits);

  const finalTitle = rest.title || scrapedTitle || "";
  if (!finalTitle) {
    return res.status(400).json({ error: "Title is required (or paste a playlist URL to take its title)" });
  }

  const total = units.length > 0 ? units.length : totalUnits ?? null;
  const completed = units.length > 0 ? 0 : Math.min(completedUnits ?? 0, total ?? Infinity);
  const source = await prisma.studySource.create({
    data: {
      userId: req.userId,
      ...rest,
      title: finalTitle,
      url: rest.url ?? null,
      level: rest.level ?? null,
      notes: rest.notes ?? null,
      totalUnits: total,
      completedUnits: completed,
      units: { create: units },
    },
    include: SOURCE_INCLUDE,
  });
  res.status(201).json({ source: withPercent(source), fetch: fetchOutcome });
});

const patchSourceSchema = createSourceSchema.omit({ autoFetch: true }).partial();

learningRouter.patch("/sources/:id", async (req, res) => {
  const parsed = patchSourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.studySource.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { units: true },
  });
  if (!existing) return res.status(404).json({ error: "Study source not found" });

  const data = { ...parsed.data };
  const hasUnits = existing.units.length > 0;

  // blank titles are only tolerated on create, where the playlist fills them
  if (data.title !== undefined && data.title === "") {
    return res.status(400).json({ error: "Title cannot be empty" });
  }
  if (hasUnits && data.completedUnits !== undefined) {
    return res.status(400).json({ error: "Progress is derived from the lesson checkboxes" });
  }

  if (hasUnits && data.totalUnits !== undefined && data.totalUnits !== null) {
    // resize the manual unit list; scraped playlist units resize the same way
    // (drops from the end / appends placeholders)
    const plan = resizeManualUnits(existing.units, data.totalUnits);
    const [source] = await prisma.$transaction(async (tx) => {
      if (plan.deletePositions.length > 0) {
        await tx.studySourceUnit.deleteMany({
          where: { sourceId: existing.id, position: { in: plan.deletePositions } },
        });
      }
      if (plan.create.length > 0) {
        await tx.studySourceUnit.createMany({
          data: plan.create.map((u) => ({ ...u, sourceId: existing.id })),
        });
      }
      const units = await tx.studySourceUnit.findMany({ where: { sourceId: existing.id } });
      const progress = unitProgress(units);
      const updated = await tx.studySource.update({
        where: { id: existing.id },
        data: {
          ...data,
          totalUnits: progress.total,
          completedUnits: progress.done,
        },
        include: SOURCE_INCLUDE,
      });
      return [updated];
    });
    return res.json({ source: withPercent(source) });
  }

  const total = data.totalUnits !== undefined ? data.totalUnits ?? null : existing.totalUnits;
  const completed = data.completedUnits ?? existing.completedUnits;
  const source = await prisma.studySource.update({
    where: { id: existing.id },
    data: {
      ...data,
      totalUnits: hasUnits ? existing.totalUnits : total,
      completedUnits: hasUnits
        ? existing.completedUnits
        : Math.max(0, Math.min(completed, total ?? Infinity)),
    },
    include: SOURCE_INCLUDE,
  });
  res.json({ source: withPercent(source) });
});

const unitPatchSchema = z
  .object({
    done: z.boolean().optional(),
    // per-lesson notes, edited inline in the lesson list
    notes: z.string().max(5000).nullish(),
  })
  .refine((d) => d.done !== undefined || d.notes !== undefined, {
    message: "Nothing to update",
  });

learningRouter.patch("/sources/:id/units/:unitId", async (req, res) => {
  const parsed = unitPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const unit = await prisma.studySourceUnit.findFirst({
    where: { id: req.params.unitId, source: { id: req.params.id, userId: req.userId } },
  });
  if (!unit) return res.status(404).json({ error: "Lesson not found" });

  const turningDone = parsed.data.done === true && unit.completedAt === null;
  const source = await prisma.$transaction(async (tx) => {
    await tx.studySourceUnit.update({
      where: { id: unit.id },
      data: {
        ...(parsed.data.done !== undefined
          ? { completedAt: parsed.data.done ? new Date() : null }
          : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes ?? null } : {}),
      },
    });
    const units = await tx.studySourceUnit.findMany({ where: { sourceId: unit.sourceId } });
    const progress = unitProgress(units);
    if (turningDone) {
      // finished lessons count as streak activity
      await tx.studySourceLog.create({ data: { sourceId: unit.sourceId, delta: 1 } });
    }
    return tx.studySource.update({
      where: { id: unit.sourceId },
      data: { totalUnits: progress.total, completedUnits: progress.done },
      include: SOURCE_INCLUDE,
    });
  });
  res.json({ source: withPercent(source) });
});

const progressSchema = z.object({ delta: z.int().min(-50).max(50).default(1) });

learningRouter.post("/sources/:id/progress", async (req, res) => {
  const parsed = progressSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.studySource.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { units: { select: { id: true }, take: 1 } },
  });
  if (!existing) return res.status(404).json({ error: "Study source not found" });
  if (existing.units.length > 0) {
    return res.status(400).json({ error: "This source tracks lessons — use the lesson checkboxes" });
  }

  const { delta } = parsed.data;
  const next = Math.max(
    0,
    Math.min(existing.completedUnits + delta, existing.totalUnits ?? Infinity),
  );
  const [source] = await prisma.$transaction([
    prisma.studySource.update({
      where: { id: existing.id },
      data: { completedUnits: next },
      include: SOURCE_INCLUDE,
    }),
    // only forward progress counts as streak activity
    ...(delta > 0
      ? [prisma.studySourceLog.create({ data: { sourceId: existing.id, delta } })]
      : []),
  ]);
  res.json({ source: withPercent(source) });
});

learningRouter.delete("/sources/:id", async (req, res) => {
  const source = await prisma.studySource.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { files: true },
  });
  if (!source) return res.status(404).json({ error: "Study source not found" });

  // DB rows cascade with the source; the bytes on disk don't
  for (const file of source.files) {
    await deleteStoredFile(req.userId, file.storedName);
  }
  await prisma.studySource.delete({ where: { id: source.id } });
  res.status(204).end();
});

// ── self-tests ──
// Session-engine tests: authored A1–B1 bank questions mixed with questions
// generated from the user's own vocabulary. Deliberately independent of the
// review system: nothing here writes ReviewLog, SR fields, or the vault.
// Answers ship to the client (fill-blank feedback needs them) and results are
// self-reported — same trust model as before; you can only cheat yourself.

const quizSchema = z.object({
  size: z.int().min(5).max(30).default(12),
});

const RECENT_RESULTS_FOR_EXCLUSION = 5;

learningRouter.post("/quiz", async (req, res) => {
  const parsed = quizSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const [syllabusRows, recentResults, words] = await Promise.all([
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      select: { level: true, completedAt: true },
    }),
    prisma.selfTestResult.findMany({
      where: { userId: req.userId },
      orderBy: { takenAt: "desc" },
      take: RECENT_RESULTS_FOR_EXCLUSION,
      select: { score: true, total: true, questionIds: true },
    }),
    prisma.word.findMany({
      // meaning only — IPA/grammar metadata never reaches the quiz
      where: { userId: req.userId, meaning: { not: null } },
      select: { id: true, headword: true, meaning: true, lesson: true },
    }),
  ]);

  const levels = (["a1", "a2", "b1"] as const).map((level) => {
    const inLevel = syllabusRows.filter((r) => r.level === level);
    const done = inLevel.filter((r) => r.completedAt !== null).length;
    return {
      total: inLevel.length,
      percent: inLevel.length === 0 ? 0 : Math.round((done / inLevel.length) * 100),
    };
  });
  const states = levelStates(levels);
  const activeLevel = (["a1", "a2", "b1"] as const)[Math.max(0, states.indexOf("active"))];

  const excludeIds = new Set<string>();
  for (const r of recentResults) {
    if (Array.isArray(r.questionIds)) {
      for (const id of r.questionIds) if (typeof id === "string") excludeIds.add(id);
    }
  }

  const questions = buildSession({
    bank: QUESTION_BANK,
    words: words.map((w) => ({ ...w, meaning: w.meaning as string })),
    activeLevel,
    recentPercents: recentResults.filter((r) => r.total > 0).map((r) => (r.score / r.total) * 100),
    excludeIds,
    size: parsed.data.size,
  });
  res.json({ questions, level: activeLevel });
});

learningRouter.get("/quiz/results", async (req, res) => {
  const [results, all] = await Promise.all([
    prisma.selfTestResult.findMany({
      where: { userId: req.userId },
      orderBy: { takenAt: "desc" },
      take: 20,
    }),
    prisma.selfTestResult.findMany({
      where: { userId: req.userId },
      select: { score: true, total: true },
    }),
  ]);
  const percents = all.filter((r) => r.total > 0).map((r) => (r.score / r.total) * 100);
  res.json({
    results,
    best: percents.length ? Math.round(Math.max(...percents)) : null,
    avg: percents.length
      ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
      : null,
  });
});

const resultSchema = z
  .object({
    score: z.int().min(0).max(100),
    total: z.int().min(1).max(100),
    kind: z.enum(["vocab", "mixed"]).default("mixed"),
    level: LEVEL.nullish(),
    // asked question ids, excluded from the next few sessions (capped so a
    // hostile client can't bloat the Json column)
    questionIds: z.array(z.string().max(80)).max(60).optional(),
    breakdown: z
      .array(
        z.object({
          topic: z.string().max(60),
          level: LEVEL,
          correct: z.int().min(0).max(100),
          total: z.int().min(1).max(100),
        }),
      )
      .max(30)
      .optional(),
    direction: DIRECTION.default("de_to_meaning"),
    lesson: z.string().min(1).nullish(),
  })
  .refine((r) => r.score <= r.total, { message: "score cannot exceed total" });

learningRouter.post("/quiz/results", async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const { questionIds, breakdown, ...rest } = parsed.data;
  const result = await prisma.selfTestResult.create({
    data: {
      userId: req.userId,
      ...rest,
      level: rest.level ?? null,
      lesson: rest.lesson ?? null,
      questionIds: questionIds ?? undefined,
      breakdown: breakdown ?? undefined,
    },
  });
  res.status(201).json({ result });
});

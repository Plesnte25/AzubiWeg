import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { localDateKey } from "../services/learning/activity.js";
import { setSyllabusItemCompletion } from "../services/learning/completion-sync.js";
import { buildSession } from "../services/learning/engine.js";
import { computeRoutePace } from "../services/learning/pace.js";
import { levelProgress, levelStates, sourcePercent } from "../services/learning/progress.js";
import { QUESTION_BANK } from "../services/learning/question-bank.js";
import { weakAreasFromBreakdowns } from "../services/learning/review.js";
import { ensureSyllabusSeeded } from "../services/learning/syllabus-seed.js";
import { ensureSavedLinksSeeded } from "../services/learning/saved-links-seed.js";
import { extractCourseId, fetchCourse } from "../services/learning/nicosweg.js";
import { buildCourseUnits, buildManualUnits, buildPlaylistUnits, resizeManualUnits, unitProgress } from "../services/learning/units.js";
import { extractPlaylistId, fetchPlaylist } from "../services/learning/youtube.js";
import { deleteStoredFile } from "./files.js";

export const learningRouter = Router();
learningRouter.use(requireAuth);

const LEVEL = z.enum(["a1", "a2", "b1"]);
const SOURCE_TYPE = z.enum(["youtube", "nicos_weg", "duolingo", "other"]);
const DIRECTION = z.enum(["de_to_meaning", "meaning_to_de"]);
// the 6 skills a self-test breakdown can be tagged with — a subset of the
// full RoadmapSkill enum (bureaucracy/milestone/reflection aren't quiz topics)
const CORE_SKILL = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading"]);

// ── syllabus ──

learningRouter.get("/syllabus", async (req, res) => {
  await ensureSyllabusSeeded(req.userId);

  const [items, user] = await Promise.all([
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      include: {
        files: true,
        // just enough to show "Scheduled -> Day N" when this topic is on the
        // active roadmap; a syllabus item links to at most one roadmap task
        roadmapTasks: { select: { day: { select: { dayOffset: true } } }, take: 1 },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { examTargetDate: true } }),
  ]);
  const withRoadmapDay = items.map(({ roadmapTasks, ...item }) => ({
    ...item,
    roadmapDayOffset: roadmapTasks[0]?.day.dayOffset ?? null,
  }));

  const levels = levelProgress(items);
  const states = levelStates(levels);
  const activeIdx = states.indexOf("active");
  const activeLevel = activeIdx === -1 ? levels[levels.length - 1]?.level : levels[activeIdx]?.level;

  // ROUTE PACE: remaining/recently-completed items in the active level only —
  // a skipped item doesn't count as remaining (it's off the route), but
  // doesn't count as done either
  const activeItems = items.filter((i) => i.level === activeLevel);
  const routePace = computeRoutePace({
    remainingItems: activeItems.filter((i) => i.completedAt === null && i.skippedAt === null).length,
    recentCompletions: activeItems.filter((i) => i.completedAt !== null).map((i) => i.completedAt as Date),
    examTargetDate: user.examTargetDate,
    today: new Date(),
  });

  res.json({ levels, items: withRoadmapDay, routePace });
});

// A "station" is every SyllabusItem sharing (level, theme) — derived, not a
// separate table (see schema.prisma's SyllabusItem.skippedAt comment).
// Registered before PATCH /syllabus/:id — Express matches route registration
// order, and "station" would otherwise be swallowed by :id.

const stationSchema = z.object({ level: LEVEL, theme: z.string().trim().min(1), skipped: z.boolean() });

learningRouter.patch("/syllabus/station", async (req, res) => {
  const parsed = stationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const { count } = await prisma.syllabusItem.updateMany({
    where: { userId: req.userId, level: parsed.data.level, theme: parsed.data.theme },
    data: { skippedAt: parsed.data.skipped ? new Date() : null },
  });
  if (count === 0) return res.status(404).json({ error: "No station with that theme" });
  res.json({ updated: count });
});

const toggleSchema = z
  .object({
    completed: z.boolean().optional(),
    examples: z.string().max(5000).nullish(),
    exceptions: z.string().max(5000).nullish(),
    commonMistakes: z.string().max(5000).nullish(),
  })
  .refine(
    (d) =>
      d.completed !== undefined ||
      d.examples !== undefined ||
      d.exceptions !== undefined ||
      d.commonMistakes !== undefined,
    { message: "Nothing to update" },
  );

learningRouter.patch("/syllabus/:id", async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.syllabusItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Syllabus item not found" });

  const item = await prisma.$transaction(async (tx) => {
    if (parsed.data.completed !== undefined) {
      // also mirrors onto any linked RoadmapTask (see completion-sync.ts) —
      // this item and its roadmap task(s), if any, are the same fact
      await setSyllabusItemCompletion(tx, req.userId, existing.id, parsed.data.completed);
    }
    const notesUpdate = {
      ...(parsed.data.examples !== undefined ? { examples: parsed.data.examples ?? null } : {}),
      ...(parsed.data.exceptions !== undefined ? { exceptions: parsed.data.exceptions ?? null } : {}),
      ...(parsed.data.commonMistakes !== undefined ? { commonMistakes: parsed.data.commonMistakes ?? null } : {}),
    };
    if (Object.keys(notesUpdate).length > 0) {
      await tx.syllabusItem.update({ where: { id: existing.id }, data: notesUpdate });
    }
    return tx.syllabusItem.findUniqueOrThrow({
      where: { id: existing.id },
      include: { files: true, roadmapTasks: { select: { day: { select: { dayOffset: true } } }, take: 1 } },
    });
  });
  const { roadmapTasks, ...rest } = item;
  res.json({ item: { ...rest, roadmapDayOffset: roadmapTasks[0]?.day.dayOffset ?? null } });
});

const createItemSchema = z.object({
  level: LEVEL,
  category: z.enum(["grammar", "vocab_theme", "skill"]),
  theme: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullish(),
  // for a brand-new station only — where to insert it; omitted/null = at the
  // end of the level. Ignored when `theme` matches an existing station (the
  // item just joins it at its natural end).
  afterTheme: z.string().trim().min(1).nullish(),
});

// "＋ Item" (adds to an open station) and "＋ Custom station" (a new theme
// group, optionally positioned after an existing station) are the same
// operation: create one SyllabusItem, inserted so its theme group stays
// contiguous in sortOrder — the client's grouping-by-consecutive-theme
// (Vocabulary-page-style) depends on that contiguity, not on any stored
// station id.
learningRouter.post("/syllabus/item", async (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { afterTheme, ...data } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    const sameStation = await tx.syllabusItem.findFirst({
      where: { userId: req.userId, level: data.level, theme: data.theme },
      orderBy: { sortOrder: "desc" },
    });
    const anchor =
      sameStation ??
      (afterTheme
        ? await tx.syllabusItem.findFirst({
            where: { userId: req.userId, level: data.level, theme: afterTheme },
            orderBy: { sortOrder: "desc" },
          })
        : null);
    const insertAt = anchor
      ? anchor.sortOrder + 1
      : ((await tx.syllabusItem.aggregate({ where: { userId: req.userId, level: data.level }, _max: { sortOrder: true } }))._max
          .sortOrder ?? -1) + 1;

    await tx.syllabusItem.updateMany({
      where: { userId: req.userId, level: data.level, sortOrder: { gte: insertAt } },
      data: { sortOrder: { increment: 1 } },
    });
    return tx.syllabusItem.create({
      data: { userId: req.userId, sortOrder: insertAt, ...data },
      include: { files: true, roadmapTasks: { select: { day: { select: { dayOffset: true } } }, take: 1 } },
    });
  });
  const { roadmapTasks, ...rest } = item;
  res.status(201).json({ item: { ...rest, roadmapDayOffset: roadmapTasks[0]?.day.dayOffset ?? null } });
});

const toDate = (s: string) => new Date(s + "T00:00:00Z");
const todayLocal = () => toDate(localDateKey(new Date()));

const replanSchema = z.object({ level: LEVEL });

/**
 * Compresses the remaining pace to hit the exam target: takes every
 * still-open (not completed, not skipped) SyllabusItem in the level that
 * already has a linked RoadmapTask, and re-spreads those tasks evenly across
 * the real study days (days with a non-reflection task already scheduled —
 * i.e. not Sundays) between today and the exam target date. This is the same
 * dayId-reassignment mechanism the Roadmap destination's "Spread over 3
 * days" bulk action already uses (routes/roadmap.ts), just windowed to a
 * user-chosen date instead of a fixed 3 days. Doesn't touch the generator or
 * the phase week ranges — a re-plan only moves already-generated tasks
 * earlier/later within the plan, it never invents new ones.
 */
learningRouter.post("/syllabus/replan", async (req, res) => {
  const parsed = replanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.examTargetDate) return res.status(400).json({ error: "Set an exam target date first" });
  const today = todayLocal();
  if (user.examTargetDate <= today) return res.status(400).json({ error: "Exam target date is in the past" });

  const remainingItems = await prisma.syllabusItem.findMany({
    where: { userId: req.userId, level: parsed.data.level, completedAt: null, skippedAt: null },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  const remainingIds = remainingItems.map((i) => i.id);
  if (remainingIds.length === 0) return res.json({ moved: 0, studyDays: 0 });

  const linkedTasks = await prisma.roadmapTask.findMany({
    where: { syllabusItemId: { in: remainingIds }, day: { userId: req.userId } },
    select: { id: true, syllabusItemId: true },
  });
  // preserve the syllabus's own pedagogical order, not whatever order tasks happen to come back in
  const orderById = new Map(remainingIds.map((id, i) => [id, i]));
  linkedTasks.sort((a, b) => (orderById.get(a.syllabusItemId!) ?? 0) - (orderById.get(b.syllabusItemId!) ?? 0));

  const windowDays = await prisma.roadmapDay.findMany({
    where: { userId: req.userId, date: { gte: today, lte: user.examTargetDate } },
    include: { tasks: { select: { skill: true } } },
    orderBy: { date: "asc" },
  });
  const studyDays = windowDays.filter((d) => d.tasks.some((t) => t.skill !== "reflection"));
  if (studyDays.length === 0) return res.status(400).json({ error: "No study days left before the exam target" });

  const maxSortByDay = new Map<string, number>();
  await prisma.$transaction(
    linkedTasks.map((t, i) => {
      const target = studyDays[i % studyDays.length]!;
      const next = (maxSortByDay.get(target.id) ?? 1_000_000) + 1;
      maxSortByDay.set(target.id, next);
      return prisma.roadmapTask.update({ where: { id: t.id }, data: { dayId: target.id, sortOrder: next } });
    }),
  );

  res.json({ moved: linkedTasks.length, studyDays: studyDays.length });
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

// ── activity feed ──
// StudySourceLog exists purely for the streak — it's written for BOTH a unit
// completion and a manual +1 (see PATCH /sources/:id/units/:unitId and POST
// /sources/:id/progress above). Displaying it here too would double up every
// unit completion, so the feed only reads StudySourceLog for sources that
// have no units at all (the manual, open-ended ones); unit-backed sources
// show their StudySourceUnit completions instead.

interface FeedEntry {
  id: string;
  at: Date;
  kind: "lesson" | "manual" | "link";
  sourceId: string | null;
  sourceTitle: string | null;
  title: string;
  notes: string | null;
}

// "notes" was dropped as a distinct filter value — a note is always attached
// to a lesson completion (no freestanding note entity exists), so it was a
// strict subset of "lessons" and never surfaced anything new. See the client
// SourcesPage.tsx FEED_FILTERS comment for the same reasoning.
const ACTIVITY_FILTER = z.enum(["all", "lessons", "links"]).default("all");
const FEED_PAGE_SIZE = 20;

learningRouter.get("/sources/activity", async (req, res) => {
  const filter = ACTIVITY_FILTER.safeParse(req.query.type).data ?? "all";
  const cursorParsed = z.iso.datetime().safeParse(req.query.cursor);
  const cursor = cursorParsed.success ? new Date(cursorParsed.data) : new Date();

  const wantLessons = filter === "all" || filter === "lessons";
  const wantLinks = filter === "all" || filter === "links";

  const [units, logs, links] = await Promise.all([
    wantLessons
      ? prisma.studySourceUnit.findMany({
          where: { source: { userId: req.userId }, completedAt: { lt: cursor } },
          orderBy: { completedAt: "desc" },
          take: FEED_PAGE_SIZE,
          include: { source: { select: { id: true, title: true } } },
        })
      : [],
    wantLessons
      ? prisma.studySourceLog.findMany({
          where: {
            source: { userId: req.userId, units: { none: {} } },
            loggedAt: { lt: cursor },
            delta: { gt: 0 },
          },
          orderBy: { loggedAt: "desc" },
          take: FEED_PAGE_SIZE,
          include: { source: { select: { id: true, title: true } } },
        })
      : [],
    wantLinks
      ? prisma.savedLink.findMany({
          where: { userId: req.userId, createdAt: { lt: cursor } },
          orderBy: { createdAt: "desc" },
          take: FEED_PAGE_SIZE,
        })
      : [],
  ]);

  const entries: FeedEntry[] = [
    ...units
      .filter((u) => u.completedAt !== null)
      .map((u) => ({
        id: `unit:${u.id}`,
        at: u.completedAt as Date,
        kind: "lesson" as const,
        sourceId: u.source.id,
        sourceTitle: u.source.title,
        title: u.title,
        notes: u.notes,
      })),
    ...logs.map((l) => ({
      id: `log:${l.id}`,
      at: l.loggedAt,
      kind: "manual" as const,
      sourceId: l.source.id,
      sourceTitle: l.source.title,
      title: `Logged ${l.delta} lesson${l.delta === 1 ? "" : "s"}`,
      notes: null,
    })),
    ...links.map((l) => ({
      id: `link:${l.id}`,
      at: l.createdAt,
      kind: "link" as const,
      sourceId: null,
      sourceTitle: null,
      title: `Saved: ${l.title}`,
      notes: l.note,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, FEED_PAGE_SIZE);

  const nextCursor = entries.length === FEED_PAGE_SIZE ? entries[entries.length - 1]!.at.toISOString() : null;
  res.json({ entries, nextCursor });
});

// ── saved links ──

learningRouter.get("/saved-links", async (req, res) => {
  await ensureSavedLinksSeeded(req.userId);
  const links = await prisma.savedLink.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
  res.json({ links });
});

const createLinkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.url().max(500),
  skill: CORE_SKILL.or(z.enum(["bureaucracy", "milestone"])).nullish(),
  note: z.string().trim().max(300).nullish(),
});

learningRouter.post("/saved-links", async (req, res) => {
  const parsed = createLinkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const link = await prisma.savedLink.create({
    data: { userId: req.userId, ...parsed.data, skill: parsed.data.skill ?? null, note: parsed.data.note ?? null },
  });
  res.status(201).json({ link });
});

learningRouter.delete("/saved-links/:id", async (req, res) => {
  const link = await prisma.savedLink.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!link) return res.status(404).json({ error: "Saved link not found" });
  await prisma.savedLink.delete({ where: { id: link.id } });
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
      select: { score: true, total: true, breakdown: true },
    }),
  ]);
  const percents = all.filter((r) => r.total > 0).map((r) => (r.score / r.total) * 100);
  const allBreakdowns = all.flatMap((r) =>
    Array.isArray(r.breakdown) ? (r.breakdown as { topic: string; correct: number; total: number }[]) : [],
  );
  // Self-tests entry screen's footer strip — all-time, not date-scoped like
  // Weekly/Monthly Review's weakAreas
  const weakestTopics = weakAreasFromBreakdowns(allBreakdowns).filter((w) => w.total > 0);

  res.json({
    results,
    testsTaken: all.length,
    best: percents.length ? Math.round(Math.max(...percents)) : null,
    avg: percents.length
      ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
      : null,
    weakestTopics: weakestTopics.slice(0, 2),
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
          skill: CORE_SKILL.optional(),
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

// "Add to notebook" — a self-test question has no stored link to a syllabus
// item (BankQuestion only carries a `topic` slug like "numbers-time", not a
// syllabusItemId), so this matches by word-overlap between the topic slug
// and the level's station (theme) names. Ambiguous or zero-overlap topics
// return candidates instead of guessing — the client shows a small picker.
const tokenize = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").split(" ").filter(Boolean));

const notebookSchema = z.object({
  level: LEVEL,
  topic: z.string().trim().min(1).max(60),
  questionPrompt: z.string().trim().min(1).max(500),
  explanation: z.string().trim().max(1000).nullish(),
  // set on a second call once the client's picker resolves an ambiguous match
  theme: z.string().trim().min(1).max(100).nullish(),
});

learningRouter.post("/quiz/notebook", async (req, res) => {
  const parsed = notebookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { level, topic, questionPrompt, explanation, theme } = parsed.data;

  const levelItems = await prisma.syllabusItem.findMany({
    where: { userId: req.userId, level },
    orderBy: { sortOrder: "asc" },
    select: { id: true, theme: true, completedAt: true },
  });

  let targetTheme = theme ?? null;
  if (!targetTheme) {
    const topicTokens = tokenize(topic);
    const themes = [...new Set(levelItems.map((i) => i.theme).filter((t): t is string => !!t))];
    const scored = themes
      .map((t) => ({ theme: t, score: [...topicTokens].filter((tok) => tokenize(t).has(tok)).length }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0 || (scored.length > 1 && scored[0]!.score === scored[1]!.score)) {
      return res.json({ matched: false, candidates: themes });
    }
    targetTheme = scored[0]!.theme;
  }

  const inStation = levelItems.filter((i) => i.theme === targetTheme);
  if (inStation.length === 0) return res.status(404).json({ error: "No station with that theme" });
  // the item currently being worked on — first incomplete, else the last one
  const target = inStation.find((i) => i.completedAt === null) ?? inStation[inStation.length - 1]!;

  const existing = await prisma.syllabusItem.findUniqueOrThrow({ where: { id: target.id }, select: { examples: true } });
  const entry = `[Self-test] ${questionPrompt}${explanation ? `\n${explanation}` : ""}`;
  const examples = existing.examples ? `${existing.examples}\n\n${entry}` : entry;

  const item = await prisma.syllabusItem.update({
    where: { id: target.id },
    data: { examples },
    include: { files: true, roadmapTasks: { select: { day: { select: { dayOffset: true } } }, take: 1 } },
  });
  const { roadmapTasks, ...rest } = item;
  res.json({ matched: true, item: { ...rest, roadmapDayOffset: roadmapTasks[0]?.day.dayOffset ?? null } });
});

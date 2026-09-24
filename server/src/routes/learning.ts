import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { localDateKey } from "../services/learning/activity.js";
import { setSyllabusItemCompletion } from "../services/learning/completion-sync.js";
import { buildSession } from "../services/learning/engine.js";
import { computeGoalFeasibility, computeRoutePace } from "../services/learning/pace.js";
import { levelProgress, levelStates, levelStatesWithExamGate, sourcePercent } from "../services/learning/progress.js";
import { QUESTION_BANK } from "../services/learning/question-bank.js";
import {
  EXAM_ATTEMPT_COOLDOWN_DAYS,
  EXAM_PASS_THRESHOLD,
  EXAM_TIME_LIMIT_MINUTES,
  buildExamSession,
  canAttemptExam,
  examSectionCounts,
  levelHasExamContent,
  scoreExam,
  suggestedMockDate,
} from "../services/learning/exam.js";
import { weakAreasFromBreakdowns } from "../services/learning/review.js";
import { ensureSyllabusSeeded } from "../services/learning/syllabus-seed.js";
import { failedReview, isReviewDue, nextMastery } from "../services/learning/mastery.js";
import { summarizeMistakes } from "../services/learning/mistakes.js";
import { listeningAudioFor } from "../services/learning/listening-audio.js";
import { extractCourseId, fetchCourse } from "../services/learning/nicosweg.js";
import { fetchBook } from "../services/learning/googleBooks.js";
import { fetchPodcast } from "../services/learning/itunesPodcasts.js";
import { fetchGenericPreview } from "../services/learning/genericPreview.js";
import { buildCourseUnits, buildManualUnits, buildPlaylistUnits, resizeManualUnits, unitProgress } from "../services/learning/units.js";
import { extractPlaylistId, fetchPlaylist } from "../services/learning/youtube.js";
import { deleteStoredFile } from "./files.js";
import { gradeSyllabusExercise } from "../services/learning/exercise-grading.js";
import { checkpointStations, deriveStations, isStationKey } from "../services/learning/stations.js";
import { checkpointBank } from "../services/learning/checkpoint.js";
import {
  articleAccuracy,
  pickGenderDrill,
  selfTestScores,
  type DrillAnswer,
} from "../services/learning/self-test-stats.js";
import { deriveGenus, strength } from "../services/vocab/classify.js";
import { lastGrades } from "./words.js";

export const learningRouter = Router();
learningRouter.use(requireAuth);

const LEVEL = z.enum(["a1", "a2", "b1"]);
const SOURCE_TYPE = z.enum(["youtube", "audio", "video", "book", "course", "article", "link"]);
const UNIT_LABEL = z.enum(["lessons", "episodes", "pages", "chapters", "modules"]);
const DIRECTION = z.enum(["de_to_meaning", "meaning_to_de"]);
// the 6 skills a self-test breakdown can be tagged with — a subset of the
// full RoadmapSkill enum (bureaucracy/milestone/reflection aren't quiz topics)
const CORE_SKILL = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading"]);

// ── syllabus ──

/** Per-level {hasContent, passed} for levelStatesWithExamGate() — one query,
 * shared by the /syllabus route (real lock enforcement, Phase 11 of the
 * Nocturne redesign) and activeLevelFor() below (so the exam start/status
 * routes agree with what Syllabus shows as locked, instead of a
 * syllabus-only view of "active" that could point at a level the user can't
 * actually enter yet). */
export async function examGateForUser(userId: string) {
  const passedRows = await prisma.examAttempt.findMany({ where: { userId, passed: true }, select: { level: true } });
  const passedLevels = new Set(passedRows.map((r) => r.level));
  return (["a1", "a2", "b1"] as const).map((level) =>
    levelHasExamContent(level) ? { hasContent: true as const, passed: passedLevels.has(level) } : { hasContent: false as const },
  );
}

/** Route pace for a user's current active level — shared by the Syllabus
 * route's own ROUTE PACE card and Stats' restored "projected" tile (the
 * base Nocturne handoff's own Stats mock shows a "B1 Feb / projected" tile
 * that the shipped Stats.tsx quietly dropped; this is real backing data for
 * it, not a new invention). Re-fetches syllabus items independently rather
 * than sharing the Syllabus route's own broader (files/roadmapTasks-
 * included) query — a second, minimal-select query is cheap and keeps this
 * genuinely reusable from a route that has none of that data loaded. */
async function routePaceForUser(userId: string) {
  const [items, user, examGate] = await Promise.all([
    prisma.syllabusItem.findMany({ where: { userId }, select: { level: true, completedAt: true, skippedAt: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { examTargetDate: true, studyCapacityMinutes: true } }),
    examGateForUser(userId),
  ]);
  const levels = levelProgress(items.map((i, idx) => ({ id: String(idx), level: i.level, title: "", sortOrder: idx, completedAt: i.completedAt })));
  const lockStates = levelStatesWithExamGate(levels, examGate);
  const activeIdx = lockStates.indexOf("active");
  const activeLevel = activeIdx === -1 ? levels[levels.length - 1]?.level : levels[activeIdx]?.level;
  const activeItems = items.filter((i) => i.level === activeLevel);
  const remainingItems = activeItems.filter((i) => i.completedAt === null && i.skippedAt === null).length;
  const today = new Date();
  const pace = computeRoutePace({
    remainingItems,
    recentCompletions: activeItems.filter((i) => i.completedAt !== null).map((i) => i.completedAt as Date),
    examTargetDate: user.examTargetDate,
    today,
  });
  const goalFeasibility = computeGoalFeasibility({
    remainingItems,
    examTargetDate: user.examTargetDate,
    studyCapacityMinutes: user.studyCapacityMinutes,
    today,
  });
  return { ...pace, goalFeasibility };
}

learningRouter.get("/pace", async (req, res) => {
  res.json(await routePaceForUser(req.userId));
});

learningRouter.get("/syllabus", async (req, res) => {
  await ensureSyllabusSeeded(req.userId);

  const [items, examGate] = await Promise.all([
    prisma.syllabusItem.findMany({
      where: { userId: req.userId },
      include: {
        files: true,
        // just enough to show "Scheduled -> Day N" when this topic is on the
        // active roadmap, and to let the Syllabus station accordion's
        // "Practice" action jump straight to that task's Task Detail modal
        // (push("/plan", {state:{openTaskId}})) — a syllabus item links to
        // at most one roadmap task
        roadmapTasks: { select: { id: true, day: { select: { dayOffset: true } } }, take: 1 },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
    examGateForUser(req.userId),
  ]);
  const withRoadmapDay = items.map(({ roadmapTasks, ...item }) => ({
    ...item,
    reviewDue: isReviewDue(item.masteryState, item.reviewDueAt),
    roadmapDayOffset: roadmapTasks[0]?.day.dayOffset ?? null,
    roadmapTaskId: roadmapTasks[0]?.id ?? null,
  }));

  const levels = levelProgress(items);
  const lockStates = levelStatesWithExamGate(levels, examGate);
  // route pace still keys off the syllabus-only "active" level (matches
  // /exam/status's activeLevelFor(), which now also folds in the exam
  // gate) -- a level that's syllabus-100%-but-exam-gated is "active" under
  // both, so this stays correct. Shared with GET /pace (Stats' "projected"
  // tile) via routePaceForUser() — a second, minimal-select query, not
  // reusing `items`/`user`/`examGate` above (see that function's own
  // comment for why).
  const routePace = await routePaceForUser(req.userId);

  res.json({ levels, items: withRoadmapDay, routePace, lockStates, examGate });
});

const exerciseSubmissionSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  rubricAssessment: z.object({
    taskFulfilled: z.boolean(),
    grammarChecked: z.boolean(),
    understandable: z.boolean(),
  }).nullish(),
  mistakeCategory: z.enum([
    "gender_article", "case", "word_order", "conjugation", "vocabulary",
    "spelling", "pronunciation", "listening_detail", "collocation", "other",
  ]).nullish(),
});

learningRouter.get("/syllabus/:id/workspace", async (req, res) => {
  const item = await prisma.syllabusItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      files: true,
      exerciseAttempts: { orderBy: { createdAt: "desc" }, take: 5 },
      notes: { include: { files: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!item) return res.status(404).json({ error: "Syllabus item not found" });
  res.json({ item: { ...item, reviewDue: isReviewDue(item.masteryState, item.reviewDueAt) } });
});

learningRouter.get("/syllabus/:id/audio", async (req, res) => {
  const item = await prisma.syllabusItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
    select: { skill: true, resourceTranscript: true },
  });
  if (!item) return res.status(404).json({ error: "Syllabus item not found" });
  if (item.skill !== "listening" || !item.resourceTranscript) {
    return res.status(404).json({ error: "No generated audio is available for this lesson" });
  }

  const audioPath = await listeningAudioFor(item.resourceTranscript);
  if (!audioPath) return res.status(503).json({ error: "The lesson recording could not be generated. Please try again shortly." });
  res.type("audio/mpeg").setHeader("Cache-Control", "private, max-age=31536000, immutable").sendFile(audioPath);
});

learningRouter.post("/syllabus/:id/exercise", async (req, res) => {
  const parsed = exerciseSubmissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const item = await prisma.syllabusItem.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!item) return res.status(404).json({ error: "Syllabus item not found" });
  if (!item.exerciseType || !item.exercisePrompt) return res.status(400).json({ error: "This topic has no exercise yet" });

  const answer = parsed.data.answer;
  const options = item.exerciseOptions as { options?: unknown[]; correctIndex?: unknown } | null;
  const audioEvidence = item.exerciseType === "listening_audio" || item.exerciseType === "speaking_audio"
    ? await prisma.uploadedFile.findFirst({
      where: { userId: req.userId, syllabusItemId: item.id, kind: "audio_recording" },
      orderBy: { createdAt: "desc" },
      select: { id: true, durationSeconds: true },
    })
    : null;
  const rubric = parsed.data.rubricAssessment;
  const { passed, feedback } = gradeSyllabusExercise({
    exerciseType: item.exerciseType,
    skill: item.skill,
    exerciseAnswer: item.exerciseAnswer,
    exerciseOptions: options,
    answer,
    rubricAssessment: rubric,
    audioEvidence: audioEvidence !== null,
    recordingDurationSeconds: audioEvidence?.durationSeconds ?? null,
  });

  const attempt = await prisma.$transaction(async (tx) => {
    const lastSuccessfulAttempt = await tx.exerciseAttempt.findFirst({
      where: { syllabusItemId: item.id, passed: true },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const recentFailures = await tx.exerciseAttempt.count({
      where: {
        syllabusItemId: item.id,
        passed: false,
        createdAt: {
          gt: lastSuccessfulAttempt?.createdAt ?? new Date(Date.now() - 30 * 86_400_000),
        },
      },
    });
    const created = await tx.exerciseAttempt.create({
      data: {
        userId: req.userId,
        syllabusItemId: item.id,
        answer,
        passed,
        feedback,
        mistakeCategory: passed ? null : parsed.data.mistakeCategory ?? null,
        rubricAssessment: rubric ?? Prisma.JsonNull,
      },
    });
    if (passed) {
      const mastery = nextMastery(item.successfulAttempts, recentFailures);
      await tx.syllabusItem.update({
        where: { id: item.id },
        data: {
          masteryState: mastery.masteryState,
          reviewDueAt: mastery.reviewDueAt,
          successfulAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
      await setSyllabusItemCompletion(tx, req.userId, item.id, true);
    } else {
      await tx.syllabusItem.update({
        where: { id: item.id },
        data: { masteryState: "learning", reviewDueAt: failedReview(), lastAttemptAt: new Date() },
      });
    }
    return created;
  });

  res.json({ passed, feedback, attempt });
});

learningRouter.get("/syllabus/mistakes", async (req, res) => {
  const attempts = await prisma.exerciseAttempt.findMany({
    where: { userId: req.userId, passed: false, mistakeCategory: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { mistakeCategory: true, syllabusItemId: true, syllabusItem: { select: { title: true, level: true } } },
  });
  res.json({ mistakes: summarizeMistakes(attempts) });
});

// A "station" is every SyllabusItem sharing (level, theme) — derived, not a
// separate table (see schema.prisma's SyllabusItem.skippedAt comment).
// Registered before PATCH /syllabus/:id — Express matches route registration
// order, and "station" would otherwise be swallowed by :id.

/** All notes across every item in one station — the Syllabus desktop
 * accordion's 3rd column needs this joined view (`Note.syllabusItemId` only
 * links to a single item), so one query here beats N per-item calls for a
 * typically-small (3-8 item) station. */
learningRouter.get("/syllabus/stations/:level/:theme/notes", async (req, res) => {
  const level = LEVEL.safeParse(req.params.level);
  if (!level.success) return res.status(400).json({ error: "Invalid level" });

  const items = await prisma.syllabusItem.findMany({
    where: { userId: req.userId, level: level.data, theme: req.params.theme },
    select: { id: true },
  });
  if (items.length === 0) return res.status(404).json({ error: "No station with that theme" });

  const notes = await prisma.note.findMany({
    where: { syllabusItemId: { in: items.map((i) => i.id) } },
    include: { files: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ notes });
});

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
  if (parsed.data.completed === true && existing.exerciseType) {
    const passedAttempt = await prisma.exerciseAttempt.findFirst({
      where: { userId: req.userId, syllabusItemId: existing.id, passed: true },
    });
    if (!passedAttempt) return res.status(409).json({ error: "Complete and pass the exercise before marking this topic complete" });
  }

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

// A linked RoadmapTask (if any) is detached, not deleted — schema.prisma's
// onDelete: SetNull on that relation already handles it; the task itself
// survives, same as an ordinary reseed/replan already does today.
learningRouter.delete("/syllabus/:id", async (req, res) => {
  const item = await prisma.syllabusItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { files: true },
  });
  if (!item) return res.status(404).json({ error: "Syllabus item not found" });

  for (const file of item.files) {
    await deleteStoredFile(req.userId, file.storedName);
  }
  await prisma.syllabusItem.delete({ where: { id: item.id } });
  res.status(204).end();
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

/** Deletes an UploadedFile's bytes + row outright — used when a cover image
 * is replaced or cleared, so the old one doesn't linger unreferenced. */
async function deleteUploadedFile(userId: string, fileId: string): Promise<void> {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId } });
  if (!file) return;
  await deleteStoredFile(userId, file.storedName);
  await prisma.uploadedFile.delete({ where: { id: file.id } });
}

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

const STATION_KEY = z.string().refine(isStationKey, "Invalid station key (expected level:theme)");

const createSourceSchema = z.object({
  type: SOURCE_TYPE.default("link"),
  // may be blank on create when a playlist/course URL or a book/podcast
  // title-search is given and matches — the fetched title fills it
  // (validated after the fetch)
  title: z.string().trim().max(200).default(""),
  url: z.url().max(500).nullish(),
  // free-text provider/author/channel — filled by whichever engine matched,
  // or typed manually; always overridable by the user regardless of source
  provider: z.string().trim().max(120).nullish(),
  level: LEVEL.nullish(),
  totalUnits: z.int().min(1).max(10000).nullish(),
  completedUnits: z.int().min(0).max(10000).optional(),
  unitLabel: UNIT_LABEL.default("lessons"),
  notes: z.string().max(1000).nullish(),
  // Plan journey station this source fuels ("level:theme"); Add-source's "Fuel for station" picker
  stationKey: STATION_KEY.nullish(),
  // per-type real fetch engine (no API key needed for any of them): a
  // YouTube playlist URL scrapes its video list; a Nicos Weg course URL
  // fetches its real lesson list via DW's own GraphQL endpoint; a book/
  // podcast searches Google Books/iTunes by the given title; a video/
  // article/link URL scrapes its OpenGraph title+image. Any failure falls
  // back to the manual totalUnits path — never a hard error.
  autoFetch: z.boolean().default(true),
});

type FetchOutcome = "playlist" | "course" | "book" | "podcast" | "preview" | "manual" | "failed";

learningRouter.post("/sources", async (req, res) => {
  const parsed = createSourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const { totalUnits, completedUnits, autoFetch, ...rest } = parsed.data;

  let fetchOutcome: FetchOutcome = "manual";
  let units: { position: number; title: string; videoId?: string; url?: string }[] = [];
  let scrapedTitle: string | null = null;
  let scrapedProvider: string | null = null;
  let scrapedCoverUrl: string | null = null;
  let scrapedTotalUnits: number | null = null;

  // The Add-source type picker only shows 6 buttons (Video/Audio/Book/
  // Course/Article/Link, per the literal design mock) — YouTube isn't one
  // of them, even though it's a first-class type end-to-end elsewhere
  // (filter chips, cards, its own real fetch engine). Picking "Video" and
  // pasting a YouTube URL silently upgrades the saved type to "youtube"
  // here, rather than adding a 7th picker button just for it.
  const playlistId = autoFetch && (rest.type === "youtube" || rest.type === "video") && rest.url ? extractPlaylistId(rest.url) : null;
  const courseId = autoFetch && rest.type === "course" && rest.url ? extractCourseId(rest.url) : null;

  if (playlistId) {
    const playlist = await fetchPlaylist(playlistId);
    if (playlist) {
      units = buildPlaylistUnits(playlist.videos);
      scrapedTitle = playlist.title;
      rest.type = "youtube";
      fetchOutcome = "playlist";
    } else {
      fetchOutcome = "failed";
    }
  } else if (courseId) {
    const course = await fetchCourse(courseId);
    if (course) {
      units = buildCourseUnits(course.lessons);
      scrapedTitle = course.title;
      scrapedProvider = "DW"; // Deutsche Welle, the real org behind Nicos Weg
      fetchOutcome = "course";
    } else {
      fetchOutcome = "failed";
    }
  } else if (autoFetch && rest.type === "book" && rest.title) {
    const book = await fetchBook(rest.title);
    if (book) {
      scrapedProvider = book.authors.length > 0 ? book.authors.join(", ") : null;
      scrapedCoverUrl = book.thumbnailUrl;
      scrapedTotalUnits = book.pageCount;
      fetchOutcome = "book";
    } else {
      fetchOutcome = "failed";
    }
  } else if (autoFetch && rest.type === "audio" && rest.title) {
    const podcast = await fetchPodcast(rest.title);
    if (podcast) {
      scrapedTitle = podcast.trackName;
      scrapedProvider = podcast.artistName;
      scrapedCoverUrl = podcast.artworkUrl;
      scrapedTotalUnits = podcast.trackCount;
      fetchOutcome = "podcast";
    } else {
      fetchOutcome = "failed";
    }
  } else if (autoFetch && (rest.type === "video" || rest.type === "article" || rest.type === "link") && rest.url) {
    const preview = await fetchGenericPreview(rest.url);
    if (preview) {
      scrapedTitle = preview.title;
      scrapedProvider = preview.siteName;
      scrapedCoverUrl = rest.type !== "link" ? preview.imageUrl : null; // link cards render lighter, no thumbnail
      fetchOutcome = "preview";
    } else {
      fetchOutcome = "failed";
    }
  }
  if (units.length === 0 && totalUnits) units = buildManualUnits(totalUnits);

  const finalTitle = rest.title || scrapedTitle || "";
  if (!finalTitle) {
    return res.status(400).json({ error: "Title is required (or paste/search a URL or title that matches something real)" });
  }

  const total = units.length > 0 ? units.length : (totalUnits ?? scrapedTotalUnits ?? null);
  const completed = units.length > 0 ? 0 : Math.min(completedUnits ?? 0, total ?? Infinity);
  const source = await prisma.studySource.create({
    data: {
      userId: req.userId,
      ...rest,
      title: finalTitle,
      url: rest.url ?? null,
      provider: rest.provider ?? scrapedProvider,
      coverImageUrl: scrapedCoverUrl,
      level: rest.level ?? null,
      notes: rest.notes ?? null,
      stationKey: rest.stationKey ?? null,
      totalUnits: total,
      completedUnits: completed,
      units: { create: units },
    },
    include: SOURCE_INCLUDE,
  });
  res.status(201).json({ source: withPercent(source), fetch: fetchOutcome });
});

// Deliberately NOT createSourceSchema.omit({autoFetch:true}).partial():
// several create fields (type/title/unitLabel) carry a `.default(...)` for
// create semantics, and Zod's `.partial()` still applies a field's default
// when the key is simply absent from the input — so a real partial update
// that only touches, say, coverFileId would have silently reset type back
// to "link" and title to "" on every save. Every field here is genuinely
// optional with no default, so an omitted key means "leave it alone."
const patchSourceSchema = z.object({
  type: SOURCE_TYPE.optional(),
  title: z.string().trim().max(200).optional(),
  url: z.url().max(500).nullish(),
  provider: z.string().trim().max(120).nullish(),
  level: LEVEL.nullish(),
  totalUnits: z.int().min(1).max(10000).nullish(),
  completedUnits: z.int().min(0).max(10000).optional(),
  unitLabel: UNIT_LABEL.optional(),
  notes: z.string().max(1000).nullish(),
  stationKey: STATION_KEY.nullish(),
  // set via a two-step flow: upload the image (kind: "source_cover",
  // studySourceId: this id) via the existing generic file-upload route,
  // then PATCH here with the new file's id. null clears the cover.
  coverFileId: z.string().nullish(),
});

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

  if (data.coverFileId !== undefined && data.coverFileId !== null) {
    const file = await prisma.uploadedFile.findFirst({ where: { id: data.coverFileId, userId: req.userId } });
    if (!file) return res.status(404).json({ error: "Cover image file not found" });
  }
  // an old cover being replaced (or cleared) is deleted outright rather than
  // left orphaned — it's never shown anywhere once it stops being the cover
  const oldCoverFileId =
    data.coverFileId !== undefined && existing.coverFileId && existing.coverFileId !== data.coverFileId
      ? existing.coverFileId
      : null;

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
    if (oldCoverFileId) await deleteUploadedFile(req.userId, oldCoverFileId);
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
  if (oldCoverFileId) await deleteUploadedFile(req.userId, oldCoverFileId);
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
//
// Milestones only (turn 10a) — no more per-link "Saved: X" spam, since
// links are now ordinary StudySource rows added one at a time through the
// normal Add-source flow (the old spam came from seeding 16 SavedLink rows
// at once, a concept that no longer exists). No filter-chip dimension
// either — the redesigned panel is just "Recent activity" + "View all",
// not the old all/lessons/links tab row.

interface FeedEntry {
  id: string;
  at: Date;
  kind: "lesson" | "manual" | "added" | "completed";
  sourceId: string | null;
  sourceTitle: string | null;
  title: string;
  notes: string | null;
}

const FEED_PAGE_SIZE = 20;

learningRouter.get("/sources/activity", async (req, res) => {
  const cursorParsed = z.iso.datetime().safeParse(req.query.cursor);
  const cursor = cursorParsed.success ? new Date(cursorParsed.data) : new Date();

  const [units, logs, added] = await Promise.all([
    prisma.studySourceUnit.findMany({
      where: { source: { userId: req.userId }, completedAt: { lt: cursor } },
      orderBy: { completedAt: "desc" },
      take: FEED_PAGE_SIZE,
      include: { source: { select: { id: true, title: true, completedUnits: true, totalUnits: true } } },
    }),
    prisma.studySourceLog.findMany({
      where: {
        source: { userId: req.userId, units: { none: {} } },
        loggedAt: { lt: cursor },
        delta: { gt: 0 },
      },
      orderBy: { loggedAt: "desc" },
      take: FEED_PAGE_SIZE,
      include: { source: { select: { id: true, title: true, completedUnits: true, totalUnits: true } } },
    }),
    prisma.studySource.findMany({
      where: { userId: req.userId, createdAt: { lt: cursor } },
      orderBy: { createdAt: "desc" },
      take: FEED_PAGE_SIZE,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  // A unit/log completion that leaves its source at 100% is shown as a
  // "completed" milestone (trophy icon) instead of a plain progress tick —
  // read from the source's own current completedUnits/totalUnits, not a
  // reconstructed history, so it's an honest "this source is done" signal
  // rather than a precise "this was the exact unit that crossed 100%" one.
  const isNowComplete = (s: { completedUnits: number; totalUnits: number | null }) =>
    s.totalUnits !== null && s.totalUnits > 0 && s.completedUnits >= s.totalUnits;

  const entries: FeedEntry[] = [
    ...units
      .filter((u) => u.completedAt !== null)
      .map((u) => ({
        id: `unit:${u.id}`,
        at: u.completedAt as Date,
        kind: (isNowComplete(u.source) ? "completed" : "lesson") as FeedEntry["kind"],
        sourceId: u.source.id,
        sourceTitle: u.source.title,
        title: u.title,
        notes: u.notes,
      })),
    ...logs.map((l) => ({
      id: `log:${l.id}`,
      at: l.loggedAt,
      kind: (isNowComplete(l.source) ? "completed" : "manual") as FeedEntry["kind"],
      sourceId: l.source.id,
      sourceTitle: l.source.title,
      title: `Logged ${l.delta} lesson${l.delta === 1 ? "" : "s"}`,
      notes: null,
    })),
    ...added.map((s) => ({
      id: `added:${s.id}`,
      at: s.createdAt,
      kind: "added" as const,
      sourceId: s.id,
      sourceTitle: s.title,
      title: `Added ${s.title}`,
      notes: null,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, FEED_PAGE_SIZE);

  const nextCursor = entries.length === FEED_PAGE_SIZE ? entries[entries.length - 1]!.at.toISOString() : null;
  res.json({ entries, nextCursor });
});

// ── self-tests ──
// Session-engine tests: authored A1–B1 bank questions mixed with questions
// generated from the user's own vocabulary. Deliberately independent of the
// review system: nothing here writes ReviewLog, SR fields, or the vault.
// Answers ship to the client (fill-blank feedback needs them) and results are
// self-reported — same trust model as before; you can only cheat yourself.

const quizSchema = z.object({
  size: z.int().min(5).max(30).default(12),
  // Plan journey checkpoint (1 = after station 7, 2 = 14, 3 = 21): a mixed test scoped to that checkpoint's seven
  // stations (checkpoint.ts) at `level` (default: the active level). Never gates anything.
  checkpointIndex: z.int().min(1).max(3).optional(),
  level: LEVEL.optional(),
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
      select: { id: true, headword: true, meaning: true, lesson: true, level: true },
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

  if (parsed.data.checkpointIndex) {
    const level = parsed.data.level ?? activeLevel;
    const items = await prisma.syllabusItem.findMany({
      where: { userId: req.userId, level },
      select: { id: true, level: true, theme: true, sortOrder: true, masteryState: true, skippedAt: true },
    });
    const stations = checkpointStations(deriveStations(items, level), parsed.data.checkpointIndex as 1 | 2 | 3);
    const size = parsed.data.size;
    const bank = checkpointBank(QUESTION_BANK, stations, level, size - Math.round(size / 3));
    const levelWords = words.filter((w) => w.level === level);
    const questions = buildSession({
      bank: bank.questions,
      words: (levelWords.length >= 4 ? levelWords : words).map((w) => ({ ...w, meaning: w.meaning as string })),
      activeLevel: level,
      recentPercents: [],
      excludeIds: new Set(),
      size,
    });
    return res.json({
      questions,
      level,
      checkpoint: { index: parsed.data.checkpointIndex, stations: stations.map((s) => s.theme), scopedQuestions: bank.scoped },
    });
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

const genderDrillSchema = z.object({
  size: z.int().min(1).max(20).default(6),
  // Words "Drill now": this word goes first (if it's a noun with a known article)
  wordId: z.string().optional(),
  // Stats "Drill the shaky ones": only strength 1–2
  shakyOnly: z.boolean().default(false),
});

/** Gender drill words (Stats Drill modal / Words "Drill now"): nouns with a known article, weakest first. */
learningRouter.post("/quiz/gender-drill", async (req, res) => {
  const parsed = genderDrillSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const [rows, grades] = await Promise.all([
    prisma.word.findMany({
      where: { userId: req.userId, meaning: { not: null } },
      select: { id: true, headword: true, meaning: true, grammar: true, srInterval: true, leech: true },
    }),
    lastGrades(req.userId),
  ]);
  const candidates = rows
    .map((w) => ({ ...w, genus: deriveGenus(w.grammar), strength: strength(w, grades.get(w.id) ?? null) }))
    .filter((w) => !parsed.data.shakyOnly || w.strength === 1 || w.strength === 2);
  const first = parsed.data.wordId ? candidates.find((w) => w.id === parsed.data.wordId && w.genus) : undefined;
  const rest = pickGenderDrill(candidates.filter((w) => w.id !== first?.id), parsed.data.size - (first ? 1 : 0));
  res.json({
    words: [...(first ? [first] : []), ...rest].map((w) => ({ wordId: w.id, headword: w.headword, meaning: w.meaning, article: w.genus })),
  });
});

const listenTypeSchema = z.object({ size: z.int().min(1).max(20).default(8) });

/** Listen & type: hear a word, type it. Words with a recording first; the rest play via the TTS fallback. */
learningRouter.post("/quiz/listen-type", async (req, res) => {
  const parsed = listenTypeSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const rows = await prisma.word.findMany({
    where: { userId: req.userId, meaning: { not: null } },
    select: { id: true, headword: true, meaning: true, audioPath: true },
  });
  const shuffled = rows.map((w) => ({ w, r: Math.random() })).sort((a, b) => Number(!!b.w.audioPath) - Number(!!a.w.audioPath) || a.r - b.r);
  res.json({
    words: shuffled.slice(0, parsed.data.size).map(({ w }) => ({
      wordId: w.id,
      headword: w.headword,
      meaning: w.meaning,
      // always with the TTS fallback: it also covers a recording whose file is missing on this machine
      audioUrl: `/api/words/${w.id}/audio?fallback=tts`,
    })),
  });
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
      orderBy: { takenAt: "asc" },
      select: { kind: true, score: true, total: true, breakdown: true, typeBreakdown: true, answers: true, checkpointIndex: true, level: true, takenAt: true },
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
    // Checkpoint tiles: Multiple choice · Fill-in · Gender drill · Listen & type, over the last 20 tests
    scores: selfTestScores(all.slice(-20)),
    // Stats Articles tile / Words der·die·das tile, from every gender-drill answer
    articles: articleAccuracy(all.flatMap((r) => (r.kind === "gender_drill" && Array.isArray(r.answers) ? (r.answers as unknown as DrillAnswer[]) : []))),
    // latest score per (level, checkpoint) for the exam schedule cards
    checkpoints: Object.values(
      Object.fromEntries(
        all
          .filter((r) => r.kind === "checkpoint" && r.checkpointIndex !== null)
          .map((r) => [`${r.level}:${r.checkpointIndex}`, { level: r.level, index: r.checkpointIndex, score: r.score, total: r.total, takenAt: r.takenAt }]),
      ),
    ),
  });
});

const resultSchema = z
  .object({
    score: z.int().min(0).max(100),
    total: z.int().min(1).max(100),
    kind: z.enum(["vocab", "mixed", "gender_drill", "listen_type", "checkpoint"]).default("mixed"),
    checkpointIndex: z.int().min(1).max(3).nullish(),
    typeBreakdown: z
      .array(z.object({ type: z.enum(["mcq", "fill_blank", "true_false"]), correct: z.int().min(0).max(100), total: z.int().min(1).max(100) }))
      .max(3)
      .optional(),
    // gender_drill: one row per word asked
    answers: z
      .array(z.object({ wordId: z.string().max(40), article: z.enum(["der", "die", "das"]), picked: z.enum(["der", "die", "das"]) }))
      .max(20)
      .optional(),
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
  .refine((r) => r.score <= r.total, { message: "score cannot exceed total" })
  .refine((r) => (r.kind === "checkpoint") === (r.checkpointIndex != null), { message: "checkpointIndex goes with kind checkpoint" });

learningRouter.post("/quiz/results", async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const { questionIds, breakdown, typeBreakdown, answers, ...rest } = parsed.data;
  const result = await prisma.selfTestResult.create({
    data: {
      userId: req.userId,
      ...rest,
      level: rest.level ?? null,
      lesson: rest.lesson ?? null,
      checkpointIndex: rest.checkpointIndex ?? null,
      questionIds: questionIds ?? undefined,
      breakdown: breakdown ?? undefined,
      typeBreakdown: typeBreakdown ?? undefined,
      answers: answers ?? undefined,
    },
  });
  // A wrong article flags the word as shaky. (README: "N go back into tomorrow's review" — but self-tests never
  // write SR fields, which live in the Obsidian vault, so the honest version is the app-only shaky flag.)
  const missed = (answers ?? []).filter((a) => a.picked !== a.article).map((a) => a.wordId);
  if (rest.kind === "gender_drill" && missed.length > 0) {
    await prisma.word.updateMany({ where: { userId: req.userId, id: { in: missed } }, data: { leech: true } });
  }
  res.status(201).json({ result, flaggedShaky: missed.length });
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

// ── exam gate — the real, gating final exam per CEFR level (see
// services/learning/exam.ts's doc comment for how this differs from the
// self-reported/client-scored practice quiz above: answers never reach the
// client, submissions are re-scored server-side against the stored bank). ──

const LEVELS_ORDER = ["a1", "a2", "b1"] as const;

/** Same syllabus-percent computation the /quiz route above uses, reused
 * here to find the user's current active level and to refuse starting an
 * exam for any level that isn't it (can't skip ahead, can't re-take one
 * that's already behind you). */
async function activeLevelFor(userId: string) {
  const syllabusRows = await prisma.syllabusItem.findMany({
    where: { userId },
    select: { level: true, completedAt: true },
  });
  const levels = LEVELS_ORDER.map((level) => {
    const inLevel = syllabusRows.filter((r) => r.level === level);
    const done = inLevel.filter((r) => r.completedAt !== null).length;
    return {
      total: inLevel.length,
      percent: inLevel.length === 0 ? 0 : Math.round((done / inLevel.length) * 100),
    };
  });
  const examGate = await examGateForUser(userId);
  const states = levelStatesWithExamGate(levels, examGate);
  return LEVELS_ORDER[Math.max(0, states.indexOf("active"))]!;
}

learningRouter.get("/exam/status", async (req, res) => {
  const activeLevel = await activeLevelFor(req.userId);
  const [attempts, user] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId: req.userId, level: activeLevel },
      orderBy: { startedAt: "desc" },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { examTargetDate: true } }),
  ]);
  const real = attempts.filter((a) => a.mode === "real");
  const gate = canAttemptExam(real.map((a) => ({ startedAt: a.startedAt, passed: a.passed })));
  res.json({
    level: activeLevel,
    ...gate,
    lastAttempt: real[0] ?? null,
    lastMockAttempt: attempts.find((a) => a.mode === "mock") ?? null,
    examTargetDate: user.examTargetDate ? user.examTargetDate.toISOString().slice(0, 10) : null,
    suggestedMockDate: suggestedMockDate(user.examTargetDate),
    // full history (already fetched above for lastAttempt/gate) — Stats'
    // exam-attempt trend, most-recent first, same order as lastAttempt
    attempts,
    timeLimitMinutes: EXAM_TIME_LIMIT_MINUTES,
    cooldownDays: EXAM_ATTEMPT_COOLDOWN_DAYS,
    passThreshold: EXAM_PASS_THRESHOLD,
    sectionCounts: examSectionCounts(activeLevel),
  });
});

const startSchema = z.object({ mode: z.enum(["real", "mock"]).default("real") });

learningRouter.post("/exam/start", async (req, res) => {
  const parsedStart = startSchema.safeParse(req.body ?? {});
  if (!parsedStart.success) return res.status(400).json({ error: z.prettifyError(parsedStart.error) });
  const mode = parsedStart.data.mode;
  const activeLevel = await activeLevelFor(req.userId);
  // A mock exam is practice: no 7-day lock, available even after passing.
  if (mode === "real") {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.userId, level: activeLevel, mode: "real" },
      select: { startedAt: true, passed: true },
    });
    const gate = canAttemptExam(attempts);
    if (!gate.allowed) {
      return res.status(409).json({ error: `Cannot start exam: ${gate.reason}`, ...gate });
    }
  }

  const questions = buildExamSession(activeLevel);
  if (!questions.length) {
    return res.status(404).json({ error: `No exam content for level ${activeLevel} yet` });
  }
  const attempt = await prisma.examAttempt.create({
    data: { userId: req.userId, level: activeLevel, mode },
  });
  res.status(201).json({ attemptId: attempt.id, level: activeLevel, mode, questions, timeLimitMinutes: EXAM_TIME_LIMIT_MINUTES });
});

const submitSchema = z.object({
  answers: z
    .array(z.object({ qid: z.string(), answer: z.union([z.string(), z.number(), z.boolean()]) }))
    .max(200),
});

learningRouter.post("/exam/:id/submit", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!attempt) return res.status(404).json({ error: "Exam attempt not found" });
  if (attempt.submittedAt) return res.status(409).json({ error: "This attempt was already submitted" });

  const result = scoreExam(attempt.level, parsed.data.answers);
  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      submittedAt: new Date(),
      score: result.score,
      total: result.total,
      // a mock never counts as a pass (it can't unlock the next level); the score still says how it went
      passed: attempt.mode === "mock" ? null : result.passed,
      sectionBreakdown: result.sectionBreakdown as unknown as Prisma.InputJsonValue,
    },
  });
  res.json({ attempt: updated, wouldHavePassed: result.passed });
});

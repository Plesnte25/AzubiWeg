import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isStationKey } from "../services/learning/stations.js";
import { initialNoteCategory } from "../services/notes/category.js";
import { dayPlus, nextResurface, resurfaceForCategory } from "../services/notes/resurface.js";
import { deleteStoredFile } from "./files.js";

export const notesRouter = Router();
notesRouter.use(requireAuth);

const SKILL_ENUM = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading", "bureaucracy", "milestone", "reflection"]);
const CATEGORY_ENUM = z.enum(["grammar", "mistakes", "everyday", "jobs", "listening"]);
const STATION_KEY = z.string().refine(isStationKey, "Invalid station key (expected level:theme)");

/** Joins the 3 legacy Grammar Notebook fields into one body string, same
 * merge StationDetailModal.tsx's mergedNotebookValue() does client-side —
 * done here instead so the Notes tab never has to re-implement it. */
function mergedNotebookBody(item: { examples: string | null; exceptions: string | null; commonMistakes: string | null }): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

/** What a sticky-wall note shows for its link chip: the linked word/application/source's name. */
const WALL_INCLUDE = {
  files: true,
  word: { select: { id: true, headword: true } },
  application: { select: { id: true, company: true } },
  studySource: { select: { id: true, title: true } },
} as const;

/** The Notes sticky wall: real notes only (journals were migrated in; notebook and unit notes stay where they live). */
notesRouter.get("/wall", async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { userId: req.userId },
    include: WALL_INCLUDE,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  res.json({ notes });
});

notesRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
  const roadmapTaskId = typeof req.query.roadmapTaskId === "string" ? req.query.roadmapTaskId : undefined;
  const wordId = typeof req.query.wordId === "string" ? req.query.wordId : undefined;
  const syllabusItemId = typeof req.query.syllabusItemId === "string" ? req.query.syllabusItemId : undefined;
  const stationKey = typeof req.query.stationKey === "string" ? req.query.stationKey : undefined;
  const applicationId = typeof req.query.applicationId === "string" ? req.query.applicationId : undefined;

  // scoped to one Plan station (the journey's "Notes · Station N" tile) or one application (Jobs detail)
  if (stationKey || applicationId) {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId, ...(stationKey ? { stationKey } : {}), ...(applicationId ? { applicationId } : {}) },
      include: { files: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return res.json({ notes, taskJournals: [], grammarNotebook: [], sourceNotes: [] });
  }

  // scoped to one task (TaskDetailDrawer's Notes section), one word (Word
  // Detail's "Your note" card), or one syllabus item (StationDetailModal's
  // per-item notes section) — skip the 3 cross-app aggregate queries
  // entirely, nothing else needs them
  if (roadmapTaskId) {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId, roadmapTaskId },
      include: { files: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notes, taskJournals: [], grammarNotebook: [], sourceNotes: [] });
  }
  if (syllabusItemId) {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId, syllabusItemId },
      include: { files: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notes, taskJournals: [], grammarNotebook: [], sourceNotes: [] });
  }
  if (wordId) {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId, wordId },
      include: { files: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notes, taskJournals: [], grammarNotebook: [], sourceNotes: [] });
  }

  const [notes, taskJournals, notebookItems, unitNotes] = await Promise.all([
    prisma.note.findMany({
      where: {
        userId: req.userId,
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { files: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.roadmapTask.findMany({
      where: {
        day: { userId: req.userId },
        journalEntry: { not: null },
        ...(q ? { journalEntry: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        day: { select: { date: true, theme: true } },
        files: true,
        syllabusItem: { select: { level: true, theme: true, description: true } },
      },
      orderBy: { day: { date: "desc" } },
    }),
    prisma.syllabusItem.findMany({
      where: {
        userId: req.userId,
        OR: [{ examples: { not: null } }, { exceptions: { not: null } }, { commonMistakes: { not: null } }],
      },
      select: {
        id: true,
        level: true,
        theme: true,
        title: true,
        skill: true,
        examples: true,
        exceptions: true,
        commonMistakes: true,
        files: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.studySourceUnit.findMany({
      where: { source: { userId: req.userId }, notes: { not: null } },
      include: { source: { select: { id: true, title: true } } },
      orderBy: { position: "asc" },
    }),
  ]);

  const grammarNotebook = notebookItems
    .map((item) => ({ ...item, body: mergedNotebookBody(item) }))
    .filter((item) => !q || item.body.toLowerCase().includes(q.toLowerCase()));

  const sourceNotes = unitNotes
    .map(({ source, ...unit }) => ({ ...unit, sourceId: source.id, sourceTitle: source.title }))
    .filter((unit) => !q || unit.notes!.toLowerCase().includes(q.toLowerCase()));

  res.json({ notes, taskJournals, grammarNotebook, sourceNotes });
});

const noteSchema = z.object({
  title: z.string().trim().max(200).nullish(),
  body: z.string().trim().max(20000).nullish(),
  skill: SKILL_ENUM.nullish(),
  syllabusItemId: z.string().nullish(),
  roadmapTaskId: z.string().nullish(),
  // wordId: soft link to a vocab word (Word Detail's "Your note" card, and
  // the live "Link '<word>' to this note?" prompt while typing). contextTag:
  // which screen/section was active when the FAB capture button was tapped
  // ("/Jobs") — not validated against anything, it's just a display label.
  wordId: z.string().nullish(),
  contextTag: z.string().trim().max(60).nullish(),
  // Bento sticky wall: category (omitted on create = derived, see initialNoteCategory), pin, and the /job and
  // /station links
  category: CATEGORY_ENUM.optional(),
  pinned: z.boolean().optional(),
  applicationId: z.string().nullish(),
  stationKey: STATION_KEY.nullish(),
  studySourceId: z.string().nullish(),
});

async function validateLinks(
  userId: string,
  syllabusItemId: string | null | undefined,
  roadmapTaskId: string | null | undefined,
  wordId: string | null | undefined,
  applicationId?: string | null,
  studySourceId?: string | null,
) {
  if (studySourceId) {
    const source = await prisma.studySource.findFirst({ where: { id: studySourceId, userId } });
    if (!source) return "Source not found";
  }
  if (applicationId) {
    const app = await prisma.application.findFirst({ where: { id: applicationId, userId } });
    if (!app) return "Application not found";
  }
  if (syllabusItemId) {
    const item = await prisma.syllabusItem.findFirst({ where: { id: syllabusItemId, userId } });
    if (!item) return "Syllabus item not found";
  }
  if (roadmapTaskId) {
    const task = await prisma.roadmapTask.findFirst({ where: { id: roadmapTaskId, day: { userId } } });
    if (!task) return "Roadmap task not found";
  }
  if (wordId) {
    const word = await prisma.word.findFirst({ where: { id: wordId, userId } });
    if (!word) return "Word not found";
  }
  return null;
}

notesRouter.post("/", async (req, res) => {
  const parsed = noteSchema
    .refine((d) => Boolean(d.title?.trim() || d.body?.trim()), { message: "Note needs a title or some text" })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { title, body, skill, syllabusItemId, roadmapTaskId, wordId, contextTag, category, pinned, applicationId, stationKey, studySourceId } =
    parsed.data;

  const linkError = await validateLinks(req.userId, syllabusItemId, roadmapTaskId, wordId, applicationId, studySourceId);
  if (linkError) return res.status(404).json({ error: linkError });

  const finalCategory =
    category ?? initialNoteCategory({ skill: skill ?? null, contextTag: contextTag ?? null, applicationId: applicationId ?? null });
  const note = await prisma.note.create({
    data: {
      userId: req.userId,
      title: title ?? null,
      body: body ?? null,
      skill: skill ?? null,
      syllabusItemId: syllabusItemId ?? null,
      roadmapTaskId: roadmapTaskId ?? null,
      wordId: wordId ?? null,
      contextTag: contextTag ?? null,
      category: finalCategory,
      pinned: pinned ?? false,
      applicationId: applicationId ?? null,
      stationKey: stationKey ?? null,
      studySourceId: studySourceId ?? null,
      ...resurfaceForCategory(finalCategory, { resurfaceDueAt: null, resurfaceStep: 0 }),
    },
    include: { files: true },
  });
  res.status(201).json({ note });
});

const patchSchema = noteSchema.refine(
  (d) =>
    d.title !== undefined ||
    d.body !== undefined ||
    d.skill !== undefined ||
    d.syllabusItemId !== undefined ||
    d.roadmapTaskId !== undefined ||
    d.wordId !== undefined ||
    d.contextTag !== undefined ||
    d.category !== undefined ||
    d.pinned !== undefined ||
    d.applicationId !== undefined ||
    d.stationKey !== undefined ||
    d.studySourceId !== undefined,
  { message: "Nothing to update" },
);

notesRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Note not found" });

  const { title, body, skill, syllabusItemId, roadmapTaskId, wordId, contextTag, category, pinned, applicationId, stationKey, studySourceId } =
    parsed.data;
  const linkError = await validateLinks(req.userId, syllabusItemId, roadmapTaskId, wordId, applicationId, studySourceId);
  if (linkError) return res.status(404).json({ error: linkError });

  const note = await prisma.note.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined ? { title: title ?? null } : {}),
      ...(body !== undefined ? { body: body ?? null } : {}),
      ...(skill !== undefined ? { skill: skill ?? null } : {}),
      ...(syllabusItemId !== undefined ? { syllabusItemId: syllabusItemId ?? null } : {}),
      ...(roadmapTaskId !== undefined ? { roadmapTaskId: roadmapTaskId ?? null } : {}),
      ...(wordId !== undefined ? { wordId: wordId ?? null } : {}),
      ...(contextTag !== undefined ? { contextTag: contextTag ?? null } : {}),
      ...(category !== undefined ? { category, ...resurfaceForCategory(category, existing) } : {}),
      ...(pinned !== undefined ? { pinned } : {}),
      ...(applicationId !== undefined ? { applicationId: applicationId ?? null } : {}),
      ...(stationKey !== undefined ? { stationKey: stationKey ?? null } : {}),
      ...(studySourceId !== undefined ? { studySourceId: studySourceId ?? null } : {}),
    },
    include: { files: true },
  });
  res.json({ note });
});

/** "Surfaced today": rotating (grammar/mistakes) notes due on or before today, oldest-due first. */
notesRouter.get("/surfaced", async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { userId: req.userId, resurfaceDueAt: { lte: dayPlus(new Date(), 0) } },
    include: { files: true },
    orderBy: [{ resurfaceDueAt: "asc" }, { createdAt: "asc" }],
    take: 20,
  });
  res.json({ notes });
});

const resurfaceSchema = z.object({ outcome: z.enum(["again", "known"]) });

/** "Show again" (outcome again) / "Still know it" (outcome known) on a surfaced note. */
notesRouter.post("/:id/resurface", async (req, res) => {
  const parsed = resurfaceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Note not found" });
  if (existing.resurfaceDueAt === null) return res.status(409).json({ error: "This note isn't in the resurfacing rotation" });

  const note = await prisma.note.update({
    where: { id: existing.id },
    data: nextResurface(existing, parsed.data.outcome),
    include: { files: true },
  });
  res.json({ note });
});

notesRouter.delete("/:id", async (req, res) => {
  const note = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { files: true } });
  if (!note) return res.status(404).json({ error: "Note not found" });

  for (const file of note.files) {
    await deleteStoredFile(req.userId, file.storedName);
  }
  await prisma.note.delete({ where: { id: note.id } });
  res.status(204).end();
});

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteStoredFile } from "./files.js";

export const notesRouter = Router();
notesRouter.use(requireAuth);

const SKILL_ENUM = z.enum(["grammar", "vocab", "listening", "speaking", "writing", "reading", "bureaucracy", "milestone", "reflection"]);

/** Joins the 3 legacy Grammar Notebook fields into one body string, same
 * merge StationDetailModal.tsx's mergedNotebookValue() does client-side —
 * done here instead so the Notes tab never has to re-implement it. */
function mergedNotebookBody(item: { examples: string | null; exceptions: string | null; commonMistakes: string | null }): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

notesRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
  const roadmapTaskId = typeof req.query.roadmapTaskId === "string" ? req.query.roadmapTaskId : undefined;
  const wordId = typeof req.query.wordId === "string" ? req.query.wordId : undefined;

  // scoped to one task (TaskDetailDrawer's Notes section) or one word (Word
  // Detail's "Your note" card) — skip the 3 cross-app aggregate queries
  // entirely, nothing else needs them
  if (roadmapTaskId) {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId, roadmapTaskId },
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
});

async function validateLinks(
  userId: string,
  syllabusItemId: string | null | undefined,
  roadmapTaskId: string | null | undefined,
  wordId: string | null | undefined,
) {
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
  const { title, body, skill, syllabusItemId, roadmapTaskId, wordId, contextTag } = parsed.data;

  const linkError = await validateLinks(req.userId, syllabusItemId, roadmapTaskId, wordId);
  if (linkError) return res.status(404).json({ error: linkError });

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
    d.contextTag !== undefined,
  { message: "Nothing to update" },
);

notesRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Note not found" });

  const { title, body, skill, syllabusItemId, roadmapTaskId, wordId, contextTag } = parsed.data;
  const linkError = await validateLinks(req.userId, syllabusItemId, roadmapTaskId, wordId);
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
    },
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

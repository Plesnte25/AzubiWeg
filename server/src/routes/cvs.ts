import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { CV_DOCUMENT_TYPES } from "../services/files/storage.js";
import { deleteStoredFile } from "./files.js";

export const cvsRouter = Router();
cvsRouter.use(requireAuth);

const CATEGORY = z.enum(["lebenslauf", "ats"]);

const fileSelect = { id: true, originalName: true, mimeType: true, size: true } as const;

cvsRouter.get("/", async (req, res) => {
  const [cvs, usage] = await Promise.all([
    prisma.cv.findMany({
      where: { userId: req.userId },
      include: { file: { select: fileSelect } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.application.groupBy({
      by: ["cvId"],
      where: { userId: req.userId, cvId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const usedIn = new Map(usage.map((u) => [u.cvId as string, u._count._all]));
  res.json({ cvs: cvs.map((cv) => ({ ...cv, usedIn: usedIn.get(cv.id) ?? 0 })) });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: CATEGORY.default("lebenslauf"),
  fileId: z.string(),
});

// a CV is just an already-uploaded file (POST /api/files with no parent)
// plus a title/category — no in-app CV builder, nothing rendered
cvsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const file = await prisma.uploadedFile.findFirst({
    where: { id: parsed.data.fileId, userId: req.userId, cvId: null },
  });
  if (!file) return res.status(400).json({ error: "Unknown file" });
  if (!CV_DOCUMENT_TYPES.has(file.mimeType)) {
    return res.status(400).json({ error: "A CV must be a PDF or Word document" });
  }

  const cv = await prisma.cv.create({
    data: {
      userId: req.userId,
      title: parsed.data.title,
      category: parsed.data.category,
      file: { connect: { id: file.id } },
    },
    include: { file: { select: fileSelect } },
  });
  res.status(201).json({ cv: { ...cv, usedIn: 0 } });
});

cvsRouter.get("/:id", async (req, res) => {
  const cv = await prisma.cv.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { file: { select: fileSelect } },
  });
  if (!cv) return res.status(404).json({ error: "CV not found" });
  const usedIn = await prisma.application.count({ where: { cvId: cv.id } });
  res.json({ cv: { ...cv, usedIn } });
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: CATEGORY.optional(),
});

cvsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.cv.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "CV not found" });

  const cv = await prisma.cv.update({
    where: { id: existing.id },
    data: parsed.data,
    include: { file: { select: fileSelect } },
  });
  const usedIn = await prisma.application.count({ where: { cvId: cv.id } });
  res.json({ cv: { ...cv, usedIn } });
});

cvsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.cv.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { file: true },
  });
  if (!existing) return res.status(404).json({ error: "CV not found" });

  // the UploadedFile row cascades with the Cv (see schema), but the bytes
  // on disk don't
  if (existing.file) await deleteStoredFile(req.userId, existing.file.storedName);
  await prisma.cv.delete({ where: { id: existing.id } });
  res.status(204).end();
});

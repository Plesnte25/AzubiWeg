import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import express, { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  contentDispositionFor,
  IMAGE_TYPES,
  MAX_FILE_SIZE,
  storedNameFor,
  uploadsDir,
} from "../services/files/storage.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

// memory storage: nothing touches disk until the upload passes validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const uploadSchema = z.object({
  kind: z.enum(["document", "cv_photo"]).default("document"),
  checklistItemId: z.string().optional(),
  syllabusItemId: z.string().optional(),
  studySourceId: z.string().optional(),
});

// translate multer's size-limit error into a 400 instead of the global 500
const uploadSingle: express.RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 10 MB limit" : err.message;
      return res.status(400).json({ error: msg });
    }
    next(err);
  });
};

filesRouter.post("/", uploadSingle, async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { kind, checklistItemId, syllabusItemId, studySourceId } = parsed.data;

  if (!req.file) return res.status(400).json({ error: "No file provided (field name: file)" });
  if (kind === "cv_photo" && !IMAGE_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ error: "CV photos must be JPEG, PNG, or WebP" });
  }
  const storedName = storedNameFor(req.file.mimetype);
  if (!storedName) {
    return res.status(400).json({ error: "Only PDF, JPEG, PNG, and WebP files are allowed" });
  }

  const parents = [checklistItemId, syllabusItemId, studySourceId].filter(Boolean);
  if (parents.length > 1) {
    return res.status(400).json({ error: "A file can attach to only one item" });
  }
  if (checklistItemId) {
    const item = await prisma.checklistItem.findFirst({
      where: { id: checklistItemId, userId: req.userId },
    });
    if (!item) return res.status(404).json({ error: "Checklist item not found" });
  }
  if (syllabusItemId) {
    const item = await prisma.syllabusItem.findFirst({
      where: { id: syllabusItemId, userId: req.userId },
    });
    if (!item) return res.status(404).json({ error: "Syllabus item not found" });
  }
  if (studySourceId) {
    const source = await prisma.studySource.findFirst({
      where: { id: studySourceId, userId: req.userId },
    });
    if (!source) return res.status(404).json({ error: "Study source not found" });
  }

  const dir = uploadsDir(req.userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), req.file.buffer);

  const file = await prisma.uploadedFile.create({
    data: {
      userId: req.userId,
      checklistItemId: checklistItemId ?? null,
      syllabusItemId: syllabusItemId ?? null,
      studySourceId: studySourceId ?? null,
      kind,
      originalName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
  res.status(201).json({ file });
});

filesRouter.get("/:id", async (req, res) => {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!file) return res.status(404).json({ error: "File not found" });

  const baseDir = path.resolve(uploadsDir(req.userId));
  const resolved = path.resolve(baseDir, file.storedName);
  // storedName is server-generated, but keep the same guard as the audio route
  if (!resolved.startsWith(baseDir + path.sep) || !existsSync(resolved)) {
    return res.status(404).json({ error: "File not found on disk" });
  }
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    contentDispositionFor(file.originalName, file.mimeType.startsWith("image/")),
  );
  res.sendFile(resolved);
});

filesRouter.delete("/:id", async (req, res) => {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!file) return res.status(404).json({ error: "File not found" });

  await deleteStoredFile(req.userId, file.storedName);
  await prisma.uploadedFile.delete({ where: { id: file.id } });
  res.status(204).end();
});

/** Removes an upload's bytes from disk; missing files are fine (rows cascade, bytes don't). */
export async function deleteStoredFile(userId: string, storedName: string): Promise<void> {
  await unlink(path.join(uploadsDir(userId), storedName)).catch(() => {});
}

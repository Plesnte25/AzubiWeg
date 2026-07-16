import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { cvContentSchema, emptyCvContent } from "../services/cv/schema.js";
import { deleteStoredFile } from "./files.js";

export const cvsRouter = Router();
cvsRouter.use(requireAuth);

const TEMPLATE = z.enum(["lebenslauf", "ats"]);

cvsRouter.get("/", async (req, res) => {
  const cvs = await prisma.cv.findMany({
    where: { userId: req.userId },
    select: { id: true, title: true, template: true, photoFileId: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ cvs });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  template: TEMPLATE.default("lebenslauf"),
});

cvsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const cv = await prisma.cv.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      template: parsed.data.template,
      content: emptyCvContent(user) as Prisma.InputJsonValue,
    },
  });
  res.status(201).json({ cv });
});

cvsRouter.get("/:id", async (req, res) => {
  const cv = await prisma.cv.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!cv) return res.status(404).json({ error: "CV not found" });
  res.json({ cv });
});

const putSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  template: TEMPLATE.optional(),
  content: cvContentSchema.optional(),
  photoFileId: z.string().nullish(),
});

cvsRouter.put("/:id", async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.cv.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "CV not found" });

  const { photoFileId, content, ...fields } = parsed.data;
  if (photoFileId) {
    const photo = await prisma.uploadedFile.findFirst({
      where: { id: photoFileId, userId: req.userId, kind: "cv_photo" },
    });
    if (!photo) return res.status(400).json({ error: "Unknown photo" });
  }
  // replacing or clearing the photo orphans the old file — remove its bytes
  if (photoFileId !== undefined && existing.photoFileId && existing.photoFileId !== photoFileId) {
    const old = await prisma.uploadedFile.findUnique({ where: { id: existing.photoFileId } });
    if (old) {
      await deleteStoredFile(req.userId, old.storedName);
      await prisma.uploadedFile.delete({ where: { id: old.id } });
    }
  }

  const cv = await prisma.cv.update({
    where: { id: existing.id },
    data: {
      ...fields,
      ...(content !== undefined ? { content: content as Prisma.InputJsonValue } : {}),
      ...(photoFileId !== undefined ? { photoFileId } : {}),
    },
  });
  res.json({ cv });
});

cvsRouter.post("/:id/duplicate", async (req, res) => {
  const existing = await prisma.cv.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "CV not found" });

  // the photo file is owned by the original CV's lifecycle, so the copy
  // starts without one rather than sharing bytes that may get deleted
  const cv = await prisma.cv.create({
    data: {
      userId: req.userId,
      title: `${existing.title} (Kopie)`,
      template: existing.template,
      content: existing.content as Prisma.InputJsonValue,
    },
  });
  res.status(201).json({ cv });
});

cvsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.cv.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "CV not found" });

  if (existing.photoFileId) {
    const photo = await prisma.uploadedFile.findUnique({ where: { id: existing.photoFileId } });
    if (photo) {
      await deleteStoredFile(req.userId, photo.storedName);
      await prisma.uploadedFile.delete({ where: { id: photo.id } });
    }
  }
  await prisma.cv.delete({ where: { id: existing.id } });
  res.status(204).end();
});

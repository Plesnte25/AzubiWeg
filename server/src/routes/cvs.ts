import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { CV_DOCUMENT_TYPES } from "../services/files/storage.js";
import { deleteStoredFile } from "./files.js";

/*
 * Settings → CV shelf: CVs, cover letters and certificates. A document is its uploaded files, one per version (the
 * highest cvVersion is current; "New version" adds a file and older ones stay). One CV per user is the default: Jobs
 * preselects it, and it can't be removed or re-kinded while another CV could take its place.
 */

export const cvsRouter = Router();
cvsRouter.use(requireAuth);

const KIND = z.enum(["cv", "letter", "certificates"]);

const fileSelect = { id: true, originalName: true, mimeType: true, size: true } as const;
const withFiles = { files: { select: { ...fileSelect, cvVersion: true }, orderBy: { cvVersion: "desc" } } } as const satisfies Prisma.CvInclude;
type CvWithFiles = Prisma.CvGetPayload<{ include: typeof withFiles }>;

/** The client's shape: the current file as `file`, plus how many applications use the document. */
function serialize({ files, ...cv }: CvWithFiles, usedIn: number) {
  const [current] = files;
  return { ...cv, file: current ? { id: current.id, originalName: current.originalName, mimeType: current.mimeType, size: current.size } : null, usedIn };
}

async function ownDocument(userId: string, id: string) {
  return prisma.cv.findFirst({ where: { id, userId }, include: withFiles });
}

/** An already-uploaded file (POST /api/files with no parent) that isn't attached to anything yet, and is a document. */
async function freeDocumentFile(userId: string, fileId: string): Promise<{ id: string } | string> {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId, cvId: null } });
  if (!file) return "Unknown file";
  if (!CV_DOCUMENT_TYPES.has(file.mimeType)) return "A document must be a PDF or Word file";
  return file;
}

cvsRouter.get("/", async (req, res) => {
  const [cvs, usage] = await Promise.all([
    prisma.cv.findMany({ where: { userId: req.userId }, include: withFiles, orderBy: { createdAt: "asc" } }),
    prisma.application.groupBy({
      by: ["cvId"],
      where: { userId: req.userId, cvId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const usedIn = new Map(usage.map((u) => [u.cvId as string, u._count._all]));
  res.json({ cvs: cvs.map((cv) => serialize(cv, usedIn.get(cv.id) ?? 0)) });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: KIND.default("cv"),
  fileId: z.string(),
});

cvsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const file = await freeDocumentFile(req.userId, parsed.data.fileId);
  if (typeof file === "string") return res.status(400).json({ error: file });

  // the first CV on the shelf becomes the default
  const hasDefault = parsed.data.kind === "cv" && (await prisma.cv.count({ where: { userId: req.userId, isDefault: true } })) > 0;
  const cv = await prisma.cv.create({
    data: {
      userId: req.userId,
      title: parsed.data.title,
      kind: parsed.data.kind,
      isDefault: parsed.data.kind === "cv" && !hasDefault,
      files: { connect: { id: file.id } },
    },
    include: withFiles,
  });
  await prisma.uploadedFile.update({ where: { id: file.id }, data: { cvVersion: 1 } });
  res.status(201).json({ cv: serialize({ ...cv, files: cv.files.map((f) => ({ ...f, cvVersion: 1 })) }, 0) });
});

cvsRouter.get("/:id", async (req, res) => {
  const cv = await ownDocument(req.userId, req.params.id);
  if (!cv) return res.status(404).json({ error: "Document not found" });
  const usedIn = await prisma.application.count({ where: { cvId: cv.id } });
  res.json({ cv: serialize(cv, usedIn) });
});

const versionSchema = z.object({ fileId: z.string() });

/** New version: the uploaded file becomes version n+1 and the current file; the older files stay. */
cvsRouter.post("/:id/versions", async (req, res) => {
  const parsed = versionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const existing = await ownDocument(req.userId, req.params.id);
  if (!existing) return res.status(404).json({ error: "Document not found" });
  const file = await freeDocumentFile(req.userId, parsed.data.fileId);
  if (typeof file === "string") return res.status(400).json({ error: file });

  const version = existing.version + 1;
  const [cv, usedIn] = await prisma.$transaction([
    prisma.cv.update({
      where: { id: existing.id },
      data: { version, files: { connect: { id: file.id } } },
      include: withFiles,
    }),
    prisma.application.count({ where: { cvId: existing.id } }),
    prisma.uploadedFile.update({ where: { id: file.id }, data: { cvVersion: version } }),
  ]);
  const files = cv.files.map((f) => (f.id === file.id ? { ...f, cvVersion: version } : f)).sort((a, b) => (b.cvVersion ?? 0) - (a.cvVersion ?? 0));
  res.status(201).json({ cv: serialize({ ...cv, files }, usedIn) });
});

cvsRouter.post("/:id/default", async (req, res) => {
  const existing = await ownDocument(req.userId, req.params.id);
  if (!existing) return res.status(404).json({ error: "Document not found" });
  if (existing.kind !== "cv") return res.status(400).json({ error: "Only a CV can be the default" });

  const [, cv, usedIn] = await prisma.$transaction([
    prisma.cv.updateMany({ where: { userId: req.userId, isDefault: true }, data: { isDefault: false } }),
    prisma.cv.update({ where: { id: existing.id }, data: { isDefault: true }, include: withFiles }),
    prisma.application.count({ where: { cvId: existing.id } }),
  ]);
  res.json({ cv: serialize(cv, usedIn) });
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  kind: KIND.optional(),
});

cvsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await ownDocument(req.userId, req.params.id);
  if (!existing) return res.status(404).json({ error: "Document not found" });
  if (existing.isDefault && parsed.data.kind && parsed.data.kind !== "cv") {
    return res.status(409).json({ error: "Pick another default CV first" });
  }

  const cv = await prisma.cv.update({ where: { id: existing.id }, data: parsed.data, include: withFiles });
  const usedIn = await prisma.application.count({ where: { cvId: cv.id } });
  res.json({ cv: serialize(cv, usedIn) });
});

cvsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.cv.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { files: true },
  });
  if (!existing) return res.status(404).json({ error: "Document not found" });
  // the default can go only when it's the last CV (nothing else could be preselected anyway)
  if (existing.isDefault && (await prisma.cv.count({ where: { userId: req.userId, kind: "cv", id: { not: existing.id } } })) > 0) {
    return res.status(409).json({ error: "Pick another default CV first" });
  }

  // the UploadedFile rows cascade with the Cv (see schema), but the bytes on disk don't
  for (const file of existing.files) await deleteStoredFile(req.userId, file.storedName);
  await prisma.cv.delete({ where: { id: existing.id } });
  res.status(204).end();
});

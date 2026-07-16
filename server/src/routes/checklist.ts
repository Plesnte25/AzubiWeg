import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { DEFAULT_CHECKLIST_ITEMS } from "../services/checklist/defaults.js";
import { expiryStatus } from "../services/reminders.js";
import { deleteStoredFile } from "./files.js";

export const checklistRouter = Router();
checklistRouter.use(requireAuth);

const CATEGORY = z.enum([
  "identity",
  "education",
  "visa",
  "finances",
  "insurance",
  "application",
  "after_arrival",
  "other",
]);
const STATUS = z.enum(["todo", "in_progress", "done", "not_applicable"]);

// "YYYY-MM-DD" → UTC midnight, matching how @db.Date values come back
const toDate = (s: string) => new Date(s + "T00:00:00Z");

checklistRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.checklistSeededAt) {
    // seed once per user; the stamp (not the item count) guards re-seeding,
    // so deleting all items later doesn't bring the defaults back
    await prisma.$transaction([
      prisma.checklistItem.createMany({
        data: DEFAULT_CHECKLIST_ITEMS.map((item, i) => ({
          userId: user.id,
          ...item,
          isDefault: true,
          sortOrder: i,
        })),
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { checklistSeededAt: new Date() },
      }),
    ]);
  }

  const items = await prisma.checklistItem.findMany({
    where: { userId: req.userId },
    include: { files: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const today = new Date();
  res.json({
    items: items.map((item) => ({ ...item, expiry: expiryStatus(item.expiresAt, today) })),
  });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullish(),
  category: CATEGORY.default("other"),
  expiresAt: z.iso.date().nullish(),
});

checklistRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const max = await prisma.checklistItem.aggregate({
    where: { userId: req.userId },
    _max: { sortOrder: true },
  });
  const item = await prisma.checklistItem.create({
    data: {
      userId: req.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      expiresAt: parsed.data.expiresAt ? toDate(parsed.data.expiresAt) : null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    include: { files: true },
  });
  res.status(201).json({ item: { ...item, expiry: expiryStatus(item.expiresAt, new Date()) } });
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).nullish(),
  category: CATEGORY.optional(),
  status: STATUS.optional(),
  expiresAt: z.iso.date().nullish(),
});

checklistRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.checklistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Checklist item not found" });

  const { expiresAt, ...rest } = parsed.data;
  const item = await prisma.checklistItem.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? toDate(expiresAt) : null } : {}),
    },
    include: { files: true },
  });
  res.json({ item: { ...item, expiry: expiryStatus(item.expiresAt, new Date()) } });
});

checklistRouter.delete("/:id", async (req, res) => {
  const item = await prisma.checklistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { files: true },
  });
  if (!item) return res.status(404).json({ error: "Checklist item not found" });

  // DB rows cascade with the item; the bytes on disk don't
  for (const file of item.files) {
    await deleteStoredFile(req.userId, file.storedName);
  }
  await prisma.checklistItem.delete({ where: { id: item.id } });
  res.status(204).end();
});

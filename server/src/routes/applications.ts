import type { ApplicationStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { planMove, type Columns } from "../services/applications/order.js";
import { computeStats } from "../services/applications/stats.js";

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

const STATUS = z.enum(["wishlist", "applied", "interview", "offer", "rejected"]);
const toDate = (s: string) => new Date(s + "T00:00:00Z");
const todayUtc = () => toDate(new Date().toISOString().slice(0, 10));

applicationsRouter.get("/", async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { userId: req.userId },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { events: true } }, cv: { select: { id: true, title: true } } },
  });
  res.json({ applications });
});

applicationsRouter.get("/stats", async (req, res) => {
  const [apps, events] = await Promise.all([
    prisma.application.findMany({
      where: { userId: req.userId },
      select: { id: true, status: true, appliedAt: true, createdAt: true },
    }),
    prisma.applicationEvent.findMany({
      where: { application: { userId: req.userId } },
      select: { applicationId: true, type: true, toStatus: true, occurredAt: true },
    }),
  ]);
  res.json({ stats: computeStats(apps, events, new Date()) });
});

applicationsRouter.get("/:id", async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      events: { orderBy: { occurredAt: "desc" } },
      cv: { select: { id: true, title: true } },
    },
  });
  if (!application) return res.status(404).json({ error: "Application not found" });
  res.json({ application });
});

const createSchema = z.object({
  company: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  location: z.string().max(200).nullish(),
  url: z.url().max(500).nullish().or(z.literal("").transform(() => null)),
  contactName: z.string().max(200).nullish(),
  contactEmail: z.email().nullish().or(z.literal("").transform(() => null)),
  notes: z.string().max(5000).nullish(),
  status: STATUS.default("wishlist"),
  appliedAt: z.iso.date().nullish(),
  cvId: z.string().nullish(),
});

async function ownCvOr400(userId: string, cvId: string | null | undefined): Promise<boolean> {
  if (!cvId) return true;
  const cv = await prisma.cv.findFirst({ where: { id: cvId, userId } });
  return cv !== null;
}

applicationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { appliedAt, status, cvId, ...fields } = parsed.data;
  if (!(await ownCvOr400(req.userId, cvId))) return res.status(400).json({ error: "Unknown CV" });

  const count = await prisma.application.count({ where: { userId: req.userId, status } });
  const application = await prisma.application.create({
    data: {
      userId: req.userId,
      ...fields,
      cvId: cvId ?? null,
      status,
      sortOrder: count,
      appliedAt: appliedAt ? toDate(appliedAt) : status === "applied" ? todayUtc() : null,
      events: { create: { type: "created", toStatus: status } },
    },
    include: { _count: { select: { events: true } }, cv: { select: { id: true, title: true } } },
  });
  res.status(201).json({ application });
});

const patchSchema = createSchema.partial();

/** Status-change side effects shared by PATCH and move: event log + appliedAt stamp. */
function statusChangeData(
  from: ApplicationStatus,
  to: ApplicationStatus,
  appliedAt: Date | null,
): Prisma.ApplicationUpdateInput {
  return {
    status: to,
    ...(to === "applied" && !appliedAt ? { appliedAt: todayUtc() } : {}),
    events: { create: { type: "status_change", fromStatus: from, toStatus: to } },
  };
}

applicationsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Application not found" });
  if (parsed.data.cvId !== undefined && !(await ownCvOr400(req.userId, parsed.data.cvId))) {
    return res.status(400).json({ error: "Unknown CV" });
  }

  const { status, appliedAt, ...fields } = parsed.data;
  const statusChanged = status !== undefined && status !== existing.status;

  const application = await prisma.$transaction(async (tx) => {
    if (statusChanged) {
      // append to the end of the target column, then compact the source column
      const targetCount = await tx.application.count({
        where: { userId: req.userId, status },
      });
      await tx.application.update({
        where: { id: existing.id },
        data: { ...statusChangeData(existing.status, status, existing.appliedAt), sortOrder: targetCount },
      });
      const source = await tx.application.findMany({
        where: { userId: req.userId, status: existing.status },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });
      for (const [i, row] of source.entries()) {
        await tx.application.update({ where: { id: row.id }, data: { sortOrder: i } });
      }
    }
    return tx.application.update({
      where: { id: existing.id },
      data: {
        ...fields,
        ...(appliedAt !== undefined ? { appliedAt: appliedAt ? toDate(appliedAt) : null } : {}),
      },
      include: { _count: { select: { events: true } }, cv: { select: { id: true, title: true } } },
    });
  });
  res.json({ application });
});

const moveSchema = z.object({
  status: STATUS,
  index: z.number().int().min(0),
});

applicationsRouter.patch("/:id/move", async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { status: toStatus, index } = parsed.data;

  const existing = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Application not found" });

  const involved = await prisma.application.findMany({
    where: { userId: req.userId, status: { in: [existing.status, toStatus] } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, status: true },
  });
  const columns: Columns = {};
  for (const row of involved) (columns[row.status] ??= []).push(row.id);

  const orders = planMove(columns, existing.id, existing.status, toStatus, index);
  await prisma.$transaction(async (tx) => {
    if (toStatus !== existing.status) {
      await tx.application.update({
        where: { id: existing.id },
        data: statusChangeData(existing.status, toStatus, existing.appliedAt),
      });
    }
    for (const col of orders) {
      for (const [i, id] of col.ids.entries()) {
        await tx.application.update({ where: { id }, data: { status: col.status, sortOrder: i } });
      }
    }
  });

  const applications = await prisma.application.findMany({
    where: { userId: req.userId },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { events: true } }, cv: { select: { id: true, title: true } } },
  });
  res.json({ applications });
});

const eventSchema = z.object({
  type: z.enum(["note", "interview", "follow_up"]),
  note: z.string().max(5000).nullish(),
  occurredAt: z.iso.datetime().optional(),
});

applicationsRouter.post("/:id/events", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!application) return res.status(404).json({ error: "Application not found" });

  const event = await prisma.applicationEvent.create({
    data: {
      applicationId: application.id,
      type: parsed.data.type,
      note: parsed.data.note ?? null,
      ...(parsed.data.occurredAt ? { occurredAt: new Date(parsed.data.occurredAt) } : {}),
    },
  });
  res.status(201).json({ event });
});

applicationsRouter.delete("/:id/events/:eventId", async (req, res) => {
  const event = await prisma.applicationEvent.findFirst({
    where: { id: req.params.eventId, applicationId: req.params.id, application: { userId: req.userId } },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });
  await prisma.applicationEvent.delete({ where: { id: event.id } });
  res.status(204).end();
});

applicationsRouter.delete("/:id", async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!application) return res.status(404).json({ error: "Application not found" });
  await prisma.application.delete({ where: { id: application.id } });
  res.status(204).end();
});

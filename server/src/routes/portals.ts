import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

// Quick links to application portals (GoAusbildung, Ausbildung.de, …).
// Links only — none of these platforms offer a public API, so there is no
// account sync; the roadmap tracks real integration if one ever ships.
export const portalsRouter = Router();
portalsRouter.use(requireAuth);

portalsRouter.get("/", async (req, res) => {
  const portals = await prisma.externalAccount.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ portals });
});

const portalSchema = z.object({
  label: z.string().trim().min(1).max(100),
  url: z.url().max(500),
});

portalsRouter.post("/", async (req, res) => {
  const parsed = portalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const portal = await prisma.externalAccount.create({
    data: { userId: req.userId, ...parsed.data },
  });
  res.status(201).json({ portal });
});

portalsRouter.patch("/:id", async (req, res) => {
  const parsed = portalSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const existing = await prisma.externalAccount.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Portal not found" });

  const portal = await prisma.externalAccount.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json({ portal });
});

// stamped when the user opens the portal from the app; feeds the
// "haven't checked X in a while" notification
portalsRouter.post("/:id/checked", async (req, res) => {
  const existing = await prisma.externalAccount.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Portal not found" });

  const portal = await prisma.externalAccount.update({
    where: { id: existing.id },
    data: { lastCheckedAt: new Date() },
  });
  res.json({ portal });
});

portalsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.externalAccount.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: "Portal not found" });

  await prisma.externalAccount.delete({ where: { id: existing.id } });
  res.status(204).end();
});

import { existsSync } from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { vaultFiles, vaultSync } from "../services/vault/sync.js";

export const vaultRouter = Router();
vaultRouter.use(requireAuth);

const linkSchema = z.object({ path: z.string().min(1) });

vaultRouter.post("/link", async (req, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const vaultPath = path.resolve(parsed.data.path.replace(/^~(?=\/)/, process.env.HOME ?? "~"));
  if (!existsSync(vaultFiles(vaultPath).master)) {
    return res.status(400).json({
      error: `No Vocab/master.md found under ${vaultPath} — point at the vault root (the folder you open in Obsidian)`,
    });
  }
  const count = await vaultSync.link(req.userId, vaultPath);
  res.json({ vaultPath, wordCount: count });
});

vaultRouter.post("/unlink", async (req, res) => {
  await vaultSync.unlink(req.userId);
  res.json({ ok: true });
});

vaultRouter.post("/sync", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.vaultPath) return res.status(400).json({ error: "No vault linked" });
  const count = await vaultSync.syncFromVault(user.id, user.vaultPath);
  await vaultSync.processInbox(user.id, user.vaultPath);
  res.json({ wordCount: count });
});

vaultRouter.get("/status", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const wordCount = await prisma.word.count({ where: { userId: req.userId } });
  res.json({
    vaultPath: user.vaultPath,
    wordCount,
    ...vaultSync.status(req.userId),
  });
});

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { signToken } from "../middleware/auth.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1).max(100),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.prettifyError(parsed.error) });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });
  res.status(201).json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name, vaultPath: user.vaultPath },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.prettifyError(parsed.error) });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name, vaultPath: user.vaultPath },
  });
});

// Temporary public "demo mode" for external site-analysis tools (PageSpeed
// Insights, GTmetrix) that crawl unauthenticated — see DEPLOYMENT.md. Only
// live when DEMO_MODE_ENABLED=true on the server; otherwise 404s exactly
// like a route that doesn't exist, rather than a deliberate-looking reject.
authRouter.post("/demo-login", async (req, res) => {
  if (!config.demoModeEnabled) return res.status(404).end();

  const user = await prisma.user.findUnique({ where: { email: config.demoUserEmail } });
  if (!user) return res.status(404).end(); // seed:demo hasn't been run yet

  res.json({
    token: signToken(user.id, { expiresIn: config.demoTokenExpiresIn }),
    user: { id: user.id, email: user.email, name: user.name, vaultPath: user.vaultPath },
    isDemo: true,
  });
});

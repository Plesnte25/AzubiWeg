import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { deviceLabel, hashDeviceToken, isTrustUsable, newDeviceToken, trustExpiry } from "../services/auth/trusted-device.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // "Trust this device" on the sign-in form: the response then carries a deviceToken for one-click sign-in
  trustDevice: z.boolean().optional(),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1).max(100),
});

const deviceTokenSchema = z.object({ deviceToken: z.string().min(20).max(200) });

type SessionUser = { id: string; email: string; name: string; vaultPath: string | null };
const publicUser = (u: SessionUser) => ({ id: u.id, email: u.email, name: u.name, vaultPath: u.vaultPath });

/** Starts trusting the requesting device for this user; returns the raw token, which only the client keeps. */
async function trustDevice(userId: string, req: Request): Promise<string> {
  const token = newDeviceToken();
  const now = new Date();
  await prisma.trustedDevice.create({
    data: { userId, tokenHash: hashDeviceToken(token), label: deviceLabel(req.get("user-agent")), expiresAt: trustExpiry(now) },
  });
  return token;
}

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
    user: publicUser(user),
    ...(parsed.data.trustDevice ? { deviceToken: await trustDevice(user.id, req) } : {}),
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
    user: publicUser(user),
    ...(parsed.data.trustDevice ? { deviceToken: await trustDevice(user.id, req) } : {}),
  });
});

/**
 * One-click sign-in from a trusted device. The token rotates on every use (the old one stops working), and the
 * 90-day trust window restarts. Two tabs racing with the same token: the second gets a 401 and falls back to the
 * password, which is acceptable for a personal app.
 */
authRouter.post("/device-login", async (req, res) => {
  const parsed = deviceTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const now = new Date();
  const device = await prisma.trustedDevice.findUnique({
    where: { tokenHash: hashDeviceToken(parsed.data.deviceToken) },
    include: { user: true },
  });
  if (!device || !isTrustUsable(device, now)) {
    if (device) await prisma.trustedDevice.delete({ where: { id: device.id } });
    return res.status(401).json({ error: "This device isn't trusted any more. Sign in with your password." });
  }

  const deviceToken = newDeviceToken();
  // conditional on the old hash, so a concurrent use of the same token can't rotate it twice
  const rotated = await prisma.trustedDevice.updateMany({
    where: { id: device.id, tokenHash: device.tokenHash },
    data: { tokenHash: hashDeviceToken(deviceToken), lastUsedAt: now, expiresAt: trustExpiry(now), label: deviceLabel(req.get("user-agent")) ?? device.label },
  });
  if (rotated.count === 0) {
    return res.status(401).json({ error: "This device isn't trusted any more. Sign in with your password." });
  }
  await prisma.user.update({ where: { id: device.userId }, data: { lastLoginAt: now } });
  res.json({ token: signToken(device.userId), user: publicUser(device.user), deviceToken });
});

/** Stops trusting one device. Holding its token is the authorization; unknown tokens are a silent no-op. */
authRouter.post("/device-forget", async (req, res) => {
  const parsed = deviceTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  await prisma.trustedDevice.deleteMany({ where: { tokenHash: hashDeviceToken(parsed.data.deviceToken) } });
  res.status(204).end();
});

/** Stops trusting every device of the signed-in user (e.g. after losing a phone). */
authRouter.post("/devices/revoke-all", requireAuth, async (req, res) => {
  const { count } = await prisma.trustedDevice.deleteMany({ where: { userId: req.userId } });
  res.json({ revoked: count });
});

// Demo mode, for local development only (DEPLOYMENT.md §14): a short-lived
// session for the seeded demo account. Only live when DEMO_MODE_ENABLED=true;
// otherwise 404s exactly like a route that doesn't exist. Keep it off on the
// VPS; production client builds never call it anyway (main.tsx).
authRouter.post("/demo-login", async (req, res) => {
  if (!config.demoModeEnabled) return res.status(404).end();

  const user = await prisma.user.findUnique({ where: { email: config.demoUserEmail } });
  if (!user) return res.status(404).end(); // seed:demo hasn't been run yet

  res.json({
    token: signToken(user.id, { expiresIn: config.demoTokenExpiresIn }),
    user: publicUser(user),
    isDemo: true,
  });
});

import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { daysUntil, expiryStatus } from "../services/reminders.js";

// Computed on demand from data we actually have — there is no way to sync
// with the portals themselves (no public APIs), so these are the closest
// honest substitute: reminders to check portals, stale applications, and
// expiring documents.
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

/** Remind after a portal hasn't been opened from the app for this long. */
export const PORTAL_CHECK_DAYS = 7;
/** An active application with no event for this long counts as stale. */
export const STALE_APPLICATION_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysSince = (d: Date, now: Date) => Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);

notificationsRouter.get("/", async (req, res) => {
  const now = new Date();

  const [portals, activeApps, expiringItems] = await Promise.all([
    prisma.externalAccount.findMany({ where: { userId: req.userId } }),
    prisma.application.findMany({
      where: { userId: req.userId, status: { in: ["applied", "interview"] } },
      select: {
        id: true,
        company: true,
        position: true,
        status: true,
        updatedAt: true,
        events: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
    }),
    prisma.checklistItem.findMany({
      where: {
        userId: req.userId,
        status: { notIn: ["done", "not_applicable"] },
        expiresAt: { not: null },
      },
      select: { id: true, title: true, expiresAt: true },
    }),
  ]);

  const notifications: {
    id: string;
    type: "portal" | "application" | "document";
    title: string;
    detail: string;
    href: string;
  }[] = [];

  for (const portal of portals) {
    const last = portal.lastCheckedAt ?? portal.createdAt;
    const days = daysSince(last, now);
    if (days >= PORTAL_CHECK_DAYS) {
      notifications.push({
        id: `portal-${portal.id}`,
        type: "portal",
        title: `Check ${portal.label}`,
        detail: portal.lastCheckedAt
          ? `You haven't opened it from here in ${days} days — there may be updates waiting.`
          : "You haven't opened it from here yet — check for updates.",
        href: "/applications",
      });
    }
  }

  for (const app of activeApps) {
    const lastActivity = app.events[0]?.occurredAt ?? app.updatedAt;
    const days = daysSince(lastActivity, now);
    if (days >= STALE_APPLICATION_DAYS) {
      notifications.push({
        id: `app-${app.id}`,
        type: "application",
        title: `${app.company} — no movement in ${days} days`,
        detail:
          app.status === "interview"
            ? "Interview stage has been quiet — consider following up."
            : "Applied a while ago with no update — a polite follow-up can help.",
        href: "/applications",
      });
    }
  }

  for (const item of expiringItems) {
    const status = expiryStatus(item.expiresAt, now);
    if (status === "urgent" || status === "expired") {
      const days = daysUntil(item.expiresAt as Date, now);
      notifications.push({
        id: `doc-${item.id}`,
        type: "document",
        title: status === "expired" ? `${item.title} has expired` : `${item.title} expires soon`,
        detail:
          status === "expired"
            ? "Renew or replace this document."
            : `${days} day${days === 1 ? "" : "s"} left.`,
        href: "/checklist",
      });
    }
  }

  res.json({ notifications });
});

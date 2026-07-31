// Page-local deadline tiers (≤5 / ≤20 days) — deliberately distinct from
// the shared expiryStatus() helper (server/src/services/reminders.ts,
// urgent ≤14 / warn ≤60) used by the Dashboard and notifications, which
// serve a different "give me a heads-up" purpose than this page's tighter
// "what's actually due soon" badge.
export type DeadlineTier = "urgent" | "soon" | "fine";

/** Whole days from today (local calendar day) to an ISO @db.Date value (UTC midnight). */
export function daysUntil(expiresAtIso: string): number {
  const expiry = new Date(expiresAtIso);
  const expiryUtc = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiryUtc - todayUtc) / 86_400_000);
}

export function deadlineTier(days: number): DeadlineTier {
  if (days <= 5) return "urgent";
  if (days <= 20) return "soon";
  return "fine";
}

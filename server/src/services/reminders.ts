export type ExpiryStatus = "ok" | "warn" | "urgent" | "expired";

export const EXPIRY_URGENT_DAYS = 14;
export const EXPIRY_WARN_DAYS = 60;

const DAY_MS = 86_400_000;

/**
 * Whole days from `today` until `expiresAt`. Prisma returns @db.Date columns
 * as JS Dates at UTC midnight, so the stored date is read via UTC getters;
 * "today" is the user's local calendar day, read via local getters. Mixing
 * these any other way shifts the result by a day for anyone east of UTC.
 */
export function daysUntil(expiresAt: Date, today: Date): number {
  const expiry = Date.UTC(
    expiresAt.getUTCFullYear(),
    expiresAt.getUTCMonth(),
    expiresAt.getUTCDate(),
  );
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiry - now) / DAY_MS);
}

export function expiryStatus(expiresAt: Date | null, today: Date): ExpiryStatus | null {
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt, today);
  if (days < 0) return "expired";
  if (days <= EXPIRY_URGENT_DAYS) return "urgent";
  if (days <= EXPIRY_WARN_DAYS) return "warn";
  return "ok";
}

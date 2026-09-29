
/** UTC-safe date-offset arithmetic: `date + days` days, ignoring local time-of-day. */
export function addDaysUTC(base: Date, days: number): Date {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  );
}

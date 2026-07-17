// Streak math over DateTime instants. Uses LOCAL date getters like the review
// streak in routes/dashboard.ts — the app assumes server-local == user-local.
// (The UTC-getter pattern in services/reminders.ts applies only to @db.Date.)

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Consecutive days (ending today or yesterday) with at least one activity
 * timestamp. Activity earlier today isn't required to keep a streak alive —
 * yesterday counts, matching the review streak on the dashboard.
 */
export function computeDayStreak(timestamps: Date[], today: Date): number {
  const days = new Set(timestamps.map(localDateKey));
  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Heat level 0–4 from the day's Lernzeit; a day with activity but no tracked minutes (e.g. reviews synced from
 * Obsidian) still shows level 1. */
export function heatLevel(day: { activity: number; lernzeit: number }): number {
  const m = day.lernzeit;
  if (m >= 60) return 4;
  if (m >= 30) return 3;
  if (m >= 15) return 2;
  if (m > 0 || day.activity > 0) return 1;
  return 0;
}

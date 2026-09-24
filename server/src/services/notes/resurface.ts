import type { NoteCategory } from "@prisma/client";

/**
 * "Surfaced today" (Bento Notes): spaced repetition for notes. Grammar and Mistakes notes rotate; the others never
 * surface. A note enters the rotation due the day after it's written (or the day it's recategorised into a
 * rotating category), and each answer reschedules it:
 *
 * - "Show again": back tomorrow, and the ladder restarts.
 * - "Still know it": climbs the ladder — 14, 30, 60, then every 120 days. The first step is the README's literal
 *   "Nice · back in 2 weeks"; later toasts should read the returned due date.
 *
 * All dates are calendar days (Note.resurfaceDueAt is @db.Date), built at UTC midnight like the other @db.Date
 * writers.
 */

export const RESURFACING_CATEGORIES: ReadonlySet<NoteCategory> = new Set<NoteCategory>(["grammar", "mistakes"]);
export const KNOWN_LADDER_DAYS = [14, 30, 60, 120] as const;

export interface ResurfaceState {
  resurfaceDueAt: Date | null;
  resurfaceStep: number;
}

/** UTC midnight of `from`'s local calendar day, plus `days`. */
export function dayPlus(from: Date, days: number): Date {
  return new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate() + days));
}

/** State for a note that is (now) in `category`: joins the rotation tomorrow, or leaves it. Unchanged when the
 * note stays in (or out of) the rotation, so recategorising Grammar → Mistakes keeps its schedule. */
export function resurfaceForCategory(
  category: NoteCategory,
  current: ResurfaceState,
  now: Date = new Date(),
): ResurfaceState {
  const rotates = RESURFACING_CATEGORIES.has(category);
  if (rotates && current.resurfaceDueAt === null) return { resurfaceDueAt: dayPlus(now, 1), resurfaceStep: 0 };
  if (!rotates) return { resurfaceDueAt: null, resurfaceStep: 0 };
  return current;
}

export function nextResurface(
  current: ResurfaceState,
  outcome: "again" | "known",
  now: Date = new Date(),
): ResurfaceState {
  if (outcome === "again") return { resurfaceDueAt: dayPlus(now, 1), resurfaceStep: 0 };
  const step = Math.min(current.resurfaceStep, KNOWN_LADDER_DAYS.length - 1);
  return { resurfaceDueAt: dayPlus(now, KNOWN_LADDER_DAYS[step]!), resurfaceStep: current.resurfaceStep + 1 };
}

import type { SrState } from "./vault/format.js";

/**
 * Port of osrSchedule() from the obsidian-spaced-repetition plugin
 * (src/scheduling/algorithms/osr/note-scheduling.ts) with the plugin's
 * default settings, so schedules written here are interchangeable with ones
 * the plugin writes. The three real data points in the existing vault
 * (Easy→4,270 · Good→3,250 · Hard→1,230 on new cards) confirm the plugin
 * runs with load balancing on, whose code path rounds intervals to whole
 * days — we replicate the rounding but not the ±fuzz for intervals > 7 days
 * (that needs the plugin's due-date histogram; a deterministic date is still
 * a valid schedule for the plugin to pick up).
 */

export type Grade = "hard" | "good" | "easy";

const BASE_EASE = 250;
const MIN_EASE = 130;
const EASY_BONUS = 1.3;
const LAPSES_INTERVAL_CHANGE = 0.5;
const MAXIMUM_INTERVAL = 36525;
const INITIAL_INTERVAL = 1;

export interface PreviousSchedule {
  interval: number;
  ease: number;
  due: Date;
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function schedule(
  grade: Grade,
  previous: PreviousSchedule | null,
  today: Date = new Date(),
): SrState {
  // days the review is overdue (0 for new cards and on-time reviews)
  const delayedDays = previous
    ? Math.max(
        0,
        Math.floor(
          (toDateOnly(today).getTime() - toDateOnly(previous.due).getTime()) / 86_400_000,
        ),
      )
    : 0;

  let interval = Math.max(1, previous?.interval ?? INITIAL_INTERVAL);
  let ease = previous?.ease ?? BASE_EASE;

  if (grade === "easy") {
    ease += 20;
    interval = ((interval + delayedDays) * ease) / 100;
    interval *= EASY_BONUS;
  } else if (grade === "good") {
    interval = ((interval + delayedDays / 2) * ease) / 100;
  } else {
    ease = Math.max(MIN_EASE, ease - 20);
    interval = Math.max(1, (interval + delayedDays / 4) * LAPSES_INTERVAL_CHANGE);
  }

  interval = Math.round(interval); // load-balance path in the plugin
  interval = Math.min(interval, MAXIMUM_INTERVAL);

  const due = toDateOnly(today);
  due.setDate(due.getDate() + interval);

  return { due: formatLocalDate(due), interval, ease };
}

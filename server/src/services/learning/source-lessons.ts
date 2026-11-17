import type { StudySourceType, StudySourceUnitLabel } from "@prisma/client";
import { isStudyDay } from "./daily-plan.js";

/**
 * Source lessons on Today's ticket. Every study day, each source with "Daily lesson" on takes its next unfinished
 * lesson onto the ticket, budgeted at the source's minutes per lesson and counted toward the minutes goal like a
 * topic. An unfinished lesson rolls over like any task, so a source never has more than one lesson open; removing it
 * from the ticket skips that source for the rest of the day, and it comes back tomorrow. Pure; routes/roadmap.ts
 * does the writes.
 */

export type SourceType = StudySourceType;
export type UnitLabel = StudySourceUnitLabel;

/** Default minutes a lesson is budgeted at, by what it is: a Nicos Weg lesson is a short video plus exercises. */
export function defaultUnitMinutes(type: SourceType, unitLabel: UnitLabel): number {
  if (unitLabel === "pages") return 10;
  if (unitLabel === "chapters") return 30;
  switch (type) {
    case "course":
      return 25;
    case "youtube":
    case "video":
      return 15;
    case "audio":
      return 20;
    case "book":
      return 30;
    default:
      return 20;
  }
}

export function unitMinutes(source: { type: SourceType; unitLabel: UnitLabel; minutesPerUnit: number | null }): number {
  return source.minutesPerUnit ?? defaultUnitMinutes(source.type, source.unitLabel);
}

/** The ticket kind a lesson shows as: watching and listening are listening practice, books and articles reading. */
export function lessonSkill(type: SourceType): "listening" | "reading" | null {
  if (type === "youtube" || type === "video" || type === "audio" || type === "course") return "listening";
  if (type === "book" || type === "article") return "reading";
  return null;
}

export interface PlanUnit {
  id: string;
  position: number;
  completedAt: Date | null;
}

export interface PlanSource {
  id: string;
  dailyLesson: boolean;
  units: PlanUnit[];
}

export interface SourceTicketInput {
  sources: PlanSource[];
  restDay: boolean;
  /** Sources with a lesson task on today already (done, open or removed): they've had their lesson today. */
  onTodaySourceIds: Set<string>;
  /** Sources with an unfinished lesson task from an earlier day (it rolls over onto today): no second lesson. */
  openSourceIds: Set<string>;
}

/** The next unfinished lesson: the first by position. */
export function nextUnit<U extends PlanUnit>(units: U[]): U | null {
  let best: U | null = null;
  for (const u of units) if (!u.completedAt && (!best || u.position < best.position)) best = u;
  return best;
}

/** Which lessons to put on today: one per eligible source, in the given (source) order. */
export function planSourceLessons(input: SourceTicketInput): { sourceId: string; unitId: string }[] {
  if (input.restDay) return [];
  const out: { sourceId: string; unitId: string }[] = [];
  for (const source of input.sources) {
    if (!source.dailyLesson || input.onTodaySourceIds.has(source.id) || input.openSourceIds.has(source.id)) continue;
    const unit = nextUnit(source.units);
    if (unit) out.push({ sourceId: source.id, unitId: unit.id });
  }
  return out;
}

/** Ticket title: "Nicos Weg · 8. Nico hat ein Problem" (no number when the lesson title already carries one). */
export function lessonTitle(sourceTitle: string, unit: { position: number; title: string }): string {
  const numbered = /^(\d|lesson\b|lektion\b|episode\b|folge\b|chapter\b|kapitel\b)/i.test(unit.title.trim());
  return `${sourceTitle} · ${numbered ? unit.title.trim() : `${unit.position + 1}. ${unit.title.trim()}`}`;
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * When each remaining lesson comes up (YYYY-MM-DD), at one per study day: the first on `today` if today still has
 * room for it (a study day whose lesson isn't done yet), otherwise from the next study day. "When to watch" for the
 * Library's lesson list and the source's finish date.
 */
export function scheduleLessons(opts: {
  remaining: number;
  today: Date;
  studyDays: boolean[];
  /** Today's lesson for this source is already done (or removed), so the next one is tomorrow's. */
  doneToday: boolean;
}): string[] {
  const out: string[] = [];
  if (opts.remaining <= 0 || !opts.studyDays.some(Boolean)) return out;
  const day = new Date(opts.today);
  if (opts.doneToday || !isStudyDay(opts.studyDays, day)) day.setUTCDate(day.getUTCDate() + 1);
  while (out.length < opts.remaining) {
    if (isStudyDay(opts.studyDays, day)) out.push(dateKey(day));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return out;
}

import type { RoadmapSkill, RoadmapTaskType } from "@prisma/client";
import { daysUntil } from "../reminders.js";
import type { DefaultRoadmapDay } from "./roadmap-defaults.js";

const DAY_MS = 86_400_000;

/** UTC-safe date-offset arithmetic: `date + days` days, ignoring local time-of-day. */
export function addDaysUTC(base: Date, days: number): Date {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  );
}

export type DayStatus = "done" | "overdue" | "today" | "upcoming";

interface DayLike {
  date: Date;
  tasks: { completedAt: Date | null }[];
}

/** A day's own status — reflects only that day's own tasks, never carried-forward ones. */
export function dayStatus(day: DayLike, today: Date): DayStatus {
  const allDone = day.tasks.length > 0 && day.tasks.every((t) => t.completedAt !== null);
  if (allDone) return "done";
  const offset = daysUntil(day.date, today);
  if (offset < 0) return "overdue";
  if (offset === 0) return "today";
  return "upcoming";
}

interface TaskLike {
  id: string;
  completedAt: Date | null;
}

interface BacklogDayLike<T extends TaskLike> {
  id: string;
  date: Date;
  theme: string | null;
  tasks: T[];
}

export interface BacklogGroup<T extends TaskLike> {
  dayId: string;
  date: Date;
  theme: string | null;
  daysOverdue: number;
  tasks: T[];
}

/**
 * Groups every incomplete task by its originating (past) day, oldest first.
 * Shared by /today and /backlog so the two views can never diverge — this
 * function *is* the compounding-backlog behavior: a day's incomplete tasks
 * keep showing up here for as long as they're undone, with nothing written
 * to "carry" them forward.
 */
export function computeBacklog<T extends TaskLike>(
  days: BacklogDayLike<T>[],
  today: Date,
): BacklogGroup<T>[] {
  return days
    .map((day) => ({
      day,
      offset: daysUntil(day.date, today),
      incomplete: day.tasks.filter((t) => t.completedAt === null),
    }))
    .filter((d) => d.offset < 0 && d.incomplete.length > 0)
    .sort((a, b) => a.offset - b.offset)
    .map((d) => ({
      dayId: d.day.id,
      date: d.day.date,
      theme: d.day.theme,
      daysOverdue: -d.offset,
      tasks: d.incomplete,
    }));
}

interface ExistingDay {
  dayOffset: number;
  tasks: { title: string; completedAt: Date | null }[];
}

export interface ReseedDayPlan {
  dayOffset: number;
  theme: string;
  tasks: {
    sortOrder: number;
    type: RoadmapTaskType;
    skill: RoadmapSkill | null;
    title: string;
    description: string | null;
    completedAt: Date | null;
    syllabusItemId: string | null;
  }[];
}

const normalize = (title: string) => title.trim().toLowerCase();

/**
 * Pure diff for a content version bump: carries completions over by
 * (dayOffset, normalized title) match — but only for hand-authored tasks
 * (no syllabusItemId). Syllabus-linked tasks already carry the correct
 * completedAt straight from the live SyllabusItem (see
 * roadmap-generator.ts's buildUserRoadmapPlan), immune to title-rename
 * drift, so title-matching never applies to them. Dates are never part of
 * this plan — callers always re-derive `date = roadmapStartedAt +
 * dayOffset` themselves, so a reseed can never shift when a day falls.
 */
export function diffReseed(existingDays: ExistingDay[], newContent: DefaultRoadmapDay[]): ReseedDayPlan[] {
  const completedByKey = new Map<string, Date>();
  for (const day of existingDays) {
    for (const task of day.tasks) {
      if (task.completedAt) completedByKey.set(`${day.dayOffset}|${normalize(task.title)}`, task.completedAt);
    }
  }
  return newContent.map((day) => ({
    dayOffset: day.dayOffset,
    theme: day.theme,
    tasks: day.tasks.map((task, i) => ({
      sortOrder: i,
      type: task.type,
      skill: task.skill ?? null,
      title: task.title,
      description: task.description ?? null,
      syllabusItemId: task.syllabusItemId ?? null,
      completedAt: task.syllabusItemId
        ? (task.completedAt ?? null)
        : (completedByKey.get(`${day.dayOffset}|${normalize(task.title)}`) ?? null),
    })),
  }));
}

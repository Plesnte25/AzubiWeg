const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;

export interface RoadmapPace {
  plannedTasksPerDay: number;
  actualTasksPerDay: number;
  daysLeft: number;
}

/** Whole-plan pace for the Roadmap destination's right-column PACE card.
 * `planned` is fixed by the plan's own shape; `actual` reflects real progress
 * so far — neither depends on the exam target date (that's the Syllabus
 * route's job, see computeRoutePace below). */
export function computeRoadmapPace(params: {
  totalDays: number;
  totalTasks: number;
  tasksDone: number;
  daysElapsed: number;
}): RoadmapPace {
  const elapsed = Math.max(1, Math.min(params.daysElapsed, params.totalDays));
  return {
    plannedTasksPerDay: params.totalDays === 0 ? 0 : Math.round((params.totalTasks / params.totalDays) * 10) / 10,
    actualTasksPerDay: Math.round((params.tasksDone / elapsed) * 10) / 10,
    daysLeft: Math.max(0, params.totalDays - params.daysElapsed),
  };
}

export interface RoutePace {
  itemsPerWeek: number;
  projectedFinishDate: string | null;
  examTargetDate: string | null;
  weeksBehindPace: number | null;
}

/**
 * Syllabus destination's ROUTE PACE card — items/week is a recent-velocity
 * measure (last 4 weeks of completions), not a lifetime average, so it
 * reacts to a user speeding up or slowing down rather than smoothing over
 * months of history. `weeksBehindPace` is positive when the projected finish
 * lands after the exam target, negative when comfortably ahead; both are
 * null with no exam target set or no completions yet to project from.
 */
export function computeRoutePace(params: {
  remainingItems: number;
  recentCompletions: Date[];
  examTargetDate: Date | null;
  today: Date;
}): RoutePace {
  const windowStart = params.today.getTime() - WEEK_MS * 4;
  const recentCount = params.recentCompletions.filter((d) => d.getTime() >= windowStart).length;
  const itemsPerWeek = Math.round((recentCount / 4) * 10) / 10;

  const projectedFinishDate =
    itemsPerWeek > 0
      ? new Date(params.today.getTime() + (params.remainingItems / itemsPerWeek) * WEEK_MS).toISOString().slice(0, 10)
      : null;

  let weeksBehindPace: number | null = null;
  if (projectedFinishDate && params.examTargetDate) {
    const diffMs = new Date(projectedFinishDate).getTime() - params.examTargetDate.getTime();
    weeksBehindPace = Math.round(diffMs / WEEK_MS);
  }

  return {
    itemsPerWeek,
    projectedFinishDate,
    examTargetDate: params.examTargetDate ? params.examTargetDate.toISOString().slice(0, 10) : null,
    weeksBehindPace,
  };
}

export interface GoalFeasibility {
  /** items/week required to finish exactly on examTargetDate — null with no
   * target date, or 0 if the target date has already passed (nothing left
   * to plan for, not "infeasible fast"). */
  requiredItemsPerWeek: number | null;
  /** derived from studyCapacityMinutes/day and a flat per-item time
   * estimate — a ceiling on how many items/week the user's own stated
   * capacity can realistically sustain, not a promise they'll hit it. */
  sustainableItemsPerWeek: number;
  /** weekly minutes implied by requiredItemsPerWeek, for a "that's Xmin/day"
   * framing the UI can show next to the user's existing capacity setting. */
  requiredMinutesPerWeek: number | null;
  /** "on_track": required pace is at/under sustainable capacity.
   * "tight": required pace exceeds capacity by up to 50%.
   * "unrealistic": required pace exceeds capacity by more than 50%, or the
   * exam date has already passed with items still remaining.
   * null: no exam target date set, so there's nothing to assess yet. */
  verdict: "on_track" | "tight" | "unrealistic" | null;
}

// Matches the flat per-item time estimates already used for daily queue
// planning in roadmap.ts (study_source=20min, milestone_test=15min,
// everything else=10min) — a syllabus item review/exercise pass is closest
// to that "everything else" bucket, so 10 is the honest single number here
// rather than inventing a separate, unvalidated estimate.
const MINUTES_PER_ITEM = 10;

/**
 * Turns the exam target date + the user's own stated daily study capacity
 * into a plain feasibility read: "at your current pace and stated capacity,
 * is this deadline realistic?" Deliberately conservative — `sustainable`
 * reflects the capacity the user themselves picked, not an idealized max,
 * and the verdict never promises pass/fail on the exam itself (that's
 * goetheReadiness's job; this is purely about the calendar).
 */
export function computeGoalFeasibility(params: {
  remainingItems: number;
  examTargetDate: Date | null;
  studyCapacityMinutes: number;
  today: Date;
}): GoalFeasibility {
  const sustainableItemsPerWeek = Math.round(((params.studyCapacityMinutes * 7) / MINUTES_PER_ITEM) * 10) / 10;

  if (!params.examTargetDate || params.remainingItems === 0) {
    return {
      requiredItemsPerWeek: null,
      sustainableItemsPerWeek,
      requiredMinutesPerWeek: null,
      verdict: null,
    };
  }

  const msLeft = params.examTargetDate.getTime() - params.today.getTime();
  if (msLeft <= 0) {
    return {
      requiredItemsPerWeek: params.remainingItems,
      sustainableItemsPerWeek,
      requiredMinutesPerWeek: params.remainingItems * MINUTES_PER_ITEM,
      verdict: "unrealistic",
    };
  }

  const weeksLeft = msLeft / WEEK_MS;
  const requiredItemsPerWeek = Math.round((params.remainingItems / weeksLeft) * 10) / 10;
  const requiredMinutesPerWeek = Math.round(requiredItemsPerWeek * MINUTES_PER_ITEM);

  let verdict: GoalFeasibility["verdict"];
  if (requiredItemsPerWeek <= sustainableItemsPerWeek) verdict = "on_track";
  else if (requiredItemsPerWeek <= sustainableItemsPerWeek * 1.5) verdict = "tight";
  else verdict = "unrealistic";

  return { requiredItemsPerWeek, sustainableItemsPerWeek, requiredMinutesPerWeek, verdict };
}

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

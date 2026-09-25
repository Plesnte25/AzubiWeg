/** Settings → Capacity: minutes a day, 10–180 in steps of 5. */
export const MIN_CAPACITY = 10;
export const MAX_CAPACITY = 180;
export const isValidCapacity = (m: number) => Number.isInteger(m) && m >= MIN_CAPACITY && m <= MAX_CAPACITY && m % 5 === 0;

/** Whether the local date is one of the user's study days (`studyDays` runs Monday → Sunday). */
export function isStudyDay(studyDays: boolean[], date: Date): boolean {
  return studyDays[(date.getDay() + 6) % 7] ?? true;
}

/** Minutes a roadmap task is budgeted at (tickets and the Today route show "Kind · N min"). */
export function taskEstimateMinutes(type: "generic" | "vocab" | "study_source" | "milestone_test"): number {
  return type === "study_source" ? 20 : type === "milestone_test" ? 15 : 10;
}

export interface PlannedTask {
  id: string;
  estimateMinutes: number;
  completedAt: Date | null;
  blocked?: boolean;
}

export function planDailyQueues(tasks: PlannedTask[], capacity: number) {
  const revisionMinutes = Math.min(20, Math.max(5, Math.round(capacity * 0.25)));
  const incomplete = tasks.filter((task) => task.completedAt === null && !task.blocked);
  const coreBudget = Math.max(0, capacity - revisionMinutes);
  const core: PlannedTask[] = [];
  let coreMinutes = 0;

  for (const task of incomplete) {
    if (core.length > 0 && coreMinutes + task.estimateMinutes > coreBudget) break;
    core.push(task);
    coreMinutes += task.estimateMinutes;
  }

  const coreIds = new Set(core.map((task) => task.id));
  const acceleration = incomplete.filter((task) => !coreIds.has(task.id));

  return {
    revisionMinutes,
    core,
    acceleration,
    coreMinutes,
    hasMore: acceleration.length > 0,
  };
}

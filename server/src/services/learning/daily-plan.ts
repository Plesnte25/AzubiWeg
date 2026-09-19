export const STUDY_CAPACITIES = [5, 20, 45, 90, 180, 330] as const;
export type StudyCapacity = (typeof STUDY_CAPACITIES)[number];

export interface PlannedTask {
  id: string;
  estimateMinutes: number;
  completedAt: Date | null;
  blocked?: boolean;
}

export function planDailyQueues(tasks: PlannedTask[], capacity: StudyCapacity) {
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

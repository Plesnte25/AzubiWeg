import type { RoadmapTask } from "../api/types";

/** Live elapsed seconds for a task's timer — the stored total plus whatever
 * has accrued since it was last started, if it's currently running. Mirrors
 * server/src/routes/roadmap.ts's own `liveTimerSeconds()` exactly, so a
 * ticking display and the server's own PATCH response never disagree. */
export function liveTimerSeconds(task: Pick<RoadmapTask, "timerSeconds" | "timerRunningSince">): number {
  if (!task.timerRunningSince) return task.timerSeconds;
  const since = new Date(task.timerRunningSince).getTime();
  return task.timerSeconds + Math.max(0, Math.floor((Date.now() - since) / 1000));
}

export function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Task stopwatch maths (RoadmapTask.timerSeconds + timerRunningSince), shared by the task PATCH route and anything
 * that reads a live total. Bento rule (README §4 "Timer rules"): one timer runs at a time app-wide — starting a task
 * banks the elapsed time of whichever other task was running.
 */

export interface TimerState {
  timerSeconds: number;
  timerRunningSince: Date | null;
}

/** Elapsed seconds right now: the stored total plus whatever has accrued since it was last started. */
export function liveTimerSeconds(task: TimerState, now: Date = new Date()): number {
  if (!task.timerRunningSince) return task.timerSeconds;
  return task.timerSeconds + Math.max(0, Math.floor((now.getTime() - task.timerRunningSince.getTime()) / 1000));
}

/** The paused state with the running time banked. No-op for a stopped timer. */
export function bankTimer(task: TimerState, now: Date = new Date()): TimerState {
  return { timerSeconds: liveTimerSeconds(task, now), timerRunningSince: null };
}

export interface TimerIntent {
  /** "Enter manually" / quick-add pills: the total is now exactly N (applied before `action`). */
  setSeconds?: number;
  action?: "start" | "pause" | "reset";
  /** Completing a task stops its timer (README Task modal: "Mark done stops the timer if it's this task"). */
  completing?: boolean;
}

/**
 * Folds one PATCH's timer intent into the next state. setSeconds is a correction to the base ("as of now, elapsed
 * is exactly X"), so a running timer restarts its segment from now; then start/pause/reset; then completion pauses.
 */
export function applyTimerIntent(task: TimerState, intent: TimerIntent, now: Date = new Date()): TimerState {
  let next: TimerState = { ...task };
  if (intent.setSeconds !== undefined) {
    next = { timerSeconds: intent.setSeconds, timerRunningSince: next.timerRunningSince ? now : null };
  }
  if (intent.action === "start") {
    if (!next.timerRunningSince) next = { ...next, timerRunningSince: now };
  } else if (intent.action === "pause") {
    next = bankTimer(next, now);
  } else if (intent.action === "reset") {
    next = { timerSeconds: 0, timerRunningSince: null };
  }
  if (intent.completing) next = bankTimer(next, now);
  return next;
}

/** True when this intent turns a stopped timer on, i.e. every other running timer must be banked. */
export function startsTimer(before: TimerState, after: TimerState): boolean {
  return !before.timerRunningSince && !!after.timerRunningSince;
}

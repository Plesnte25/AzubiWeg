import type { RoadmapSkill, RoadmapTask, RoadmapTaskType } from "../api/types";
import { SKILL_COLORS } from "./skills";

/** Minutes a roadmap task is budgeted at — mirror of server services/learning/daily-plan.ts taskEstimateMinutes(). */
export function taskEstimateMinutes(type: RoadmapTaskType): number {
  return type === "study_source" ? 20 : type === "milestone_test" ? 15 : 10;
}

/** Bento task-kind label (README §1.2): the skill, with milestone tests shown as "Self-test" and bureaucracy as
 * "Context". */
export const KIND_LABELS: Record<RoadmapSkill, string> = {
  vocab: "Vocab",
  grammar: "Grammar",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  milestone: "Self-test",
  bureaucracy: "Context",
  reflection: "Reflection",
};

export function taskKind(task: Pick<RoadmapTask, "skill" | "type">): { label: string; color: string } {
  if (task.skill) return { label: KIND_LABELS[task.skill], color: SKILL_COLORS[task.skill] };
  if (task.type === "milestone_test") return { label: "Self-test", color: "var(--lemon)" };
  if (task.type === "vocab") return { label: "Vocab", color: "var(--tomato)" };
  return { label: "Task", color: "var(--plain2)" };
}

/** Review estimate: ~20 seconds a card, at least a minute. */
export function reviewMinutes(cards: number): number {
  return Math.max(1, Math.round(cards / 3));
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Wed · 23 Sept" (English weekday, English month short; README date style). */
export function shortDate(d: Date): string {
  const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${wd} · ${d.getDate()} ${month === "Sep" ? "Sept" : month}`;
}

/** Whole days from today to `d` (local calendar days). */
export function daysUntil(d: Date): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** mm:ss (or h:mm:ss past an hour) for timers. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Live elapsed seconds of a task timer (stored total + the running segment). */
export function liveSeconds(task: { timerSeconds: number; timerRunningSince: string | null }, now = Date.now()): number {
  if (!task.timerRunningSince) return task.timerSeconds;
  return task.timerSeconds + Math.max(0, Math.floor((now - new Date(task.timerRunningSince).getTime()) / 1000));
}

import { localDateKey } from "../../lib/tasks";

export type Range = "7d" | "30d" | "1y";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

export interface LernzeitSeries {
  vals: number[];
  labels: string[];
  goal: number;
  unit: "min" | "h";
}

/** Bars for the range from per-day Lernzeit (date key → minutes). 1y sums calendar months, in hours. */
export function lernzeitSeries(byDay: Map<string, number>, range: Range, weeklyGoalMinutes: number): LernzeitSeries {
  const today = new Date();
  const dailyGoal = Math.round(weeklyGoalMinutes / 6);
  if (range === "1y") {
    const vals: number[] = [];
    const labels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const prefix = localDateKey(m).slice(0, 7);
      let sum = 0;
      for (const [key, min] of byDay) if (key.startsWith(prefix)) sum += min;
      vals.push(Math.round(sum / 6) / 10);
      labels.push(MONTHS[m.getMonth()]!);
    }
    // the weekly goal carried over an average month (52 weeks / 12)
    return { vals, labels, goal: Math.round((weeklyGoalMinutes * 52) / 12 / 60), unit: "h" };
  }
  const n = range === "7d" ? 7 : 30;
  const vals: number[] = [];
  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    vals.push(byDay.get(localDateKey(d)) ?? 0);
    labels.push(range === "7d" ? d.toLocaleDateString("en", { weekday: "short" }) : `${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }
  return { vals, labels, goal: dailyGoal, unit: "min" };
}

export interface WeekDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  minutes: number;
  status: "past" | "today" | "future";
}

export interface WeeklyGoal {
  goalMinutes: number;
  minutes: number;
  percent: number;
  /** Monday → Sunday, for the seven day dots. */
  days: WeekDay[];
}

/** "YYYY-MM-DD" + n days, calendar arithmetic (no timezone involved). */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** Monday of the week containing the local date `key`. */
export function mondayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y!, m! - 1, d)).getUTCDay() + 6) % 7; // 0 = Monday
  return addDaysKey(key, -weekday);
}

/**
 * Bento weekly goal: Lernzeit (learning-route minutes) this Monday–Sunday against minutes a day × study days
 * (Settings → Capacity). `lernzeitByDay`
 * maps local date → minutes (any days outside the week are ignored). The percent is capped at 100 for the ring;
 * `minutes` is the real total.
 */
export function weeklyGoal(capacityMinutes: number, studyDays: boolean[], lernzeitByDay: Map<string, number>, todayKey: string): WeeklyGoal {
  const monday = mondayKey(todayKey);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysKey(monday, i);
    return {
      date,
      minutes: lernzeitByDay.get(date) ?? 0,
      status: date < todayKey ? "past" : date === todayKey ? "today" : "future",
    };
  });
  const goalMinutes = capacityMinutes * studyDays.filter(Boolean).length;
  const minutes = days.reduce((sum, d) => sum + d.minutes, 0);
  return { goalMinutes, minutes, percent: goalMinutes === 0 ? 0 : Math.min(100, Math.round((minutes / goalMinutes) * 100)), days };
}

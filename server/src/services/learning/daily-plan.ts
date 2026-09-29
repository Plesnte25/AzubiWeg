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

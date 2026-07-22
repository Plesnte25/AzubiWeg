export type BadgeKey =
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "syllabus_a1_complete"
  | "syllabus_a2_complete"
  | "syllabus_b1_complete"
  | "milestone_week_8"
  | "milestone_week_16"
  | "milestone_week_25"
  | "milestone_week_26"
  | "perfect_days_7"
  | "perfect_days_30"
  | "vocab_100"
  | "vocab_500"
  | "reviews_500";

export interface BadgeDefinition {
  key: BadgeKey;
  label: string;
  description: string;
  points: number;
}

export const BADGE_DEFAULTS: BadgeDefinition[] = [
  { key: "streak_3", label: "3-Day Streak", description: "Studied 3 days in a row.", points: 10 },
  { key: "streak_7", label: "Week Streak", description: "Studied 7 days in a row.", points: 25 },
  { key: "streak_30", label: "Month Streak", description: "Studied 30 days in a row.", points: 100 },
  { key: "syllabus_a1_complete", label: "A1 Complete", description: "Finished the entire A1 syllabus.", points: 50 },
  { key: "syllabus_a2_complete", label: "A2 Complete", description: "Finished the entire A2 syllabus.", points: 75 },
  { key: "syllabus_b1_complete", label: "B1 Complete", description: "Finished the entire B1 syllabus.", points: 100 },
  { key: "milestone_week_8", label: "Milestone: Week 8", description: "Completed the Week 8 A1 milestone.", points: 20 },
  { key: "milestone_week_16", label: "Milestone: Week 16", description: "Completed the Week 16 A2 milestone.", points: 20 },
  { key: "milestone_week_25", label: "Milestone: Week 25", description: "Completed the Week 25 B1 milestone.", points: 30 },
  { key: "milestone_week_26", label: "Roadmap Complete", description: "Completed all 182 days of the roadmap.", points: 50 },
  { key: "perfect_days_7", label: "7 Perfect Days", description: "Completed every task on 7 different days.", points: 20 },
  { key: "perfect_days_30", label: "30 Perfect Days", description: "Completed every task on 30 different days.", points: 60 },
  { key: "vocab_100", label: "100 Words", description: "Added 100 vocabulary words.", points: 15 },
  { key: "vocab_500", label: "500 Words", description: "Added 500 vocabulary words.", points: 50 },
  { key: "reviews_500", label: "500 Reviews", description: "Completed 500 spaced-repetition reviews.", points: 40 },
];

// keyed by dayOffset, not title text — immune to milestone-week copy edits.
// base = (weekNumber - 1) * 7; the milestone_test task always lands on
// Saturday of its week (base + 5). Mirrors DEFAULT_ROADMAP_DAYS's
// buildMilestoneWeek calls in roadmap-defaults.ts (weeks 8/16/25/26).
export const MILESTONE_DAY_OFFSETS: Record<
  "milestone_week_8" | "milestone_week_16" | "milestone_week_25" | "milestone_week_26",
  number
> = {
  milestone_week_8: 54,
  milestone_week_16: 110,
  milestone_week_25: 173,
  milestone_week_26: 180,
};

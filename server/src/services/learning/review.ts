import type { RoadmapSkill } from "@prisma/client";
import type { LevelProgress, ProgressLevel } from "./progress.js";
import { levelStates } from "./progress.js";

export interface SkillTally {
  skill: RoadmapSkill;
  done: number;
  total: number;
}

export interface TopicWeakness {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

export interface ReviewSummary {
  vocabAdded: number;
  vocabReviewed: number;
  grammarCompleted: { id: string; title: string }[];
  tasksCompleted: number;
  tasksTotal: number;
  bySkill: SkillTally[];
  weakAreas: TopicWeakness[];
  // sum of minutesSpent across completed tasks in range — real, self-reported,
  // never estimated
  loggedMinutes: number;
  // how many of the completed tasks actually had a time logged, so the UI can
  // frame loggedMinutes honestly ("X of Y tasks logged") rather than implying
  // full coverage
  tasksWithLoggedTime: number;
}

/**
 * Pure aggregation over data the caller has already scoped to a date range
 * (a week or a month) via its own Prisma `where` clauses — same recipe
 * dashboard.ts already uses for its heatmap/streak (narrow `select`s, then
 * plain JS math). No I/O here, no new stored state.
 */
export function aggregateReview(input: {
  wordsAdded: number;
  reviewsCount: number;
  syllabusCompletions: { id: string; title: string }[];
  roadmapTasks: { skill: RoadmapSkill | null; completedAt: Date | null; minutesSpent: number | null }[];
  selfTestBreakdowns: { topic: string; correct: number; total: number }[];
}): ReviewSummary {
  const completedTasks = input.roadmapTasks.filter((t) => t.completedAt !== null);

  const skillTotals = new Map<RoadmapSkill, { done: number; total: number }>();
  for (const t of input.roadmapTasks) {
    if (!t.skill) continue;
    const entry = skillTotals.get(t.skill) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (t.completedAt !== null) entry.done += 1;
    skillTotals.set(t.skill, entry);
  }

  const topicTotals = new Map<string, { correct: number; total: number }>();
  for (const b of input.selfTestBreakdowns) {
    const entry = topicTotals.get(b.topic) ?? { correct: 0, total: 0 };
    entry.correct += b.correct;
    entry.total += b.total;
    topicTotals.set(b.topic, entry);
  }
  const weakAreas = [...topicTotals.entries()]
    .map(([topic, v]) => ({ topic, ...v, percent: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.percent - b.percent);

  return {
    vocabAdded: input.wordsAdded,
    vocabReviewed: input.reviewsCount,
    grammarCompleted: input.syllabusCompletions,
    tasksCompleted: completedTasks.length,
    tasksTotal: input.roadmapTasks.length,
    bySkill: [...skillTotals.entries()].map(([skill, v]) => ({ skill, ...v })),
    weakAreas,
    loggedMinutes: completedTasks.reduce((sum, t) => sum + (t.minutesSpent ?? 0), 0),
    tasksWithLoggedTime: completedTasks.filter((t) => t.minutesSpent !== null).length,
  };
}

export interface GoetheReadiness {
  level: ProgressLevel;
  syllabusPercent: number;
  avgRecentTestScore: number | null;
  trend: "up" | "down" | "flat" | null;
  readinessLabel: "not started" | "building" | "ready soon" | "exam ready";
}

/**
 * A heuristic, not a promise: combines current-level syllabus completion
 * with recent self-test scores at that level. `readinessLabel` must always be
 * presented in the UI as a rough indicator, never as an exam guarantee — this
 * app has no ground truth for what "exam ready" actually means.
 */
export function goetheReadiness(
  levels: LevelProgress[],
  recentResults: { score: number; total: number; level: ProgressLevel | null }[],
): GoetheReadiness {
  const states = levelStates(levels);
  const activeStateIdx = states.indexOf("active");
  // no "active" state means every level is done — point at the last (most
  // advanced) level rather than defaulting back to the first
  const activeIdx = activeStateIdx === -1 ? levels.length - 1 : activeStateIdx;
  const active = levels[activeIdx] ?? levels[0];
  const level = active.level;

  const percents = recentResults
    .filter((r) => r.level === level && r.total > 0)
    .map((r) => (r.score / r.total) * 100);
  const avgRecentTestScore =
    percents.length === 0 ? null : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);

  let trend: GoetheReadiness["trend"] = null;
  if (percents.length >= 2) {
    const mid = Math.ceil(percents.length / 2);
    const recentAvg = percents.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const olderAvg = percents.slice(mid).reduce((a, b) => a + b, 0) / (percents.length - mid);
    trend = recentAvg > olderAvg + 3 ? "up" : recentAvg < olderAvg - 3 ? "down" : "flat";
  }

  let readinessLabel: GoetheReadiness["readinessLabel"];
  if (active.percent === 0 && avgRecentTestScore === null) readinessLabel = "not started";
  else if (active.percent >= 100 && avgRecentTestScore !== null && avgRecentTestScore >= 70) readinessLabel = "exam ready";
  else if (active.percent >= 80 && avgRecentTestScore !== null && avgRecentTestScore >= 60) readinessLabel = "ready soon";
  else readinessLabel = "building";

  return { level, syllabusPercent: active.percent, avgRecentTestScore, trend, readinessLabel };
}

import { describe, expect, it } from "vitest";
import { aggregateReview, goetheReadiness } from "../src/services/learning/review.js";
import type { LevelProgress } from "../src/services/learning/progress.js";

describe("aggregateReview", () => {
  it("passes through simple counts unchanged", () => {
    const summary = aggregateReview({
      wordsAdded: 12,
      reviewsCount: 40,
      syllabusCompletions: [{ id: "a", title: "sein & haben" }],
      roadmapTasks: [],
      selfTestBreakdowns: [],
    });
    expect(summary.vocabAdded).toBe(12);
    expect(summary.vocabReviewed).toBe(40);
    expect(summary.grammarCompleted).toEqual([{ id: "a", title: "sein & haben" }]);
  });

  it("groups tasks by skill and counts completion", () => {
    const summary = aggregateReview({
      wordsAdded: 0,
      reviewsCount: 0,
      syllabusCompletions: [],
      roadmapTasks: [
        { skill: "writing", completedAt: new Date(), minutesSpent: 20, scheduledInRange: true, completedInRange: true },
        { skill: "writing", completedAt: null, minutesSpent: null, scheduledInRange: true, completedInRange: false },
        { skill: "speaking", completedAt: new Date(), minutesSpent: null, scheduledInRange: true, completedInRange: true },
        { skill: null, completedAt: new Date(), minutesSpent: 10, scheduledInRange: true, completedInRange: true }, // excluded from bySkill
      ],
      selfTestBreakdowns: [],
    });
    expect(summary.tasksTotal).toBe(4);
    expect(summary.tasksCompleted).toBe(3);
    expect(summary.bySkill).toEqual(
      expect.arrayContaining([
        { skill: "writing", done: 1, total: 2 },
        { skill: "speaking", done: 1, total: 1 },
      ]),
    );
  });

  it("only counts logged minutes from completed tasks, and tracks coverage honestly", () => {
    const summary = aggregateReview({
      wordsAdded: 0,
      reviewsCount: 0,
      syllabusCompletions: [],
      roadmapTasks: [
        { skill: "writing", completedAt: new Date(), minutesSpent: 20, scheduledInRange: true, completedInRange: true },
        { skill: "writing", completedAt: new Date(), minutesSpent: null, scheduledInRange: true, completedInRange: true }, // completed but no time logged
        { skill: "writing", completedAt: null, minutesSpent: 99, scheduledInRange: true, completedInRange: false }, // not completed — never counted
      ],
      selfTestBreakdowns: [],
    });
    expect(summary.loggedMinutes).toBe(20);
    expect(summary.tasksCompleted).toBe(2);
    expect(summary.tasksWithLoggedTime).toBe(1);
  });

  it("groups self-reported minutesSpent by (date, skill), ignoring tasks with no skill or no logged time", () => {
    const summary = aggregateReview({
      wordsAdded: 0,
      reviewsCount: 0,
      syllabusCompletions: [],
      roadmapTasks: [
        { skill: "grammar", completedAt: new Date("2026-07-20"), minutesSpent: 15, scheduledInRange: true, completedInRange: true },
        { skill: "grammar", completedAt: new Date("2026-07-20"), minutesSpent: 10, scheduledInRange: true, completedInRange: true }, // same day+skill, sums
        { skill: "vocab", completedAt: new Date("2026-07-20"), minutesSpent: 5, scheduledInRange: true, completedInRange: true },
        { skill: "grammar", completedAt: new Date("2026-07-21"), minutesSpent: 30, scheduledInRange: true, completedInRange: true }, // different day
        { skill: null, completedAt: new Date("2026-07-20"), minutesSpent: 40, scheduledInRange: true, completedInRange: true }, // no skill — excluded
        { skill: "speaking", completedAt: null, minutesSpent: null, scheduledInRange: true, completedInRange: false }, // no minutes — excluded
      ],
      selfTestBreakdowns: [],
    });
    expect(summary.dailyMinutesBySkill).toEqual(
      expect.arrayContaining([
        { date: "2026-07-20", skill: "grammar", minutes: 25 },
        { date: "2026-07-20", skill: "vocab", minutes: 5 },
        { date: "2026-07-21", skill: "grammar", minutes: 30 },
      ]),
    );
    expect(summary.dailyMinutesBySkill).toHaveLength(3);
  });

  it("aggregates self-test breakdowns across topics and sorts weakest first", () => {
    const summary = aggregateReview({
      wordsAdded: 0,
      reviewsCount: 0,
      syllabusCompletions: [],
      roadmapTasks: [],
      selfTestBreakdowns: [
        { topic: "Dative", correct: 2, total: 10 },
        { topic: "Dative", correct: 3, total: 10 }, // merges with the row above
        { topic: "Perfekt", correct: 9, total: 10 },
      ],
    });
    expect(summary.weakAreas).toEqual([
      { topic: "Dative", correct: 5, total: 20, percent: 25 },
      { topic: "Perfekt", correct: 9, total: 10, percent: 90 },
    ]);
  });
});

describe("goetheReadiness", () => {
  const levels = (a1: number, a2: number, b1: number): LevelProgress[] => [
    { level: "a1", total: 30, done: Math.round(30 * (a1 / 100)), percent: a1, nextUp: null },
    { level: "a2", total: 30, done: Math.round(30 * (a2 / 100)), percent: a2, nextUp: null },
    { level: "b1", total: 30, done: Math.round(30 * (b1 / 100)), percent: b1, nextUp: null },
  ];

  it("is 'not started' with no progress and no tests", () => {
    const r = goetheReadiness(levels(0, 0, 0), []);
    expect(r.level).toBe("a1");
    expect(r.readinessLabel).toBe("not started");
    expect(r.avgRecentTestScore).toBeNull();
  });

  it("targets the active (first incomplete) level, ignoring other levels' test history", () => {
    const r = goetheReadiness(levels(100, 40, 0), [
      { score: 9, total: 10, level: "a2" },
      { score: 1, total: 10, level: "a1" }, // a1 is done, shouldn't drag down a2's average
    ]);
    expect(r.level).toBe("a2");
    expect(r.avgRecentTestScore).toBe(90);
  });

  it("is 'exam ready' only with both full syllabus and a strong recent average", () => {
    const r = goetheReadiness(levels(100, 100, 100), [
      { score: 8, total: 10, level: "b1" },
      { score: 7, total: 10, level: "b1" },
    ]);
    expect(r.readinessLabel).toBe("exam ready");
  });

  it("is 'building' when syllabus is high but test scores are weak", () => {
    const r = goetheReadiness(levels(100, 100, 90), [{ score: 3, total: 10, level: "b1" }]);
    expect(r.readinessLabel).toBe("building");
  });

  it("detects an upward trend when recent scores beat older ones", () => {
    // a1 still active (50%) — most-recent-first: first two much higher than the last two
    const r = goetheReadiness(levels(50, 0, 0), [
      { score: 9, total: 10, level: "a1" },
      { score: 8, total: 10, level: "a1" },
      { score: 4, total: 10, level: "a1" },
      { score: 3, total: 10, level: "a1" },
    ]);
    expect(r.level).toBe("a1");
    expect(r.trend).toBe("up");
  });
});

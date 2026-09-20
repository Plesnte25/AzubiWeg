import { describe, expect, it } from "vitest";
import { planDailyQueues } from "../src/services/learning/daily-plan.js";
import { failedReview, isReviewDue, nextMastery } from "../src/services/learning/mastery.js";
import { summarizeMistakes } from "../src/services/learning/mistakes.js";
import { blockedTopicIds } from "../src/services/learning/prerequisites.js";

const task = (id: string, estimateMinutes: number, completedAt: Date | null = null) => ({ id, estimateMinutes, completedAt });

describe("planDailyQueues", () => {
  it("keeps revision first and fits core work to a short capacity", () => {
    const plan = planDailyQueues([task("one", 10), task("two", 10), task("three", 10)], 20);
    expect(plan.revisionMinutes).toBe(5);
    expect(plan.core.map((item) => item.id)).toEqual(["one"]);
    expect(plan.acceleration.map((item) => item.id)).toEqual(["two", "three"]);
  });

  describe("syllabus mastery", () => {
    it("passes a topic after the first successful exercise and schedules review", () => {
      const result = nextMastery(0);
      expect(result.masteryState).toBe("passed");
      expect(result.reviewDueAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("promotes a topic to mastered after a second successful review", () => {
      expect(nextMastery(1).masteryState).toBe("mastered");
    });

    it("shortens the next interval after recent failures", () => {
      const now = new Date("2026-01-01T00:00:00Z");
      expect(nextMastery(3, 0, now).reviewDueAt.toISOString()).toBe("2026-01-15T00:00:00.000Z");
      expect(nextMastery(3, 2, now).reviewDueAt.toISOString()).toBe("2026-01-04T00:00:00.000Z");
      expect(failedReview(now).toISOString()).toBe("2026-01-02T00:00:00.000Z");
    });

    it("caps failure backoff at the shortest review interval", () => {
      const now = new Date("2026-01-01T00:00:00Z");
      expect(nextMastery(0, 99, now).reviewDueAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    });

    it("marks only scheduled topics as due", () => {
      expect(isReviewDue("mastered", new Date("2020-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe(true);
      expect(isReviewDue("not_started", new Date("2020-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe(false);
    });
  });

  it("does not put completed tasks in either queue", () => {
    const plan = planDailyQueues([task("done", 10, new Date()), task("open", 10)], 45);
    expect(plan.core.map((item) => item.id)).toEqual(["open"]);
    expect(plan.acceleration).toHaveLength(0);
  });

  it("offers all remaining work as acceleration once the core budget is filled", () => {
    const plan = planDailyQueues([task("one", 10), task("two", 10), task("three", 10)], 5);
    expect(plan.core.map((item) => item.id)).toEqual(["one"]);
    expect(plan.hasMore).toBe(true);
  });

  it("blocks later topics until earlier topics in the same level pass", () => {
    expect([...blockedTopicIds([
      { id: "a", level: "a1", sortOrder: 1, masteryState: "not_started" },
      { id: "b", level: "a1", sortOrder: 2, masteryState: "not_started" },
      { id: "c", level: "a1", sortOrder: 3, masteryState: "passed" },
      { id: "d", level: "a2", sortOrder: 1, masteryState: "not_started" },
    ])]).toEqual(["b", "c"]);
  });

  it("groups mistake categories by frequency and keeps unique topic titles", () => {
    expect(summarizeMistakes([
      { mistakeCategory: "case", syllabusItem: { title: "Accusative objects" } },
      { mistakeCategory: "case", syllabusItem: { title: "Accusative objects" } },
      { mistakeCategory: "case", syllabusItem: { title: "Dative objects" } },
      { mistakeCategory: "gender_article", syllabusItem: { title: "Articles" } },
      { mistakeCategory: null, syllabusItem: { title: "Ignored" } },
    ])).toEqual([
      { category: "case", count: 3, topics: ["Accusative objects", "Dative objects"] },
      { category: "gender_article", count: 1, topics: ["Articles"] },
    ]);
  });

  it("keeps equal-frequency mistake categories in insertion order", () => {
    expect(summarizeMistakes([
      { mistakeCategory: "spelling", syllabusItem: { title: "A" } },
      { mistakeCategory: "case", syllabusItem: { title: "B" } },
    ])).toEqual([
      { category: "spelling", count: 1, topics: ["A"] },
      { category: "case", count: 1, topics: ["B"] },
    ]);
  });
});

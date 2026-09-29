import { describe, expect, it } from "vitest";
import { isStudyDay, isValidCapacity } from "../src/services/learning/daily-plan.js";
import { failedReview, isReviewDue, nextMastery } from "../src/services/learning/mastery.js";
import { summarizeMistakes } from "../src/services/learning/mistakes.js";

describe("Settings capacity", () => {
  it("accepts 10–180 minutes in steps of 5 only", () => {
    expect([10, 45, 95, 180].every(isValidCapacity)).toBe(true);
    expect([5, 12, 185, 330, 47.5].some(isValidCapacity)).toBe(false);
  });

  it("reads study days Monday → Sunday from a local date", () => {
    const noSaturday = [true, true, true, true, true, false, true];
    expect(isStudyDay(noSaturday, new Date(2026, 8, 26))).toBe(false); // Saturday
    expect(isStudyDay(noSaturday, new Date(2026, 8, 27))).toBe(true); // Sunday
    expect(isStudyDay(noSaturday, new Date(2026, 8, 21))).toBe(true); // Monday
  });
});

describe("mastery and mistakes", () => {
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

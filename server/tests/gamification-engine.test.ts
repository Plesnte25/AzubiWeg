import { describe, expect, it } from "vitest";
import { evaluateNewBadges } from "../src/services/gamification/engine.js";
import type { GamificationSnapshot } from "../src/services/gamification/engine.js";
import type { BadgeKey } from "../src/services/gamification/badge-defaults.js";

const baseSnapshot = (overrides: Partial<GamificationSnapshot> = {}): GamificationSnapshot => ({
  learningTimestamps: [],
  now: new Date("2026-07-22T12:00:00"),
  syllabusByLevel: {
    a1: { total: 30, done: 0 },
    a2: { total: 30, done: 0 },
    b1: { total: 30, done: 0 },
  },
  completedMilestoneDayOffsets: [],
  perfectDayCount: 0,
  vocabCount: 0,
  reviewCount: 0,
  ...overrides,
});

describe("evaluateNewBadges", () => {
  it("awards nothing when no thresholds are met", () => {
    expect(evaluateNewBadges(baseSnapshot(), new Set())).toEqual([]);
  });

  it("awards streak badges at 3/7/30 days, and only ones not already unlocked", () => {
    const timestamps = Array.from({ length: 7 }, (_, i) => {
      const d = new Date("2026-07-22T09:00:00");
      d.setDate(d.getDate() - i);
      return d;
    });
    const snapshot = baseSnapshot({ learningTimestamps: timestamps });
    const earned = evaluateNewBadges(snapshot, new Set());
    expect(earned.map((b) => b.key)).toEqual(expect.arrayContaining(["streak_3", "streak_7"]));
    expect(earned.map((b) => b.key)).not.toContain("streak_30");

    const alreadyHasStreak3 = evaluateNewBadges(snapshot, new Set<BadgeKey>(["streak_3"]));
    expect(alreadyHasStreak3.map((b) => b.key)).not.toContain("streak_3");
    expect(alreadyHasStreak3.map((b) => b.key)).toContain("streak_7");
  });

  it("awards a level-complete badge only when every item in that level is done", () => {
    const snapshot = baseSnapshot({
      syllabusByLevel: {
        a1: { total: 30, done: 30 },
        a2: { total: 30, done: 29 },
        b1: { total: 0, done: 0 }, // no items yet — must not false-positive as "complete"
      },
    });
    const earned = evaluateNewBadges(snapshot, new Set()).map((b) => b.key);
    expect(earned).toContain("syllabus_a1_complete");
    expect(earned).not.toContain("syllabus_a2_complete");
    expect(earned).not.toContain("syllabus_b1_complete");
  });

  it("awards the matching milestone badge by dayOffset", () => {
    const snapshot = baseSnapshot({ completedMilestoneDayOffsets: [54] });
    const earned = evaluateNewBadges(snapshot, new Set()).map((b) => b.key);
    expect(earned).toEqual(["milestone_week_8"]);
  });

  it("awards perfect-day and vocab/review count badges at their thresholds", () => {
    const snapshot = baseSnapshot({ perfectDayCount: 30, vocabCount: 500, reviewCount: 500 });
    const earned = evaluateNewBadges(snapshot, new Set()).map((b) => b.key);
    expect(earned).toEqual(
      expect.arrayContaining(["perfect_days_7", "perfect_days_30", "vocab_100", "vocab_500", "reviews_500"]),
    );
  });
});

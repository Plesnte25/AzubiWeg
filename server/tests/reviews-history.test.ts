import { describe, expect, it } from "vitest";
import { computeReviewStats, computeWeakWords } from "../src/services/reviews/history.js";
import type { ReviewLogRow } from "../src/services/reviews/history.js";

const log = (overrides: Partial<ReviewLogRow> & Pick<ReviewLogRow, "wordId" | "grade" | "reviewedAt">): ReviewLogRow => ({
  headword: "Wort",
  ...overrides,
});

describe("computeWeakWords", () => {
  it("keeps only words whose most recent grade is hard", () => {
    const logs: ReviewLogRow[] = [
      log({ wordId: "w1", grade: "hard", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "w1", grade: "good", reviewedAt: new Date("2026-07-10") }), // improved since
      log({ wordId: "w2", grade: "good", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "w2", grade: "hard", reviewedAt: new Date("2026-07-10") }), // regressed
    ];
    const result = computeWeakWords(logs, 20);
    expect(result.map((w) => w.wordId)).toEqual(["w2"]);
  });

  it("sorts by most-recently-reviewed first and respects the limit", () => {
    const logs: ReviewLogRow[] = [
      log({ wordId: "w1", grade: "hard", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "w2", grade: "hard", reviewedAt: new Date("2026-07-05") }),
      log({ wordId: "w3", grade: "hard", reviewedAt: new Date("2026-07-10") }),
    ];
    const result = computeWeakWords(logs, 2);
    expect(result.map((w) => w.wordId)).toEqual(["w3", "w2"]);
  });

  it("handles no logs", () => {
    expect(computeWeakWords([], 20)).toEqual([]);
  });
});

describe("computeReviewStats", () => {
  it("buckets reviews into today/this-week/total and tallies grades", () => {
    const now = new Date("2026-07-22T12:00:00");
    const logs = [
      { grade: "hard" as const, reviewedAt: new Date("2026-07-22T09:00:00"), intervalAfter: 1 },
      { grade: "good" as const, reviewedAt: new Date("2026-07-20T09:00:00"), intervalAfter: 3 },
      { grade: "easy" as const, reviewedAt: new Date("2026-01-01T09:00:00"), intervalAfter: 30 },
    ];
    const stats = computeReviewStats(logs, now);
    expect(stats.totalReviews).toBe(3);
    expect(stats.reviewsToday).toBe(1);
    expect(stats.reviewsThisWeek).toBe(2);
    expect(stats.gradeBreakdown).toEqual({ hard: 1, good: 1, easy: 1 });
    expect(stats.avgIntervalAfter).toBe(Math.round((1 + 3 + 30) / 3));
  });

  it("returns a null average with no logs", () => {
    const stats = computeReviewStats([], new Date());
    expect(stats.totalReviews).toBe(0);
    expect(stats.avgIntervalAfter).toBeNull();
  });
});

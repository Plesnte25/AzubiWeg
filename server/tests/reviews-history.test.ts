import { describe, expect, it } from "vitest";
import { computeReviewStats, computeWeakWords } from "../src/services/reviews/history.js";
import type { ReviewLogRow } from "../src/services/reviews/history.js";

const log = (overrides: Partial<ReviewLogRow> & Pick<ReviewLogRow, "wordId" | "grade" | "reviewedAt">): ReviewLogRow => ({
  headword: "Wort",
  ...overrides,
});

describe("computeWeakWords", () => {
  const word = (wordId: string, srInterval: number | null, leech = false) => ({ wordId, headword: wordId, srInterval, leech });

  it("keeps only shaky words (strength 1–2), not never-reviewed or solid ones", () => {
    const words = [word("fresh", null), word("solid", 30), word("short", 2), word("flagged", 30, true)];
    const result = computeWeakWords(words, [], 20);
    expect(result.map((w) => w.wordId).sort()).toEqual(["flagged", "short"]);
  });

  it("uses the latest grade: a hard last grade makes a long-interval word shaky, an older one doesn't", () => {
    const words = [word("w1", 12), word("w2", 12)];
    const logs: ReviewLogRow[] = [
      log({ wordId: "w1", grade: "hard", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "w1", grade: "good", reviewedAt: new Date("2026-07-05") }),
      log({ wordId: "w2", grade: "good", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "w2", grade: "hard", reviewedAt: new Date("2026-07-05") }),
    ];
    expect(computeWeakWords(words, logs, 20).map((w) => w.wordId)).toEqual(["w2"]);
  });

  it("sorts weakest first, then most-missed, then most recent, and respects the limit", () => {
    const words = [word("a", 2), word("b", 1), word("c", 2), word("d", 2)];
    const logs: ReviewLogRow[] = [
      log({ wordId: "b", grade: "hard", reviewedAt: new Date("2026-07-01") }),
      log({ wordId: "c", grade: "hard", reviewedAt: new Date("2026-07-02") }),
      log({ wordId: "c", grade: "good", reviewedAt: new Date("2026-07-03") }),
      log({ wordId: "a", grade: "good", reviewedAt: new Date("2026-07-04") }),
      log({ wordId: "d", grade: "good", reviewedAt: new Date("2026-07-06") }),
    ];
    const result = computeWeakWords(words, logs, 3);
    expect(result.map((w) => w.wordId)).toEqual(["b", "c", "d"]);
    expect(result[0]).toMatchObject({ strength: 1, hardCount: 1, lastGrade: "hard" });
  });

  it("returns an empty list for no words", () => {
    expect(computeWeakWords([], [], 20)).toEqual([]);
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

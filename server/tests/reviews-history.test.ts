import { describe, expect, it } from "vitest";
import { computeRetention, computeReviewAccuracy, computeReviewStats, computeWeakWords } from "../src/services/reviews/history.js";
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
    expect(stats.gradeBreakdown).toEqual({ again: 0, hard: 1, good: 1, easy: 1 });
    expect(stats.avgIntervalAfter).toBe(Math.round((1 + 3 + 30) / 3));
  });

  it("returns a null average with no logs", () => {
    const stats = computeReviewStats([], new Date());
    expect(stats.totalReviews).toBe(0);
    expect(stats.avgIntervalAfter).toBeNull();
  });
});

describe("computeReviewAccuracy", () => {
  it("scores good/easy share per trailing window", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);
    const logs = [
      { grade: "good" as const, reviewedAt: ago(1) },
      { grade: "hard" as const, reviewedAt: ago(2) },
      { grade: "easy" as const, reviewedAt: ago(20) },
      { grade: "hard" as const, reviewedAt: ago(200) },
    ];
    expect(computeReviewAccuracy(logs, now)).toEqual({ "7d": 50, "30d": 67, "1y": 50 });
    expect(computeReviewAccuracy([], now)).toEqual({ "7d": null, "30d": null, "1y": null });
  });
});

describe("computeRetention", () => {
  it("buckets by the real gap since the word's previous review", () => {
    const t = (d: number) => new Date(Date.UTC(2026, 0, 1) + d * 86_400_000);
    const logs = [
      { wordId: "a", grade: "good" as const, reviewedAt: t(0) },
      { wordId: "a", grade: "good" as const, reviewedAt: t(1) }, // 1-day gap, recalled
      { wordId: "a", grade: "hard" as const, reviewedAt: t(31) }, // 30-day gap, missed
      { wordId: "b", grade: "good" as const, reviewedAt: t(5) },
      { wordId: "b", grade: "easy" as const, reviewedAt: t(35) }, // 30-day gap, recalled
    ];
    expect(computeRetention(logs)).toEqual([
      { day: 1, percent: 100, samples: 1 },
      { day: 30, percent: 50, samples: 2 },
    ]);
  });
});

describe("again counts as a miss", () => {
  it("in accuracy, retention and the missed count", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    expect(computeReviewAccuracy([{ grade: "again" as const, reviewedAt: now }, { grade: "good" as const, reviewedAt: now }], now)["7d"]).toBe(50);
    const t = (d: number) => new Date(Date.UTC(2026, 0, 1) + d * 86_400_000);
    expect(computeRetention([{ wordId: "a", grade: "good" as const, reviewedAt: t(0) }, { wordId: "a", grade: "again" as const, reviewedAt: t(1) }])).toEqual([
      { day: 1, percent: 0, samples: 1 },
    ]);
    const weak = computeWeakWords(
      [{ wordId: "w", headword: "Termin", srInterval: 1, leech: false }],
      [{ wordId: "w", headword: "Termin", grade: "again", reviewedAt: t(2) }, { wordId: "w", headword: "Termin", grade: "hard", reviewedAt: t(1) }],
      5,
    );
    expect(weak[0]).toMatchObject({ hardCount: 2, strength: 1 });
  });
});

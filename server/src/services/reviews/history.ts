import type { Grade } from "@prisma/client";
import { isShaky, strength, type Strength } from "../vocab/classify.js";

export interface ReviewLogRow {
  wordId: string;
  headword: string;
  grade: Grade;
  reviewedAt: Date;
}

export interface WeakWordCandidate {
  wordId: string;
  headword: string;
  srInterval: number | null;
  leech: boolean;
}

export interface WeakWord {
  wordId: string;
  headword: string;
  strength: Strength;
  /** Times graded hard, all-time — the "6×" on the Stats shakiest-words tile. */
  hardCount: number;
  lastGrade: Grade | null;
  lastReviewedAt: Date | null;
}

/** Latest ReviewLog row per word. */
export function latestLogByWord<T extends { wordId: string; reviewedAt: Date }>(logs: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const log of logs) {
    const existing = latest.get(log.wordId);
    if (!existing || log.reviewedAt > existing.reviewedAt) latest.set(log.wordId, log);
  }
  return latest;
}

/**
 * The shaky words (strength 1–2, see `strength()` in services/vocab/classify.ts — the one app-wide definition),
 * weakest first, then most-missed, then most recently reviewed.
 */
export function computeWeakWords(words: WeakWordCandidate[], logs: ReviewLogRow[], limit: number): WeakWord[] {
  const latest = latestLogByWord(logs);
  const hardCounts = new Map<string, number>();
  for (const l of logs) if (l.grade === "hard") hardCounts.set(l.wordId, (hardCounts.get(l.wordId) ?? 0) + 1);

  return words
    .map((w) => {
      const last = latest.get(w.wordId) ?? null;
      return {
        wordId: w.wordId,
        headword: w.headword,
        strength: strength(w, last?.grade ?? null),
        hardCount: hardCounts.get(w.wordId) ?? 0,
        lastGrade: last?.grade ?? null,
        lastReviewedAt: last?.reviewedAt ?? null,
      };
    })
    .filter((w) => isShaky(w.strength))
    .sort(
      (a, b) =>
        a.strength - b.strength ||
        b.hardCount - a.hardCount ||
        (b.lastReviewedAt?.getTime() ?? 0) - (a.lastReviewedAt?.getTime() ?? 0),
    )
    .slice(0, limit);
}

export interface ReviewStats {
  totalReviews: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  gradeBreakdown: Record<Grade, number>;
  avgIntervalAfter: number | null;
}

export function computeReviewStats(
  logs: { grade: Grade; reviewedAt: Date; intervalAfter: number }[],
  now: Date,
): ReviewStats {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const gradeBreakdown: Record<Grade, number> = { hard: 0, good: 0, easy: 0 };
  let reviewsToday = 0;
  let reviewsThisWeek = 0;
  let intervalSum = 0;
  for (const log of logs) {
    gradeBreakdown[log.grade]++;
    intervalSum += log.intervalAfter;
    if (log.reviewedAt >= startOfToday) reviewsToday++;
    if (log.reviewedAt >= startOfWeek) reviewsThisWeek++;
  }

  return {
    totalReviews: logs.length,
    reviewsToday,
    reviewsThisWeek,
    gradeBreakdown,
    avgIntervalAfter: logs.length === 0 ? null : Math.round(intervalSum / logs.length),
  };
}

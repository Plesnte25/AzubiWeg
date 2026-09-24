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

/** Stats hero accuracy: share of reviews graded good/easy in each trailing window (null with no reviews in it). */
export function computeReviewAccuracy(
  logs: { grade: Grade; reviewedAt: Date }[],
  now: Date,
): Record<"7d" | "30d" | "1y", number | null> {
  const windowPercent = (days: number) => {
    const since = now.getTime() - days * 86_400_000;
    const inWindow = logs.filter((l) => l.reviewedAt.getTime() >= since);
    if (inWindow.length === 0) return null;
    return Math.round((inWindow.filter((l) => l.grade !== "hard").length / inWindow.length) * 100);
  };
  return { "7d": windowPercent(7), "30d": windowPercent(30), "1y": windowPercent(365) };
}

/** Retention buckets on the Stats curve's x axis (day 1 · 7 · 14 · 30 · 60), by the real gap since the previous review. */
export const RETENTION_BUCKETS = [
  { day: 1, maxDays: 3 },
  { day: 7, maxDays: 10 },
  { day: 14, maxDays: 21 },
  { day: 30, maxDays: 45 },
  { day: 60, maxDays: Infinity },
] as const;

/**
 * Retention vs elapsed time: ReviewLog only stores the interval a grade produced, not the time since the word's
 * previous review, so each word's reviews are sorted and consecutive timestamps diffed; a review counts as recalled
 * unless graded hard. Buckets with no samples are left out.
 */
export function computeRetention(
  logs: { wordId: string; grade: Grade; reviewedAt: Date }[],
): { day: number; percent: number; samples: number }[] {
  const byWord = new Map<string, { grade: Grade; reviewedAt: Date }[]>();
  for (const l of logs) {
    const list = byWord.get(l.wordId) ?? [];
    list.push(l);
    byWord.set(l.wordId, list);
  }
  const buckets = RETENTION_BUCKETS.map(() => ({ recalled: 0, total: 0 }));
  for (const list of byWord.values()) {
    list.sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());
    for (let i = 1; i < list.length; i++) {
      const gapDays = (list[i]!.reviewedAt.getTime() - list[i - 1]!.reviewedAt.getTime()) / 86_400_000;
      const b = buckets[RETENTION_BUCKETS.findIndex((x) => gapDays <= x.maxDays)]!;
      b.total++;
      if (list[i]!.grade !== "hard") b.recalled++;
    }
  }
  return RETENTION_BUCKETS.map((x, i) => ({
    day: x.day,
    percent: buckets[i]!.total === 0 ? 0 : Math.round((buckets[i]!.recalled / buckets[i]!.total) * 100),
    samples: buckets[i]!.total,
  })).filter((b) => b.samples > 0);
}

import type { Grade } from "@prisma/client";

export interface ReviewLogRow {
  wordId: string;
  headword: string;
  grade: Grade;
  reviewedAt: Date;
}

export interface WeakWord {
  wordId: string;
  headword: string;
  lastGrade: Grade;
  lastReviewedAt: Date;
}

/** Most recent grade per word, filtered to the last-graded-hard ones — the
 * only honest reading of "mistakes" ReviewLog's shape supports (there's no
 * vocab/grammar/pronunciation category to slice by). */
export function computeWeakWords(logs: ReviewLogRow[], limit: number): WeakWord[] {
  const latestByWord = new Map<string, ReviewLogRow>();
  for (const log of logs) {
    const existing = latestByWord.get(log.wordId);
    if (!existing || log.reviewedAt > existing.reviewedAt) latestByWord.set(log.wordId, log);
  }
  return [...latestByWord.values()]
    .filter((l) => l.grade === "hard")
    .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime())
    .slice(0, limit)
    .map((l) => ({ wordId: l.wordId, headword: l.headword, lastGrade: l.grade, lastReviewedAt: l.reviewedAt }));
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

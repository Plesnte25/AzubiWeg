export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export type MasteryState = "not_started" | "learning" | "passed" | "mastered";

export function nextMastery(successfulAttempts: number, recentFailures = 0, now = new Date()): {
  masteryState: MasteryState;
  reviewDueAt: Date;
} {
  const nextAttempt = successfulAttempts + 1;
  const baseIndex = Math.min(nextAttempt - 1, REVIEW_INTERVAL_DAYS.length - 1);
  const interval = REVIEW_INTERVAL_DAYS[Math.max(0, baseIndex - Math.min(recentFailures, 2))]!;
  const reviewDueAt = new Date(now);
  reviewDueAt.setDate(reviewDueAt.getDate() + interval);
  return {
    masteryState: nextAttempt >= 2 ? "mastered" : "passed",
    reviewDueAt,
  };
}

export function failedReview(now = new Date()): Date {
  const reviewDueAt = new Date(now);
  reviewDueAt.setDate(reviewDueAt.getDate() + 1);
  return reviewDueAt;
}

export function isReviewDue(state: MasteryState, reviewDueAt: Date | null, now = new Date()) {
  return state !== "not_started" && reviewDueAt !== null && reviewDueAt <= now;
}

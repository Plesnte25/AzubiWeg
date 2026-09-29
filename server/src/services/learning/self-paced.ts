/**
 * Moving an account from the old 182-day calendar to the self-paced queue (plans/self-paced-queue.md). The calendar
 * wrote every day's tasks out in advance; the queue only keeps a log of what was actually taken. This decides, per
 * existing task, whether it's history worth keeping or pre-generated calendar content to delete. Shared by the lazy
 * per-user upgrade in routes/roadmap.ts and scripts/migrate-self-paced.ts (dry run / apply).
 */

export interface CleanupTask {
  id: string;
  title: string;
  syllabusItemId: string | null;
  completedAt: Date | null;
  droppedAt: Date | null;
  timerSeconds: number;
  minutesSpent: number | null;
  journalEntry: string | null;
  fileCount: number;
  noteCount: number;
}

export type CleanupReason = "completed" | "worked on" | "manual";

export interface CleanupPlan {
  keep: { id: string; reason: CleanupReason }[];
  delete: string[];
}

/** Title prefixes every calendar version generated ("Grammar: Dativ", "Reading: …"). Older roadmap/syllabus versions
 * left many of these without a syllabus link and with titles today's skeleton no longer has, so the prefix — not the
 * exact title — is what marks them as generated. Jobs' "Rehearse: …" and free-typed tasks don't match. */
export const GENERATED_PREFIXES = ["Grammar: ", "Vocab: ", "Reading: ", "Listening: ", "Speaking: ", "Writing: ", "Deutschland Context: "];

const isGenerated = (title: string, skeletonTitles: Set<string>) =>
  skeletonTitles.has(title) || GENERATED_PREFIXES.some((p) => title.startsWith(p));

/**
 * Keeps a task when it's real history (completed, timed, or has a journal entry, files or notes attached) or one the
 * user added themselves (not a skeleton title — `skeletonTitles` — and no generated prefix). Everything
 * else — untouched generated tasks, past or future, dropped or not — is deleted: syllabus work comes back from the
 * queue, and the calendar's filler/milestone tasks are gone for good.
 */
export function planSelfPacedCleanup(tasks: CleanupTask[], skeletonTitles: Set<string>): CleanupPlan {
  const plan: CleanupPlan = { keep: [], delete: [] };
  for (const t of tasks) {
    const reason: CleanupReason | null = t.completedAt
      ? "completed"
      : t.timerSeconds > 0 || (t.minutesSpent ?? 0) > 0 || !!t.journalEntry?.trim() || t.fileCount > 0 || t.noteCount > 0
        ? "worked on"
        : !t.syllabusItemId && !isGenerated(t.title, skeletonTitles) && !t.droppedAt
          ? "manual"
          : null;
    if (reason) plan.keep.push({ id: t.id, reason });
    else plan.delete.push(t.id);
  }
  return plan;
}

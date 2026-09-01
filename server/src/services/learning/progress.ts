export type ProgressLevel = "a1" | "a2" | "b1";

export const CEFR_LEVELS: ProgressLevel[] = ["a1", "a2", "b1"];

export interface ProgressItem {
  id: string;
  level: ProgressLevel;
  title: string;
  sortOrder: number;
  completedAt: Date | null;
}

export interface LevelProgress {
  level: ProgressLevel;
  total: number;
  done: number;
  percent: number;
  nextUp: { id: string; title: string } | null;
}

/** Per-level fill-chart data; always returns all levels in a1→b1 order. */
export function levelProgress(items: ProgressItem[]): LevelProgress[] {
  return CEFR_LEVELS.map((level) => {
    const inLevel = items
      .filter((i) => i.level === level)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const done = inLevel.filter((i) => i.completedAt !== null).length;
    const next = inLevel.find((i) => i.completedAt === null) ?? null;
    return {
      level,
      total: inLevel.length,
      done,
      percent: inLevel.length === 0 ? 0 : Math.round((done / inLevel.length) * 100),
      nextUp: next ? { id: next.id, title: next.title } : null,
    };
  });
}

export type LevelState = "done" | "active" | "locked";

/**
 * The levels are a sequential roadmap: the first level with items left is
 * "active", everything before it is "done", everything after is "locked".
 * Empty levels (unseeded syllabus) count as not-done so the first is active;
 * a fully completed roadmap is all "done".
 */
export function levelStates(levels: { total: number; percent: number }[]): LevelState[] {
  const activeIdx = levels.findIndex((l) => l.total === 0 || l.percent < 100);
  return levels.map((_, i) => {
    if (activeIdx === -1 || i < activeIdx) return "done";
    return i === activeIdx ? "active" : "locked";
  });
}

/**
 * Syllabus-100%-plus-passed-exam version of levelStates() — the real
 * sequential CEFR gate (ExamAttempt's own schema comment: "A pass unlocks
 * the next level"), used by the Syllabus screen (Phase 11 of the Nocturne
 * redesign) and the exam start/status routes, which both need to know
 * whether the *next* level is truly reachable, not just syllabus-complete.
 *
 * A deliberate, narrow addition rather than a change to levelStates()
 * itself: levelStates() has 5 other call sites (Dashboard's level badge,
 * the practice-quiz level picker, goetheReadiness, roadmap analytics) that
 * intentionally still use syllabus-only gating for now — reconciling all of
 * them to the real exam gate is a larger, separate pass, not in Phase 11's
 * scope (Plan + Syllabus + Sources).
 *
 * `examGate[i]` is `{ hasContent: false }` for a level with no authored exam
 * questions yet (only A1 has any as of this writing) — such a level can
 * never be gated, or finishing its syllabus would permanently lock the user
 * out with no way to ever pass a nonexistent exam.
 */
export function levelStatesWithExamGate(
  levels: { total: number; percent: number }[],
  examGate: ({ hasContent: false } | { hasContent: true; passed: boolean })[],
): LevelState[] {
  const doneIdx = levels.findIndex((l, i) => {
    const gate = examGate[i]!;
    return l.total === 0 || l.percent < 100 || (gate.hasContent && !gate.passed);
  });
  return levels.map((_, i) => {
    if (doneIdx === -1 || i < doneIdx) return "done";
    return i === doneIdx ? "active" : "locked";
  });
}

/** Completion percent for a study source; null when open-ended (no total). */
export function sourcePercent(completedUnits: number, totalUnits: number | null): number | null {
  if (totalUnits === null || totalUnits <= 0) return null;
  const ratio = Math.min(Math.max(completedUnits, 0), totalUnits) / totalUnits;
  return Math.round(ratio * 100);
}

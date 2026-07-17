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

/** Completion percent for a study source; null when open-ended (no total). */
export function sourcePercent(completedUnits: number, totalUnits: number | null): number | null {
  if (totalUnits === null || totalUnits <= 0) return null;
  const ratio = Math.min(Math.max(completedUnits, 0), totalUnits) / totalUnits;
  return Math.round(ratio * 100);
}

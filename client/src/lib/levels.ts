import type { LevelState } from "../api/types";

// client mirror of levelStates in server/src/services/learning/progress.ts:
// the levels are a sequential roadmap — first incomplete level is active,
// earlier ones done, later ones locked
export function levelStates(levels: { total: number; percent: number }[]): LevelState[] {
  const activeIdx = levels.findIndex((l) => l.total === 0 || l.percent < 100);
  return levels.map((_, i) => {
    if (activeIdx === -1 || i < activeIdx) return "done";
    return i === activeIdx ? "active" : "locked";
  });
}

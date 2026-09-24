import type { CefrLevel, StudySource, StudySourceType, SyllabusItem } from "../../../api/types";

/*
 * Plan journey model: a client port of server/src/services/learning/stations.ts (same keys, states and Level %
 * definition, so the journey and the dashboard agree) plus the source-type maps from AzubiPlanJourney.dc.html.
 */

export type StationState = "done" | "cur" | "locked" | "gate";

export interface Station {
  key: string;
  level: CefrLevel;
  theme: string;
  index: number;
  items: SyllabusItem[];
  total: number;
  passed: number;
  closed: boolean;
  skipped: boolean;
  state: StationState;
}

export const UNTHEMED = "More topics";
export const CHECKPOINT_AFTER = [7, 14, 21] as const;

export const stationKey = (level: CefrLevel, theme: string) => `${level}:${theme}`;
const isPassed = (s: SyllabusItem["masteryState"]) => s === "passed" || s === "mastered";

export function deriveStations(items: SyllabusItem[], level: CefrLevel): Station[] {
  const groups = new Map<string, SyllabusItem[]>();
  for (const item of items.filter((i) => i.level === level).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const theme = item.theme?.trim() || UNTHEMED;
    groups.set(theme, [...(groups.get(theme) ?? []), item]);
  }
  const stations: Station[] = [...groups.entries()].map(([theme, group], i) => ({
    key: stationKey(level, theme),
    level,
    theme,
    index: i + 1,
    items: group,
    total: group.length,
    passed: group.filter((g) => isPassed(g.masteryState)).length,
    closed: group.every((g) => isPassed(g.masteryState) || g.skippedAt !== null),
    skipped: group.every((g) => g.skippedAt !== null),
    state: "locked",
  }));
  let cur = false;
  stations.forEach((s, i) => {
    if (i === stations.length - 1 && stations.length > 1) s.state = "gate";
    else if (s.closed) s.state = "done";
    else if (!cur) {
      s.state = "cur";
      cur = true;
    }
  });
  return stations;
}

/** Level % — passed + mastered ÷ non-skipped items (same rule as the server). */
export function levelPercent(items: SyllabusItem[], level: CefrLevel): number {
  const counted = items.filter((i) => i.level === level && (i.skippedAt === null || isPassed(i.masteryState)));
  return counted.length === 0 ? 0 : Math.round((counted.filter((i) => isPassed(i.masteryState)).length / counted.length) * 100);
}

/** Score bands (README §1.2): ≥ 80 % mint · 65–79 % lemon · < 65 % tomato. */
export const band = (s: number) => (s >= 80 ? "var(--mint)" : s >= 65 ? "var(--lemon)" : "var(--tomato)");

export function isItemDone(item: SyllabusItem): boolean {
  return isPassed(item.masteryState) || item.completedAt !== null;
}

/** 1-based checkpoint number a station index sits right after, or null. */
export function checkpointAt(index: number): 1 | 2 | 3 | null {
  const i = CHECKPOINT_AFTER.indexOf(index as 7 | 14 | 21);
  return i >= 0 ? ((i + 1) as 1 | 2 | 3) : null;
}

// ── sources ──

export type SourceKind = "video" | "audio" | "book" | "course" | "article" | "link";

/** The prototype's six source kinds; the server's extra types fold into the nearest one. */
export function sourceKind(type: StudySourceType | string): SourceKind {
  if (type === "youtube" || type === "video") return "video";
  if (type === "audio") return "audio";
  if (type === "book") return "book";
  if (type === "course" || type === "nicos_weg" || type === "duolingo") return "course";
  if (type === "article") return "article";
  return "link";
}

export const SOURCE_COLOR: Record<SourceKind, string> = {
  video: "var(--tomato)",
  audio: "var(--sky)",
  book: "var(--lemon)",
  course: "var(--lilac)",
  article: "var(--mint)",
  link: "var(--pink)",
};

export const SOURCE_UNIT: Record<SourceKind, string> = { video: "ep", audio: "ep", book: "pages", course: "lessons", article: "parts", link: "" };

export function sourceProgress(s: StudySource): { done: number; total: number | null; pct: number; label: string } {
  const total = s.totalUnits;
  const pct = s.percent ?? (total ? Math.round((s.completedUnits / total) * 100) : 0);
  const unit = s.unitLabel;
  return { done: s.completedUnits, total, pct, label: total ? `${s.completedUnits}/${total} ${unit}` : `${s.completedUnits} ${unit}` };
}

const tokenize = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").split(" ").filter(Boolean));

/** Best-effort theme match (exact, else most shared words) — for linking a word's Themenfeld to a station. */
export function bestMatchingStation<T extends { theme: string }>(stations: T[], theme: string): T | null {
  const exact = stations.find((s) => s.theme === theme);
  if (exact) return exact;
  const want = tokenize(theme);
  const scored = stations
    .map((s) => ({ s, score: [...want].filter((t) => tokenize(s.theme).has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.s ?? null;
}

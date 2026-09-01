import type { SyllabusItem } from "../../api/types";

/** A "station" is every SyllabusItem sharing (level, theme), in seed order —
 * derived here, not a stored id (see server's SyllabusItem.skippedAt
 * comment). Shared by SyllabusPage (the route map itself) and RoadmapPage
 * (the week-theme card links back to whichever station the week's theme
 * matches). */
export interface Station {
  theme: string;
  items: SyllabusItem[];
}

/**
 * Groups by theme (first-seen order defines the station's position), not by
 * consecutive-run — items are normally already contiguous by theme in
 * sortOrder, but a custom "+Item" insert or a reseed can land one out of
 * strict sequence. A consecutive-only grouping would silently fragment that
 * theme into two separate stations, inflating the station count and
 * quietly skewing every index-based calculation downstream (route-line fill
 * percent, "you are at station N", item-mix counts) — grouping by theme
 * directly makes that class of bug structurally impossible.
 */
export function deriveStations(items: SyllabusItem[]): Station[] {
  const order: string[] = [];
  const byTheme = new Map<string, SyllabusItem[]>();
  for (const item of items) {
    const theme = item.theme ?? "Other";
    if (!byTheme.has(theme)) {
      byTheme.set(theme, []);
      order.push(theme);
    }
    byTheme.get(theme)!.push(item);
  }
  return order.map((theme) => ({ theme, items: byTheme.get(theme)! }));
}

export function stationStatus(station: Station): "done" | "skipped" | "current" | "ahead" {
  const allDone = station.items.every((i) => i.completedAt !== null);
  if (allDone) return "done";
  const allClosed = station.items.every((i) => i.completedAt !== null || i.skippedAt !== null);
  if (allClosed) return "skipped";
  return "current"; // resolved relative to other stations by the caller
}

const tokenize = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").split(" ").filter(Boolean));

/** Roadmap week themes and Syllabus station themes are authored somewhat
 * independently (different strings for the "same" topic in several places),
 * so an exact match often misses — best-effort word-overlap, same recipe as
 * the self-test notebook-linking matcher in routes/learning.ts. Used by
 * Plan.tsx's Week mode to link a week's theme back to its syllabus station. */
export function bestMatchingStation<T extends { theme: string }>(stations: T[], weekTheme: string): T | null {
  const exact = stations.find((s) => s.theme === weekTheme);
  if (exact) return exact;
  const weekTokens = tokenize(weekTheme);
  const scored = stations
    .map((s) => ({ station: s, score: [...weekTokens].filter((t) => tokenize(s.theme).has(t)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.station ?? null;
}

// Shared 5-step intensity-color convention for any minutes-based heatmap
// cell — previously duplicated identically in Dashboard.tsx's 7-day strip
// and Stats.tsx's 28-day streak grid; Stats' new 105-day activity heatmap
// (Phase 4) is a third consumer, so it's worth having in one place.
const COLORS = ["#20222f", "#423a6a", "#5d5294", "#796cbf", "#9184d9"];

export function heatmapIntensity(minutes: number): number {
  return minutes === 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 60 ? 3 : 4;
}

export function heatmapColor(minutes: number): string {
  return COLORS[heatmapIntensity(minutes)]!;
}

/** Same 5-step palette, bucketed for small event counts (e.g. reviews/day)
 * instead of minutes — the two are on very different scales, so they need
 * their own thresholds, not heatmapIntensity's minutes-based ones. */
export function countIntensity(count: number): number {
  return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 11 ? 3 : 4;
}

export function countColor(count: number): string {
  return COLORS[countIntensity(count)]!;
}

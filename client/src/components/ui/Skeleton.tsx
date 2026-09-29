import type { CSSProperties } from "react";

/*
 * Loading placeholders (KNOWN_ISSUES #10): dashed, softly pulsing tiles in the page's own grid, so a page shows its
 * shape while its queries load instead of a blank screen — or, worse, an empty state ("No words yet") that isn't
 * true. The pulse is `.skeleton` in index.css; reduced motion keeps it still. Screen readers get the grid's
 * aria-busy, not the placeholders.
 */

export function SkeletonTile({ style, radius = 24 }: { style?: CSSProperties; radius?: number }) {
  return <div aria-hidden="true" className="skeleton" style={{ border: "2.5px dashed var(--line)", background: "var(--plain2)", borderRadius: radius, minHeight: 0, minWidth: 0, ...style }} />;
}

/** Every distinct area name in a grid-template-areas string. */
export function areasOf(template: string): string[] {
  return [...new Set(template.replace(/"/g, " ").split(/\s+/).filter((a) => a && a !== "."))];
}

/** A page's grid (its own gridStyle) filled with one placeholder per area. */
export function SkeletonGrid({ style, areas, label }: { style: CSSProperties; areas: string[]; label: string }) {
  return (
    <div className="grid min-h-0 flex-1" style={style} aria-busy="true" aria-label={label}>
      {areas.map((a) => (
        <SkeletonTile key={a} style={{ gridArea: a }} />
      ))}
    </div>
  );
}

/** Placeholder rows for a list (words, cards, notes) while it loads. */
export function SkeletonRows({ count = 5, height = 52, gap = 8 }: { count?: number; height?: number; gap?: number }) {
  return (
    <div className="flex flex-col" style={{ gap }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTile key={i} radius={14} style={{ height }} />
      ))}
    </div>
  );
}

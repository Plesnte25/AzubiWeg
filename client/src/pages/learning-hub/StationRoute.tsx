import { useMemo, type RefObject } from "react";
import { Check, Lock, MapPin } from "lucide-react";
import { glidePageTo, glideScrollLeft } from "../../lib/useShelfPan";
import type { Station } from "./stations";
import { horizontalRouteLayout, verticalRouteLayout } from "./routeGeometry";

interface StationRouteProps {
  stations: Station[];
  currentIdx: number;
  orientation: "vertical" | "horizontal";
  /** Fed into the geometry's wander sequence so each level gets its own
   * fixed, reproducible path shape (see routeGeometry.ts's seededWander) —
   * pass the CEFR level, not a per-render random value. */
  seed: string;
  /** Horizontal orientation only — the scrollable strip's own ref (the same
   * one useShelfPan is wired to in the parent), used to glide-center a
   * clicked station before selecting it. */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onSelect: (theme: string) => void;
}

// matches glideScrollLeft/glidePageTo's own default duration in
// useShelfPan.ts — onSelect (which opens the detail panel) fires only after
// the centering glide finishes, so "road centers the station, then the
// panel opens" reads as a real sequence, not simultaneous
const GLIDE_DURATION = 320;

/**
 * The winding route path — one SVG (decorative, aria-hidden) plus checkpoint
 * buttons as real, focusable DOM elements positioned from the exact same
 * layout the path uses, so they can never drift apart from it. Container
 * sizing differs by orientation, not just "same idea rotated" — their fit
 * semantics are opposite:
 * - vertical (sm/md) must be fluid-width: the wrapper's aspect-ratio is
 *   forced to match the viewBox via inline style (Tailwind can't statically
 *   generate an interpolated arbitrary value), so `preserveAspectRatio`
 *   letterboxing can never happen and percentage math on the buttons is
 *   exact.
 * - horizontal (lg) is a real fixed pixel size matching the viewBox 1:1,
 *   same pattern the existing horizontal-scroll strip already uses — no
 *   CSS scaling means the percentage positions degenerate to exact pixels.
 *
 * Done segments render solid (with a subtle animated "flow" dash offset,
 * see index.css's --animate-flow); ahead segments render dashed and static
 * in a clearly visible mid-gray (--color-ink-300), not the near-invisible
 * --color-hairline token — RoadmapPage's now-deleted path used hairline for
 * its whole "upcoming" stretch and read as "the path stopped" rather than
 * "continues, not reached yet." Motion is deliberately reserved for done
 * segments only — animating the ahead segments would misleadingly suggest
 * "in progress."
 */
export function StationRoute({ stations, currentIdx, orientation, seed, scrollContainerRef, onSelect }: StationRouteProps) {
  const layout = useMemo(
    () => (orientation === "vertical" ? verticalRouteLayout(stations.length, seed) : horizontalRouteLayout(stations.length, seed)),
    [stations.length, orientation, seed],
  );
  const wrapperStyle =
    orientation === "vertical"
      ? { aspectRatio: `${layout.size.width} / ${layout.size.height}` }
      : { width: layout.size.width, height: layout.size.height };

  function handleSelect(theme: string, buttonEl: HTMLButtonElement, x: number) {
    if (orientation === "horizontal" && scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const target = Math.max(0, Math.min(x - container.clientWidth / 2, container.scrollWidth - container.clientWidth));
      glideScrollLeft(container, target);
    } else if (orientation === "vertical") {
      const rect = buttonEl.getBoundingClientRect();
      const target = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      glidePageTo(Math.max(0, target));
    }
    setTimeout(() => onSelect(theme), GLIDE_DURATION);
  }

  return (
    <div className="relative w-full" style={wrapperStyle}>
      {/* pointer-events-none: purely decorative, and its bounding box must
          never intercept a pointerdown meant for the horizontal strip's
          drag-to-pan listener (useShelfPan, wired on this component's
          scrollable ancestor at lg) */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${layout.size.width} ${layout.size.height}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {layout.segments.map((d, i) => {
          const isDone = i + 1 <= currentIdx;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              strokeWidth={3}
              strokeLinecap="round"
              stroke={isDone ? "var(--color-ok-600)" : "var(--color-ink-300)"}
              strokeDasharray={isDone ? "10 6" : "7 7"}
              className={isDone ? "animate-flow" : undefined}
            />
          );
        })}
      </svg>
      {stations.map((s, i) => {
        const status = i < currentIdx ? "done" : i === currentIdx ? "current" : "ahead";
        const done = s.items.filter((it) => it.completedAt !== null).length;
        const pos = layout.nodes[i]!;
        return (
          <button
            key={s.theme + i}
            onClick={(e) => handleSelect(s.theme, e.currentTarget, pos.x)}
            style={{ left: `${(pos.x / layout.size.width) * 100}%`, top: `${(pos.y / layout.size.height) * 100}%` }}
            className="group absolute flex w-[104px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl text-center transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label={`Station ${i + 1} of ${stations.length}: ${s.theme}, ${done}/${s.items.length} items${status === "current" ? ", current" : ""}`}
          >
            {/* hover/focus tooltip with the full un-truncated name — the
                label below is truncated at w-[104px], long theme names get
                cut off there; aria-label already carries the full text for
                screen readers, this is the sighted-hover equivalent */}
            <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-hairline bg-card px-2 py-1 text-xs font-medium text-ink-900 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {s.theme}
            </span>
            {status === "current" && (
              // a map-pin marker hovering over the current station, replacing
              // a plain "· here" text label — the familiar "you are here"
              // idiom from map apps, with a gentle continuous bounce
              <MapPin
                className="absolute -top-[30px] left-1/2 size-5 -translate-x-1/2 animate-bounce fill-brand-500 text-brand-700 drop-shadow-md"
                aria-hidden="true"
              />
            )}
            <span className="relative grid h-[22px] w-full place-items-center">
              {status === "current" && (
                // pulsing "radar" ring behind the current bead — a standard
                // live/active idiom (Tailwind's built-in animate-ping)
                <span className="absolute size-[22px] animate-ping rounded-full bg-brand-400 opacity-75" aria-hidden="true" />
              )}
              <span
                className={`relative grid place-items-center rounded-full border-4 border-card text-[10px] font-bold text-white ${
                  status === "done"
                    ? "size-4 bg-ok-600"
                    : status === "current"
                      ? "size-[22px] bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-50)]"
                      : "size-3.5 border-2 bg-card text-transparent"
                }`}
                style={status === "ahead" ? { borderColor: "var(--color-hairline)" } : undefined}
              >
                {status === "done" && <Check className="size-2.5" aria-hidden="true" />}
                {status === "current" && i + 1}
                {status === "ahead" && <Lock className="size-2 text-ink-300" aria-hidden="true" />}
              </span>
            </span>
            {/* opaque backdrop so the curve tucks visibly behind the label
                instead of showing through its transparent text — the path's
                stroke passes close to a node's own label at some wander
                positions, especially in the horizontal (lg) orientation
                where wander shares the label's own axis */}
            <span className="w-full rounded bg-card px-1">
              <span className={`block w-full truncate text-[11.5px] ${status === "current" ? "font-bold" : status === "ahead" ? "text-ink-400" : "text-ink-600"}`}>
                {s.theme}
              </span>
              <span className={`block text-[10.5px] ${status === "done" ? "text-ok-600" : status === "current" ? "font-semibold text-brand-500" : "text-ink-400"}`}>
                {done}/{s.items.length}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

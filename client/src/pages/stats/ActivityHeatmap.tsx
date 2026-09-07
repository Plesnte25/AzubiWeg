import { countColor } from "../../lib/heatmapColor";

/**
 * 105-day dual-series activity heatmap (Phase 4) — dashboard.ts's own
 * `heatmap` field was already fully computed for the Dashboard route but
 * never rendered anywhere; Stats reads the exact same `["dashboard"]`
 * query (shared react-query cache, no extra request if Dashboard's already
 * been visited this session). No design spec calls for a specific layout
 * here, so this follows the same "flat wrapping grid" convention this
 * app's own 7-day/28-day strips already use rather than a true weekday-
 * aligned calendar. Cell color = learning-activity count (the broader "were
 * you active at all" signal); a review day additionally gets a small
 * accent dot, since reviews and learning are two real, distinct series and
 * folding them into one color would lose one of them.
 */
export function ActivityHeatmap({ cells }: { cells: { date: string; reviews: number; learning: number }[] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          105-day activity
        </div>
        <div className="flex items-center gap-1.5 text-[9.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
          <span className="inline-block size-[6px] rounded-full" style={{ background: "#b5abfc" }} />
          reviewed that day
        </div>
      </div>
      <div className="mt-2.5 grid grid-flow-col grid-rows-7 gap-[3px]">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.date}: ${cell.learning} active event${cell.learning === 1 ? "" : "s"}, ${cell.reviews} review${cell.reviews === 1 ? "" : "s"}`}
            className="relative size-[9px] rounded-[2px]"
            style={{ background: countColor(cell.learning) }}
          >
            {cell.reviews > 0 && (
              <span className="absolute inset-0 m-auto size-[3px] rounded-full" style={{ background: "#b5abfc" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { Grade, Word } from "../../api/types";
import { chipColor, chipLabel } from "../../lib/wordDisplay";

/**
 * The desktop review layout's 1st pane (German Companion Desktop.dc.html
 * id="1c") — today's stack, progress, and a running grade breakdown.
 * `queue` is the real remaining-words order from useReviewSession (queue[0]
 * is always `current`), not a fabricated preview list.
 */
export function ReviewQueuePane({
  queue,
  total,
  sessionSize,
  progressPercent,
  done,
}: {
  queue: Word[];
  total: number;
  sessionSize: number;
  progressPercent: number;
  done: Record<Grade, number>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-[18px] pt-[18px] pb-3">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
          Session
        </div>
        <div className="mt-[5px] flex items-baseline justify-between">
          <div className="text-[18px] font-medium" style={{ letterSpacing: "-.02em" }}>
            Review queue
          </div>
          <div className="text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
            {sessionSize === 0 ? "—" : `${total + 1}/${sessionSize}`}
          </div>
        </div>
        <div className="mt-[11px] h-[5px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto px-3.5 pb-3.5">
        <div className="px-1.5 pt-2 pb-1 text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.35)" }}>
          This stack
        </div>
        {queue.map((w, i) => {
          const isCurrent = i === 0;
          return (
            <div
              key={w.id}
              className="flex items-center gap-[11px] rounded-[11px] p-[11px]"
              style={{
                background: isCurrent ? "linear-gradient(90deg,rgba(145,132,217,.16),rgba(145,132,217,.04))" : "#1c1f2c",
                boxShadow: isCurrent ? "inset 2px 0 0 #9184d9" : "none",
              }}
            >
              <div
                className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-[10px] font-medium"
                style={{ background: "rgba(233,233,237,.08)", color: chipColor(w) }}
              >
                {chipLabel(w)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{w.headword}</div>
                <div className="text-[10.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                  {isCurrent ? "now showing" : i === 1 ? "up next" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mx-3.5 mb-3.5 rounded-xl p-[13px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            Graded so far
          </div>
          <div className="mt-[9px] flex h-[7px] gap-[3px] overflow-hidden rounded-[4px]" style={{ background: "#292b31" }}>
            <div style={{ flex: done.easy, background: "#9184d9" }} />
            <div style={{ flex: done.good, background: "#796cbf" }} />
            <div style={{ flex: done.hard, background: "#5d5294" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[9.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
            <span>easy {done.easy}</span>
            <span>good {done.good}</span>
            <span>hard {done.hard}</span>
          </div>
        </div>
      )}
    </div>
  );
}

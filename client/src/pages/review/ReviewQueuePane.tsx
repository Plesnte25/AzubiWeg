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
        <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-brand-500)" }}>
          Session
        </div>
        <div className="mt-[5px] flex items-baseline justify-between">
          <div className="text-[18px] font-medium" style={{ letterSpacing: "-.02em" }}>
            Review queue
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-ink-400)" }}>
            {sessionSize === 0 ? "—" : `${total + 1}/${sessionSize}`}
          </div>
        </div>
        <div className="mt-[11px] h-[5px] overflow-hidden rounded-full" style={{ background: "var(--color-hairline-soft)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg,var(--color-brand-solid),var(--color-brand-700))" }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto px-3.5 pb-3.5">
        <div className="px-1.5 pt-2 pb-1 text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-600)" }}>
          This stack
        </div>
        {queue.map((w, i) => {
          const isCurrent = i === 0;
          return (
            <div
              key={w.id}
              className="flex items-center gap-[11px] rounded-[11px] p-[11px]"
              style={{
                background: isCurrent ? "linear-gradient(90deg,var(--color-brand-100),transparent)" : "var(--color-card)",
                boxShadow: isCurrent ? "inset 2px 0 0 var(--color-brand-500)" : "none",
              }}
            >
              <div
                className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-micro font-medium"
                style={{ background: "var(--color-hairline-soft)", color: chipColor(w) }}
              >
                {chipLabel(w)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{w.headword}</div>
                <div className="text-micro" style={{ color: "var(--color-ink-400)" }}>
                  {isCurrent ? "now showing" : i === 1 ? "up next" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mx-3.5 mb-3.5 rounded-xl p-[13px]" style={{ background: "var(--color-card)" }}>
          <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-600)" }}>
            Graded so far
          </div>
          <div className="mt-[9px] flex h-[7px] gap-[3px] overflow-hidden rounded-[4px]" style={{ background: "var(--color-hairline-soft)" }}>
            <div style={{ flex: done.easy, background: "var(--color-brand-500)" }} />
            <div style={{ flex: done.good, background: "var(--color-brand-600)" }} />
            <div style={{ flex: done.hard, background: "var(--color-brand-solid)" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-micro" style={{ color: "var(--color-ink-400)" }}>
            <span>easy {done.easy}</span>
            <span>good {done.good}</span>
            <span>hard {done.hard}</span>
          </div>
        </div>
      )}
    </div>
  );
}

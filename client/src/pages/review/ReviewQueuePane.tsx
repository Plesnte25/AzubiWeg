import type { Grade, Word } from "../../api/types";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Tile } from "../../components/ui/Tile";
import { articleChipStyle, articleLabel } from "../../lib/wordBento";

/** Easy / good / hard split as one stacked bar (mint · lemon · tomato) with counts. */
export function GradeBar({ done }: { done: Record<Grade, number> }) {
  const parts: [Grade, string][] = [
    ["easy", "var(--mint)"],
    ["good", "var(--lemon)"],
    ["hard", "var(--tomato)"],
  ];
  const shown = parts.filter(([g]) => done[g] > 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex overflow-hidden" style={{ height: 18, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)" }}>
        {shown.map(([g, color], i) => (
          <div key={g} style={{ flex: done[g], background: color, borderRight: i < shown.length - 1 ? "2.5px solid var(--line)" : "none" }} />
        ))}
      </div>
      <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 700 }}>
        <span>easy {done.easy}</span>
        <span>good {done.good}</span>
        <span>hard {done.hard}</span>
      </div>
    </div>
  );
}

/** lg review pane 1: the real remaining stack (queue[0] is the card on screen), progress and the grade split. */
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
    <Tile tilt={0.4} radius={24} className="flex h-full flex-col gap-3" style={{ padding: 18 }}>
      <div className="flex items-baseline justify-between">
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>Review stack</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{sessionSize === 0 ? "—" : `${total + 1}/${sessionSize}`}</span>
      </div>
      <ProgressBar value={progressPercent / 100} height={12} track="var(--plain2)" label="Session progress" />
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {queue.map((w, i) => (
          <div
            key={w.id}
            className="flex shrink-0 items-center gap-2.5"
            style={{
              padding: "8px 10px",
              borderRadius: 14,
              border: `2px solid ${i === 0 ? "var(--line)" : "var(--dash)"}`,
              background: i === 0 ? "var(--plain2)" : "transparent",
              boxShadow: i === 0 ? "3px 3px 0 var(--shadow)" : "none",
            }}
          >
            <span style={articleChipStyle(w)}>{articleLabel(w)}</span>
            <div className="min-w-0 flex-1">
              <div lang="de" className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                {w.headword}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--plainMuted)" }}>{i === 0 ? "now showing" : i === 1 ? "up next" : ""}</div>
            </div>
          </div>
        ))}
      </div>
      {total > 0 && <GradeBar done={done} />}
    </Tile>
  );
}

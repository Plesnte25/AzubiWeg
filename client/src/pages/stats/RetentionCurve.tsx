import { useMemo } from "react";
import type { ReviewHistoryEntry } from "../../api/types";

// day-gap buckets the curve plots retention across
const BUCKETS = [
  { maxDays: 3, label: "1" },
  { maxDays: 7, label: "7" },
  { maxDays: 14, label: "14" },
  { maxDays: 30, label: "30" },
  { maxDays: Infinity, label: "30+" },
];

// A textbook Ebbinghaus-shaped reference curve (not user data — a fixed
// illustrative baseline, same role as the handoff's dashed line) so the
// real line has something to read against.
const REFERENCE_RETENTION = [92, 74, 58, 42, 33];

interface RetentionPoint {
  bucketIndex: number;
  retainedPercent: number;
  sampleSize: number;
}

/**
 * Retention-vs-elapsed-time — real, derived from ReviewLog history:
 * ReviewLog only stores intervalAfter (the interval a grade produced), not
 * how long had actually passed since the word's previous review, so this
 * reconstructs that gap itself (sort each word's reviews chronologically,
 * diff consecutive timestamps), then buckets by that real gap and plots
 * the % that weren't graded "hard". No new endpoint — same entries every
 * other review-history display already fetches.
 */
export function computeRetentionCurve(entries: ReviewHistoryEntry[]): RetentionPoint[] {
  const byWord = new Map<string, ReviewHistoryEntry[]>();
  for (const e of entries) {
    const list = byWord.get(e.wordId) ?? [];
    list.push(e);
    byWord.set(e.wordId, list);
  }

  const buckets = BUCKETS.map(() => ({ retained: 0, total: 0 }));
  for (const list of byWord.values()) {
    const sorted = [...list].sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gapDays = (new Date(sorted[i]!.reviewedAt).getTime() - new Date(sorted[i - 1]!.reviewedAt).getTime()) / 86_400_000;
      const bucketIndex = BUCKETS.findIndex((b) => gapDays <= b.maxDays);
      if (bucketIndex === -1) continue;
      buckets[bucketIndex]!.total++;
      if (sorted[i]!.grade !== "hard") buckets[bucketIndex]!.retained++;
    }
  }

  return buckets
    .map((b, i) => ({ bucketIndex: i, retainedPercent: b.total === 0 ? 0 : Math.round((b.retained / b.total) * 100), sampleSize: b.total }))
    .filter((p) => p.sampleSize > 0);
}

const W = 300;
const H = 82;

function pathFor(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

export function RetentionCurve({ entries }: { entries: ReviewHistoryEntry[] }) {
  const real = useMemo(() => computeRetentionCurve(entries), [entries]);

  const toXY = (bucketIndex: number, percent: number) => ({
    x: (bucketIndex / (BUCKETS.length - 1)) * W,
    y: H - (percent / 100) * H,
  });

  const referencePath = pathFor(REFERENCE_RETENTION.map((p, i) => toXY(i, p)));
  const realPoints = real.map((p) => toXY(p.bucketIndex, p.retainedPercent));
  const realPath = pathFor(realPoints);
  const lastReal = real[real.length - 1];

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
          Retention
        </div>
        <span className="text-[10px]" style={{ color: "rgba(233,233,237,.4)" }}>
          you vs. forgetting
        </span>
      </div>
      {realPoints.length < 2 ? (
        <p className="mt-3 text-[12px]" style={{ color: "rgba(233,233,237,.4)" }}>
          Not enough review history yet to plot this.
        </p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H + 20}`} className="mt-1 h-[104px] w-full overflow-visible">
          <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(233,233,237,.12)" />
          <path d={referencePath} fill="none" stroke="#595d6c" strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={realPath} fill="none" stroke="#9184d9" strokeWidth={2.5} strokeLinecap="round" />
          {lastReal && (
            <>
              <circle cx={toXY(lastReal.bucketIndex, lastReal.retainedPercent).x} cy={toXY(lastReal.bucketIndex, lastReal.retainedPercent).y} r={4} fill="#161826" stroke="#b5abfc" strokeWidth={2} />
              <text
                x={Math.min(W - 60, toXY(lastReal.bucketIndex, lastReal.retainedPercent).x + 5)}
                y={Math.max(10, toXY(lastReal.bucketIndex, lastReal.retainedPercent).y - 6)}
                fill="#b5abfc"
                fontSize="10"
              >
                {lastReal.retainedPercent}% @ {BUCKETS[lastReal.bucketIndex]!.label}d
              </text>
            </>
          )}
          {BUCKETS.map((b, i) => (
            <text key={b.label} x={(i / (BUCKETS.length - 1)) * W} y={H + 16} fill="rgba(233,233,237,.35)" fontSize="9" textAnchor={i === 0 ? "start" : i === BUCKETS.length - 1 ? "end" : "middle"}>
              {b.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

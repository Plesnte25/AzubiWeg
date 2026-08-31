import { ClockCounterClockwise } from "@phosphor-icons/react";
import type { ReviewHistoryEntry, Word } from "../../api/types";
import { barColor, buildSparkline } from "../../lib/wordDisplay";

const GRADE_LABEL = { hard: "Hard", good: "Good", easy: "Easy" } as const;
const GRADE_COLOR = { hard: "#e4c4b6", good: "rgba(233,233,237,.55)", easy: "rgba(233,233,237,.55)" } as const;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function longDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Real per-word slice of GET /api/reviews/history (Phase 5's own note: no
 * new backend endpoint needed for this) — `entries` must already be
 * filtered to this word and can be in any order, sorted here. The "before
 * interval" shown per event is derived from the *previous* review's
 * intervalAfter (ReviewLog itself only persists the interval a grade
 * produced, not what it started from) — real data, not fabricated, but
 * unset for a word's first-ever review since there's no prior to derive it
 * from. */
export function ReviewHistoryCard({ word, entries }: { word: Word; entries: ReviewHistoryEntry[] }) {
  const chronological = [...entries].sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
  const recentSix = chronological.slice(-6);
  const bars = buildSparkline(chronological.map((e) => e.grade));
  const correctCount = chronological.filter((e) => e.grade !== "hard").length;
  const percentCorrect = chronological.length ? Math.round((correctCount / chronological.length) * 100) : null;

  const mostRecentFirst = [...chronological].reverse().slice(0, 3);

  // word.srDue is a raw @db.Date column, serialized as a UTC-midnight ISO
  // string ("2026-10-11T00:00:00.000Z") -- unlike Dashboard's examTargetDate
  // (which the server pre-formats to a plain YYYY-MM-DD for exactly this
  // reason), so it needs the UTC-getter treatment server/src/services/
  // reminders.ts's daysUntil() uses, not a local-midnight reconstruction --
  // that shifts the day backward for anyone west of UTC.
  const today = new Date();
  const due = word.srDue ? new Date(word.srDue) : null;
  const daysToDue = due
    ? Math.round(
        (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
          Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
          86_400_000,
      )
    : null;
  const dueLabel = due?.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
          <ClockCounterClockwise size={13} weight="regular" aria-hidden="true" />
          Review history
        </div>
        <span className="text-[10px]" style={{ color: "rgba(233,233,237,.4)" }}>
          {chronological.length === 0
            ? "No reviews yet"
            : `${chronological.length} review${chronological.length === 1 ? "" : "s"} · ${percentCorrect}% correct`}
        </span>
      </div>

      <div className="mt-2 flex h-[46px] items-end gap-2.5 pl-0.5">
        {bars.map((h, i) => {
          const entry = recentSix[i - (6 - recentSix.length)];
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <i className="block w-full rounded-[2px]" style={{ height: h, background: barColor(h) }} />
              <span className="text-[8.5px]" style={{ color: "rgba(233,233,237,.35)" }}>
                {entry ? shortDate(entry.reviewedAt) : ""}
              </span>
            </div>
          );
        })}
      </div>

      {mostRecentFirst.length > 0 && (
        <>
          <div
            className="mt-2.5 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(233,233,237,.1) 30px, rgba(233,233,237,.1) calc(100% - 30px), transparent)",
            }}
          />
          <div className="mt-2.5 flex flex-col gap-1.5 text-[12px]">
            {mostRecentFirst.map((e) => {
              const idx = chronological.indexOf(e);
              const before = idx > 0 ? chronological[idx - 1]!.intervalAfter : null;
              return (
                <div key={e.id} className="flex justify-between">
                  <span style={{ color: GRADE_COLOR[e.grade] }}>
                    {longDate(e.reviewedAt)} · {GRADE_LABEL[e.grade]}
                  </span>
                  <span style={{ color: "rgba(233,233,237,.4)" }}>
                    {before !== null ? `interval ${before} d → ${e.intervalAfter} d` : `interval → ${e.intervalAfter} d`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-2.5 flex items-center justify-between pt-0.5">
        <div className="text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          Next review
        </div>
        <div className="text-[13.5px] font-medium">
          {due === null
            ? "Not yet scheduled"
            : daysToDue !== null && daysToDue <= 0
              ? `due · ${dueLabel}`
              : `in ${daysToDue} day${daysToDue === 1 ? "" : "s"} · ${dueLabel}`}
        </div>
      </div>
    </div>
  );
}

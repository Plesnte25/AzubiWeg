import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, SealCheck } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Grade } from "../../api/types";
import { chipColor, findSlippingWord } from "../../lib/wordDisplay";
import { useNavStack } from "../../lib/navStack";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Session-complete summary — circular badge, grade breakdown, "the one
 * that keeps slipping" (real, via findSlippingWord() over the same review-
 * history data every other review display uses), streak/duration stats.
 * Rendered inline by ReviewSession.tsx once the queue empties (not a
 * separate route — both are transient, neither is ever a Back target, so
 * there's no navigation reason to split them). */
export function SessionDone({
  done,
  total,
  elapsedSeconds,
  onHome,
  onTakeTest,
}: {
  done: Record<Grade, number>;
  total: number;
  elapsedSeconds: number;
  onHome: () => void;
  onTakeTest: () => void;
}) {
  const { push } = useNavStack();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: historyData } = useQuery({ queryKey: ["reviews", "history", "sparkline"], queryFn: () => api.reviewHistory(200) });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });

  const firstTryPercent = total === 0 ? 0 : Math.round(((done.good + done.easy) / total) * 100);
  const slipping = historyData ? findSlippingWord(historyData.entries) : null;
  const slippingWord = slipping ? wordsData?.words.find((w) => w.id === slipping.wordId) : undefined;

  const ringOffset = total === 0 ? RING_CIRCUMFERENCE : RING_CIRCUMFERENCE * 0.11;

  return (
    <div className="flex flex-1 flex-col text-center">
      <div className="mt-4 grid place-items-center">
        <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
          <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="#292b31" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke="#9184d9"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <div className="grid size-[130px] place-items-center">
          <SealCheck size={42} weight="fill" style={{ color: "#b5abfc" }} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 text-[27px] font-medium" style={{ letterSpacing: "-.025em" }}>
        Stack cleared.
      </div>
      <div className="mt-1 text-[13.5px]" style={{ color: "rgba(233,233,237,.55)" }}>
        {total} card{total === 1 ? "" : "s"} in {formatDuration(elapsedSeconds)} · {firstTryPercent}% first-try
      </div>

      <div className="mt-[22px] grid grid-cols-3 gap-2 text-left">
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
          <div className="text-[20px] font-medium">{total}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            cards
          </div>
        </div>
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
          <div className="text-[20px] font-medium" style={{ color: "#b5abfc" }}>
            {dashboard?.streak ?? "—"}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            day streak
          </div>
        </div>
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
          <div className="text-[20px] font-medium">{formatDuration(elapsedSeconds)}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            duration
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-6 text-left">
          <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            How it went
          </div>
          <div className="flex h-[9px] gap-[3px] overflow-hidden rounded-[5px]" style={{ background: "#292b31" }}>
            <div style={{ flex: done.easy, background: "#9184d9" }} />
            <div style={{ flex: done.good, background: "#796cbf" }} />
            <div style={{ flex: done.hard, background: "#5d5294" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: "rgba(233,233,237,.45)" }}>
            <span>easy {done.easy}</span>
            <span>good {done.good}</span>
            <span>hard {done.hard}</span>
          </div>
        </div>
      )}

      {slipping && slippingWord && (
        <div className="mt-[22px] text-left">
          <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            The one that keeps slipping
          </div>
          <div className="flex items-center gap-2.5 rounded-xl px-[13px] py-3" style={{ background: "#20222f" }}>
            <div
              className="grid size-8 shrink-0 place-items-center rounded-[9px] text-[10.5px] font-medium"
              style={{ background: "rgba(233,233,237,.08)", color: chipColor(slippingWord) }}
            >
              {slippingWord.genus ?? slippingWord.wortart[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">{slipping.headword}</div>
              <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
                marked &ldquo;hard&rdquo; {slipping.streak} sessions running
              </div>
            </div>
            <button
              type="button"
              onClick={() => push("/review", { state: { words: [slippingWord] } })}
              className="text-[12px]"
              style={{ color: "#b5abfc" }}
            >
              drill
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto pb-4 text-left">
        <div className="mb-[11px] flex items-center gap-2.5 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          <CalendarCheck size={15} weight="regular" style={{ color: "rgba(233,233,237,.4)" }} aria-hidden="true" />
          {dashboard ? `${dashboard.dueToday} due right now` : "Nothing scheduled right now"}
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onHome}
            className="min-h-[46px] flex-1 rounded-[11px] border text-[14px] font-medium"
            style={{ borderColor: "rgba(233,233,237,.16)" }}
          >
            Home
          </button>
          <button
            type="button"
            onClick={onTakeTest}
            className="min-h-[46px] flex-[1.4] rounded-[11px] text-[15px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Take a test
          </button>
        </div>
      </div>
    </div>
  );
}

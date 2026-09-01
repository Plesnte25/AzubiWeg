import { NotePencil, XCircle } from "@phosphor-icons/react";
import { useNavStack } from "../../lib/navStack";

interface AnswerRecord {
  qid: string;
  topic: string;
  correct: boolean;
}

const RING_RADIUS = 53;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Practice self-test results — reskin of the handoff's sTestDone, distinct
 * from the real gating exam's TestDone.tsx: no pass/fail (self-tests never
 * gate anything), no "level unlocked" reward card (finishing a practice
 * test doesn't actually unlock exam content in this app — that's driven by
 * syllabus progress, see levelHasExamContent), and the handoff's "N misses
 * go back in tomorrow" card is replaced with the real, already-working
 * "review wrong answers now" flow instead of a scheduled requeue that
 * doesn't exist server-side.
 */
export function SelfTestDone({
  answers,
  byTopic,
  elapsedSeconds,
  onReviewWrong,
  onDone,
}: {
  answers: AnswerRecord[];
  byTopic: Map<string, { correct: number; total: number }>;
  elapsedSeconds: number;
  onReviewWrong: (() => void) | null;
  onDone: () => void;
}) {
  const { push } = useNavStack();
  const correctCount = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const ringOffset = RING_CIRCUMFERENCE * (1 - percent / 100);
  const wrongCount = total - correctCount;

  return (
    <div className="flex flex-1 flex-col text-center">
      <div className="mt-4 grid place-items-center">
        <svg width="146" height="146" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
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
            style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="grid size-[146px] place-items-center">
          <div>
            <div className="text-[42px] leading-none font-medium" style={{ letterSpacing: "-.04em" }}>
              {percent}%
            </div>
            <div className="mt-1.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "#b5abfc" }}>
              scored
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
          Test done.
        </div>
        <div className="mt-1.5 text-[13px]" style={{ color: "rgba(233,233,237,.6)" }}>
          {correctCount} of {total} correct · {formatClock(elapsedSeconds)}
        </div>
      </div>

      {byTopic.size > 0 && (
        <div className="mt-6 text-left">
          <div className="mb-2.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            By topic
          </div>
          <div className="flex flex-col gap-2.5">
            {[...byTopic.entries()].map(([topic, v]) => {
              const pct = Math.round((v.correct / v.total) * 100);
              return (
                <div key={topic}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span>{topic}</span>
                    <span style={{ color: "rgba(233,233,237,.5)" }}>
                      {v.correct}/{v.total}
                    </span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                    <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: pct >= 70 ? "#9184d9" : "#d19b86" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {onReviewWrong && (
        <button
          type="button"
          onClick={onReviewWrong}
          className="mt-5 rounded-xl p-3 text-left"
          style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.08)" }}
        >
          <div className="flex items-center gap-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            <XCircle size={13} weight="regular" aria-hidden="true" />
            {wrongCount} wrong
          </div>
          <div className="mt-1.5 text-[12.5px]" style={{ color: "#b5abfc" }}>
            Review them now →
          </div>
        </button>
      )}

      <div className="mt-auto flex gap-[9px] pb-4 pt-6">
        <button
          type="button"
          onClick={() => push("/plan/notes/edit/new", { state: { contextTag: "/Self-tests" } })}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-[7px] rounded-[11px] text-[14px] font-medium"
          style={{ background: "#20222f" }}
        >
          <NotePencil size={15} weight="regular" aria-hidden="true" />
          Note
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[48px] flex-[1.4] rounded-[11px] text-[15px] font-medium text-white"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

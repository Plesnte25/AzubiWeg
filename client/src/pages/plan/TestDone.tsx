import { CaretRight, Trophy } from "@phosphor-icons/react";
import type { ExamAttempt, ExamSection } from "../../api/types";

const SECTION_LABEL: Record<ExamSection, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  gender_drill: "Gender against the clock",
  listening: "Listening",
};
const SECTION_ORDER: ExamSection[] = ["vocabulary", "grammar", "gender_drill", "listening"];
const LEVEL_LABELS: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1" };
const NEXT_LEVEL: Record<string, string> = { a1: "A2", a2: "B1", b1: "B1" };

const RING_RADIUS = 53;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The exam-mode results screen (Phase 12). Shared conceptually with the
 * practice self-test's own results per the handoff ("scored" for practice
 * vs "passed" for the real exam) -- only the real gating exam actually
 * consumes this so far, since Phase 14 builds the practice MCQ/Fill-in-
 * blank flow this would also serve. The handoff's "N misses go back in"
 * card doesn't apply here: the real gating exam has a cooldown, not a
 * retry-tomorrow queue, so it's omitted rather than shown against data
 * that doesn't exist.
 */
export function TestDone({ attempt, onHome, onSeeNextLevel }: { attempt: ExamAttempt; onHome: () => void; onSeeNextLevel: () => void }) {
  const total = attempt.total ?? 0;
  const score = attempt.score ?? 0;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const passed = attempt.passed === true;
  const ringOffset = RING_CIRCUMFERENCE * (1 - percent / 100);
  const nextLevel = NEXT_LEVEL[attempt.level];

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
              {passed ? "passed" : "scored"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
          {passed ? `${LEVEL_LABELS[attempt.level]} exam passed.` : "Not quite there yet."}
        </div>
        <div className="mt-1.5 text-[13px]" style={{ color: "rgba(233,233,237,.6)" }}>
          {score} of {total} correct
          {!passed && " — try again once your cooldown clears"}
        </div>
      </div>

      {passed && nextLevel && (
        <div
          className="mt-6 flex items-center gap-3 rounded-[14px] p-3.5 text-left"
          style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}
        >
          <div className="grid size-[42px] shrink-0 place-items-center rounded-xl" style={{ background: "rgba(145,132,217,.18)" }}>
            <Trophy size={21} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] tracking-[.1em] uppercase" style={{ color: "#b5abfc" }}>
              Level unlocked
            </div>
            <div className="mt-0.5 text-[16px] font-medium">{nextLevel} is now open</div>
          </div>
          <CaretRight size={16} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
        </div>
      )}

      {attempt.sectionBreakdown && attempt.sectionBreakdown.length > 0 && (
        <div className="mt-6 text-left">
          <div className="mb-2.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            By section
          </div>
          <div className="flex flex-col gap-2.5">
            {SECTION_ORDER.map((s) => {
              const row = attempt.sectionBreakdown!.find((b) => b.section === s);
              if (!row || row.total === 0) return null;
              const pct = Math.round((row.correct / row.total) * 100);
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span>{SECTION_LABEL[s]}</span>
                    <span style={{ color: "rgba(233,233,237,.5)" }}>
                      {row.correct}/{row.total}
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

      <div className="mt-auto flex gap-[9px] pb-4 pt-6">
        <button type="button" onClick={onHome} className="min-h-[48px] flex-1 rounded-[11px] text-[14px] font-medium" style={{ background: "#20222f" }}>
          Home
        </button>
        {passed && nextLevel ? (
          <button
            type="button"
            onClick={onSeeNextLevel}
            className="min-h-[48px] flex-[1.4] rounded-[11px] text-[15px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            See {nextLevel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSeeNextLevel}
            className="min-h-[48px] flex-[1.4] rounded-[11px] text-[15px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Back to exam gate
          </button>
        )}
      </div>
    </div>
  );
}

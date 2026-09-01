import { CheckCircle, Timer, X, XCircle } from "@phosphor-icons/react";
import type { SessionQuestion } from "../../api/types";

type NotebookState = { status: "idle" | "saved" } | { status: "pick"; candidates: string[] };

function optionsFor(q: Extract<SessionQuestion, { type: "mcq" }> | Extract<SessionQuestion, { type: "true_false" }>): string[] {
  return q.type === "mcq" ? q.choices : ["Richtig", "Falsch"];
}

function isCorrectIndex(q: Extract<SessionQuestion, { type: "mcq" }> | Extract<SessionQuestion, { type: "true_false" }>, i: number): boolean {
  return q.type === "mcq" ? i === q.answerIndex : i === (q.answer ? 0 : 1);
}

/**
 * Multiple-choice / true-false question view — reskin of the handoff's
 * sMcq screen. true_false questions render through here too (a 2-option
 * pick is the same shape, no dedicated screen in the handoff); the
 * per-option "sub" caption and "Play the sentence" audio row are dropped —
 * neither exists in the real question bank (SessionQuestion has no
 * secondary caption or audio field).
 */
export function MCQView({
  question,
  qNum,
  qTotal,
  pipStates,
  clock,
  picked,
  answered,
  correct,
  feedbackBody,
  nextLabel,
  onPick,
  onNext,
  onClose,
  notebookState,
  onAdd,
  adding,
}: {
  question: Extract<SessionQuestion, { type: "mcq" }> | Extract<SessionQuestion, { type: "true_false" }>;
  qNum: number;
  qTotal: number;
  pipStates: ("correct" | "wrong" | "current" | "upcoming")[];
  clock: string;
  picked: number | null;
  answered: boolean;
  correct: boolean;
  feedbackBody: string;
  nextLabel: string;
  onPick: (i: number) => void;
  onNext: () => void;
  onClose: () => void;
  notebookState: NotebookState;
  onAdd: (theme?: string) => void;
  adding: boolean;
}) {
  const options = optionsFor(question);
  const keys = ["A", "B", "C", "D"];

  return (
    <div
      className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+20px)]"
      style={{ background: "radial-gradient(120% 46% at 50% 0%, #1f2236, #161826 62%)" }}
    >
      <div className="flex items-center gap-[11px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Leave test"
          className="grid size-[30px] place-items-center"
          style={{ color: "rgba(233,233,237,.55)" }}
        >
          <X size={19} weight="regular" aria-hidden="true" />
        </button>
        <div className="flex flex-1 gap-[3px]">
          {pipStates.map((s, i) => (
            <i
              key={i}
              className="h-1 flex-1 rounded-[2px] transition-colors duration-300"
              style={{
                background: s === "wrong" ? "rgba(209,155,134,.6)" : s === "correct" ? "#9184d9" : s === "current" ? "#b5abfc" : "#292b31",
              }}
            />
          ))}
        </div>
        <span className="flex shrink-0 items-center gap-[5px] text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          <Timer size={13} weight="regular" aria-hidden="true" />
          {clock}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-[7px]">
        <span className="rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ background: "#20222f", color: "rgba(233,233,237,.6)" }}>
          {question.type === "mcq" ? "Multiple choice" : "True or false"}
        </span>
        <span
          className="rounded-full px-2 py-[3px] text-[9.5px] font-medium"
          style={{ background: "rgba(145,132,217,.14)", color: "#b5abfc" }}
        >
          Question {qNum} of {qTotal}
        </span>
      </div>

      <div className="mt-3.5">
        <div className="text-[11px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          {question.topic}
        </div>
        <div className="mt-2.5 text-[23px] leading-[1.4] font-medium" style={{ letterSpacing: "-.02em" }}>
          {question.prompt}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-[9px]">
        {options.map((label, i) => {
          const isCorrect = isCorrectIndex(question, i);
          let border = "rgba(233,233,237,.16)";
          let bg = "transparent";
          let color = "#e9e9ed";
          let mark = 0;
          if (answered && isCorrect) {
            border = "#9184d9";
            bg = "rgba(145,132,217,.16)";
            color = "#d2cefd";
            mark = 1;
          } else if (answered && i === picked) {
            border = "rgba(209,155,134,.6)";
            bg = "rgba(209,155,134,.12)";
            color = "#e4c4b6";
            mark = 2;
          } else if (answered) {
            color = "rgba(233,233,237,.4)";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              className="flex w-full items-center gap-[11px] rounded-xl p-3.5 text-left text-[15px] transition-all duration-300"
              style={{ border: `1px solid ${border}`, background: bg, color }}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[11px]" style={{ background: "rgba(233,233,237,.08)" }}>
                {keys[i]}
              </span>
              <span className="flex-1">{label}</span>
              {mark !== 0 &&
                (mark === 2 ? (
                  <XCircle size={16} weight="regular" aria-hidden="true" />
                ) : (
                  <CheckCircle size={16} weight="regular" aria-hidden="true" />
                ))}
            </button>
          );
        })}
      </div>

      <div
        className="mt-4 rounded-xl p-[13px_15px] transition-all duration-300"
        style={{
          opacity: answered ? 1 : 0,
          transform: answered ? "none" : "translateY(8px)",
          pointerEvents: answered ? "auto" : "none",
          padding: "13px 15px",
          background: correct ? "rgba(145,132,217,.14)" : "rgba(209,155,134,.1)",
          boxShadow: `0 0 0 1px ${correct ? "rgba(145,132,217,.5)" : "rgba(209,155,134,.4)"}`,
        }}
      >
        <div className="flex items-start gap-[10px]">
          {correct ? (
            <CheckCircle size={18} weight="regular" style={{ color: "#b5abfc", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          ) : (
            <XCircle size={18} weight="regular" style={{ color: "#e4c4b6", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          )}
          <div>
            <div className="text-[13.5px] font-medium" style={{ color: correct ? "#b5abfc" : "#e4c4b6" }}>
              {correct ? "Correct" : "Not quite"}
            </div>
            <div className="mt-[3px] text-[12px] leading-[1.5]" style={{ color: "rgba(233,233,237,.65)" }}>
              {feedbackBody}
            </div>
          </div>
        </div>
        {answered && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {notebookState.status === "idle" && (
              <button type="button" disabled={adding} onClick={() => onAdd()} className="text-[11.5px] font-medium" style={{ color: "#b5abfc" }}>
                {adding ? "Saving…" : "Add to notebook"}
              </button>
            )}
            {notebookState.status === "saved" && (
              <span className="text-[11.5px]" style={{ color: "#9184d9" }}>
                Added to notebook
              </span>
            )}
            {notebookState.status === "pick" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                  Which station?
                </span>
                {notebookState.candidates.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => onAdd(theme)}
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ border: "1px solid rgba(233,233,237,.16)", color: "rgba(233,233,237,.75)" }}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <button
          type="button"
          disabled={!answered}
          onClick={onNext}
          className="min-h-[48px] w-full rounded-[11px] text-[15px] font-medium text-white transition-opacity duration-200 disabled:opacity-45"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

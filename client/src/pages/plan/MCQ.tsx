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
      className="flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+20px)] lg:mx-auto lg:max-w-[480px]"
      style={{ background: "radial-gradient(120% 46% at 50% 0%, var(--color-ink-50), var(--color-paper) 62%)" }}
    >
      <div className="flex items-center gap-[11px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Leave test"
          className="grid size-[30px] place-items-center"
          style={{ color: "var(--color-ink-600)" }}
        >
          <X size={19} weight="regular" aria-hidden="true" />
        </button>
        <div className="flex flex-1 gap-[3px]">
          {pipStates.map((s, i) => (
            <i
              key={i}
              className="h-1 flex-1 rounded-[2px] transition-colors duration-300"
              style={{
                background: s === "wrong" ? "var(--color-danger-600)" : s === "correct" ? "var(--color-brand-500)" : s === "current" ? "var(--color-brand-700)" : "var(--color-hairline-soft)",
              }}
            />
          ))}
        </div>
        <span className="flex shrink-0 items-center gap-[5px] text-[12px]" style={{ color: "var(--color-ink-400)" }}>
          <Timer size={13} weight="regular" aria-hidden="true" />
          {clock}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-[7px]">
        <span className="rounded-full px-2 py-[3px] text-micro font-medium" style={{ background: "var(--color-ink-50)", color: "var(--color-ink-600)" }}>
          {question.type === "mcq" ? "Multiple choice" : "True or false"}
        </span>
        <span
          className="rounded-full px-2 py-[3px] text-micro font-medium"
          style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
        >
          Question {qNum} of {qTotal}
        </span>
      </div>

      <div className="mt-3.5">
        <div className="text-[11px] tracking-[.1em] uppercase" style={{ color: "var(--color-ink-400)" }}>
          {question.topic}
        </div>
        <div className="mt-2.5 text-[23px] leading-[1.4] font-medium" style={{ letterSpacing: "-.02em" }}>
          {question.prompt}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-[9px]">
        {options.map((label, i) => {
          const isCorrect = isCorrectIndex(question, i);
          let border = "var(--color-hairline)";
          let bg = "transparent";
          let color = "var(--color-ink-900)";
          let mark = 0;
          if (answered && isCorrect) {
            border = "var(--color-brand-500)";
            bg = "var(--color-brand-100)";
            color = "var(--color-brand-800)";
            mark = 1;
          } else if (answered && i === picked) {
            border = "var(--color-danger-600)";
            bg = "var(--color-danger-100)";
            color = "var(--color-danger-700)";
            mark = 2;
          } else if (answered) {
            color = "var(--color-ink-400)";
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
              <span className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[11px]" style={{ background: "var(--color-hairline-soft)" }}>
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
          background: correct ? "var(--color-brand-50)" : "var(--color-danger-50)",
          boxShadow: `0 0 0 1px ${correct ? "var(--color-brand-500)" : "var(--color-danger-600)"}`,
        }}
      >
        <div className="flex items-start gap-[10px]">
          {correct ? (
            <CheckCircle size={18} weight="regular" style={{ color: "var(--color-brand-700)", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          ) : (
            <XCircle size={18} weight="regular" style={{ color: "var(--color-danger-700)", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          )}
          <div>
            <div className="text-[13.5px] font-medium" style={{ color: correct ? "var(--color-brand-700)" : "var(--color-danger-700)" }}>
              {correct ? "Correct" : "Not quite"}
            </div>
            <div className="mt-[3px] text-[12px] leading-[1.5]" style={{ color: "var(--color-ink-600)" }}>
              {feedbackBody}
            </div>
          </div>
        </div>
        {answered && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {notebookState.status === "idle" && (
              <button type="button" disabled={adding} onClick={() => onAdd()} className="text-[11.5px] font-medium" style={{ color: "var(--color-brand-700)" }}>
                {adding ? "Saving…" : "Add to notebook"}
              </button>
            )}
            {notebookState.status === "saved" && (
              <span className="text-[11.5px]" style={{ color: "var(--color-brand-500)" }}>
                Added to notebook
              </span>
            )}
            {notebookState.status === "pick" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px]" style={{ color: "var(--color-ink-400)" }}>
                  Which station?
                </span>
                {notebookState.candidates.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => onAdd(theme)}
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ border: "1px solid var(--color-hairline)", color: "var(--color-ink-700)" }}
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
          style={{ background: "linear-gradient(160deg,var(--color-brand-solid-light),var(--color-brand-solid))" }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

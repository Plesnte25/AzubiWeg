import { X } from "@phosphor-icons/react";

type NotebookState = { status: "idle" | "saved" } | { status: "pick"; candidates: string[] };

/**
 * Fill-in-the-blank question view — reskin of the handoff's sBlank screen.
 * The literal design embeds the blank inside a sentence (bBefore/bAfter)
 * with tap-to-fill word-bank chips and a per-question hint; the real bank
 * (SessionQuestion's fill_blank case) only carries a plain `prompt` string
 * and an `accepted` list of correct-answer variants — no sentence split, no
 * decoy chips, no hint text — so this is a plain prompt + free-text input
 * instead, rather than fabricating sentence structure or hint copy the
 * bank doesn't have.
 */
export function FillInBlankView({
  prompt,
  topic,
  qNum,
  qTotal,
  draft,
  onDraftChange,
  checked,
  correct,
  feedback,
  actionLabel,
  onAction,
  onSkip,
  onClose,
  notebookState,
  onAdd,
  adding,
}: {
  prompt: string;
  topic: string;
  qNum: number;
  qTotal: number;
  draft: string;
  onDraftChange: (v: string) => void;
  checked: boolean;
  correct: boolean;
  feedback: string | null;
  actionLabel: string;
  onAction: () => void;
  onSkip: () => void;
  onClose: () => void;
  notebookState: NotebookState;
  onAdd: (theme?: string) => void;
  adding: boolean;
}) {
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
        <div className="h-1 flex-1 overflow-hidden rounded-[2px]" style={{ background: "#292b31" }}>
          <div
            className="h-full rounded-[2px] transition-[width] duration-400"
            style={{ width: `${(qNum / qTotal) * 100}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }}
          />
        </div>
        <span className="text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          {qNum}/{qTotal}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-[7px]">
        <span className="rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ background: "#20222f", color: "rgba(233,233,237,.6)" }}>
          Fill in the blank
        </span>
        <span className="rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ background: "rgba(145,132,217,.14)", color: "#b5abfc" }}>
          {topic}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-[11px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Type your answer
        </div>
        <div className="mt-3 text-[19px] leading-[1.5] font-medium" style={{ letterSpacing: "-.02em" }}>
          {prompt}
        </div>
        <input
          autoFocus
          disabled={checked}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) onAction();
          }}
          placeholder="…"
          className="mt-3 min-w-32 border-0 bg-transparent px-1 pb-1.5 text-center text-[17px] outline-none"
          style={{
            color: "#e9e9ed",
            borderBottom: `2px solid ${checked ? (correct ? "#9184d9" : "rgba(209,155,134,.7)") : "#5d5294"}`,
          }}
        />
        <div
          className="mt-3 text-[12px] leading-[1.5] transition-colors duration-200"
          style={{ color: checked ? (correct ? "#b5abfc" : "#e4c4b6") : "rgba(233,233,237,.4)" }}
        >
          {checked ? feedback : "Case doesn't matter here."}
        </div>
        {checked && (
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

      <div className="mt-auto flex gap-[9px] pt-6">
        {!checked && (
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[46px] flex-1 rounded-[11px] text-[14px] font-medium"
            style={{ background: "#20222f" }}
          >
            Skip
          </button>
        )}
        <button
          type="button"
          disabled={!checked && !draft.trim()}
          onClick={onAction}
          className="min-h-[46px] flex-[1.5] rounded-[11px] text-[15px] font-medium text-white disabled:opacity-45"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

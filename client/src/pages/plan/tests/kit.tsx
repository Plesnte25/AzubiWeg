import type { CSSProperties, ReactNode } from "react";
import { Timer, X } from "@phosphor-icons/react";
import { Tile } from "../../../components/ui/Tile";
import { useBreakpoint } from "../../../lib/useBreakpoint";
import { band } from "../journey/model";

/*
 * Shared Bento pieces for the test runners (self-test / checkpoint, gender drill, listen & type, exam). The runners
 * are undesigned in the handoff beyond the Stats Drill modal; they follow its Sticker language: a coloured card, big
 * answer buttons, a feedback pill, and a result with one big number.
 */

/** Full-screen runner frame (runner routes are transient: no app chrome): close, progress segments, counter, clock. */
export function TestShell({
  title,
  index,
  total,
  results,
  clock,
  clockWarn,
  onClose,
  children,
}: {
  title: string;
  index: number;
  total: number;
  /** Per-question outcome so far, for the segment colours. */
  results?: (boolean | null)[];
  clock?: string;
  clockWarn?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { bp } = useBreakpoint();
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-5"
      style={{ padding: bp === "sm" ? 14 : 24, "--k": bp === "sm" ? 0.8 : 1 } as CSSProperties}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="flex shrink-0 cursor-pointer items-center justify-center p-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2.5px solid var(--line)",
            background: "var(--plain)",
            color: "var(--plainText)",
            boxShadow: "2px 2px 0 var(--shadow)",
          }}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-label={`${title}: question ${Math.min(index + 1, total)} of ${total}`}
          aria-valuenow={index}
          aria-valuemax={total}
        >
          {Array.from({ length: total }, (_, i) => {
            const r = results?.[i];
            return (
              <span
                key={i}
                className="flex-1"
                style={{
                  height: 12,
                  borderRadius: 999,
                  border: `2px ${i > index ? "dashed" : "solid"} var(--line)`,
                  background:
                    r === true
                      ? "var(--mint)"
                      : r === false
                        ? "var(--tomato)"
                        : i === index
                          ? "var(--lemon)"
                          : "transparent",
                  boxSizing: "border-box",
                }}
              />
            );
          })}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
          {Math.min(index + 1, total)}/{total}
        </span>
        {clock && (
          <span
            role="timer"
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              border: "2px solid var(--line)",
              background: clockWarn ? "var(--tomato)" : "var(--sky)",
              color: "var(--onTile)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Timer size={13} weight="fill" aria-hidden="true" />
            {clock}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">{children}</div>
    </div>
  );
}

/** "Richtig!" / "It's …" pill under an answered question. */
export function FeedbackPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      role="status"
      className="self-start"
      style={{
        fontSize: 15,
        fontWeight: 700,
        padding: "8px 14px",
        borderRadius: 999,
        border: "2.5px solid var(--line)",
        background: ok ? "var(--mint)" : "var(--tomato)",
        color: "var(--onTile)",
        transform: "rotate(-1deg)",
        boxShadow: "3px 3px 0 var(--shadow)",
      }}
    >
      {children}
    </div>
  );
}

/** Answer option button: idle plain; after answering the right one turns mint, a wrong pick tomato, others dim. */
export function OptionButton({
  children,
  onClick,
  state,
  disabled,
  big,
  color,
  lang,
}: {
  children: ReactNode;
  onClick: () => void;
  state: "idle" | "right" | "wrong" | "dim" | "picked";
  disabled?: boolean;
  big?: boolean;
  /** Idle colour (gender drill uses der/die/das colours). */
  color?: string;
  lang?: string;
}) {
  const bg =
    state === "right"
      ? "var(--mint)"
      : state === "wrong"
        ? "var(--tomato)"
        : state === "picked"
          ? "var(--sel)"
          : (color ?? "var(--plain)");
  const fg =
    state === "picked"
      ? "var(--selText)"
      : color || state === "right" || state === "wrong"
        ? "var(--onTile)"
        : "var(--plainText)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      lang={lang}
      className="w-full cursor-pointer text-left disabled:cursor-default"
      style={{
        minHeight: big ? 64 : 52,
        padding: big ? "0 16px" : "12px 16px",
        textAlign: big ? "center" : "left",
        borderRadius: 18,
        border: "2.5px solid var(--line)",
        background: bg,
        color: fg,
        fontSize: big ? 24 : 16,
        fontWeight: 700,
        opacity: state === "dim" ? 0.6 : 1,
        boxShadow: state === "right" || state === "picked" ? "3px 3px 0 var(--shadow)" : "none",
        transform: state === "right" ? "rotate(-1deg)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/** The results tile: one big score, a line, then whatever the runner adds (breakdowns, buttons). */
export function ResultTile({
  score,
  total,
  headline,
  line,
  bg,
  children,
}: {
  score: number;
  total: number;
  headline: string;
  line: string;
  bg: string;
  children?: ReactNode;
}) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  return (
    <Tile bg={bg} tilt={-0.8} radius={26} shadow={6} tape className="flex flex-col gap-3.5" style={{ padding: 24 }}>
      <span className="uppercase" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>
        {headline}
      </span>
      <div className="flex items-baseline gap-3">
        <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.9 }}>
          {score}/{total}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 999,
            border: "2px solid var(--line)",
            background: band(pct),
          }}
        >
          {pct}%
        </span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{line}</span>
      {children}
    </Tile>
  );
}

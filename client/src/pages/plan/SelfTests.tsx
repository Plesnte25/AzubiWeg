import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, ClockCounterClockwise, FlagPennant, Sparkle, Target } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { useNavStack } from "../../lib/navStack";

const LEVEL_LABELS: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1" };
const NEXT_LEVEL: Record<string, string> = { a1: "A2", a2: "B1", b1: "B1" };

const LENGTHS = [8, 12, 20];

/**
 * The handoff's "Question types" list rows (Multiple choice/Fill in the
 * blank/Gender drill/Listen & type, each with its own bank size + score and
 * its own `start` action) don't exist for real — buildSession() has no
 * per-type filter (server/src/services/learning/engine.ts), every session
 * is the same adaptive mix. Shown instead: the real weakest-topic stats
 * already fetched for the footer strip, as plain info rows (not a second
 * set of fake "start this type" buttons) — the one real entry point is the
 * Start test button below, same as "Mixed test from your mistakes".
 */
export default function SelfTests() {
  const { goBack, backLabel, push } = useNavStack();
  const [length, setLength] = useState(12);
  const [showHistory, setShowHistory] = useState(false);
  const { data: quizResults, isLoading } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });
  const { data: examStatus } = useQuery({ queryKey: ["learning", "exam", "status"], queryFn: api.examStatus });

  if (isLoading || !quizResults) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "var(--color-paper)" }} />;
  }

  const weakest = quizResults.weakestTopics;

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto bg-[radial-gradient(110%_42%_at_78%_4%,var(--color-ink-50),var(--color-paper)_60%)] px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+90px)] lg:mx-0 lg:my-0 lg:min-h-0 lg:max-w-[760px] lg:bg-none lg:px-[60px] lg:py-[26px]"
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "var(--color-ink-600)" }}>
        <button type="button" onClick={goBack} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        {quizResults.results.length > 0 && (
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-[5px] text-[11px]" style={{ color: "inherit" }}>
            <ClockCounterClockwise size={13} weight="regular" aria-hidden="true" />
            History
          </button>
        )}
      </div>

      <div className="mt-2.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
        Self-tests
      </div>
      <div className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-400)" }}>
        Vocabulary, grammar, real-life situations — adapts to your recent scores.
      </div>

      <div className="mt-4 flex gap-[9px]">
        <div className="flex-1 rounded-xl p-3" style={{ background: "var(--color-card)" }}>
          <div className="text-[21px] font-medium">{quizResults.avg === null ? "—" : `${quizResults.avg}%`}</div>
          <div className="text-micro" style={{ color: "var(--color-ink-400)" }}>
            avg · {quizResults.testsTaken} test{quizResults.testsTaken === 1 ? "" : "s"} taken
          </div>
        </div>
        <div className="flex-1 rounded-xl p-3" style={{ background: "var(--color-card)" }}>
          <div className="truncate text-[21px] font-medium" style={{ color: "var(--color-brand-700)" }}>
            {weakest[0]?.topic ?? "—"}
          </div>
          <div className="text-micro" style={{ color: "var(--color-ink-400)" }}>
            weakest area
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-xl p-3" style={{ background: "var(--color-card)" }}>
          {quizResults.results.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-[12.5px]">
              <span style={{ color: "var(--color-ink-600)" }}>{new Date(r.takenAt).toLocaleDateString()}</span>
              <span className="font-medium">
                {r.score}/{r.total}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-1 flex-col gap-[9px]">
        {weakest.length > 0 && (
          <>
            <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-600)" }}>
              Weakest areas
            </div>
            {weakest.map((w) => (
              <div key={w.topic} className="flex items-center gap-[13px] rounded-xl p-3.5" style={{ background: "var(--color-ink-50)" }}>
                <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px]" style={{ background: "var(--color-hairline-soft)", color: "var(--color-ink-700)" }}>
                  <Target size={19} weight="regular" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-medium">{w.topic}</div>
                  <div className="text-[11.5px]" style={{ color: "var(--color-ink-400)" }}>
                    {w.correct} of {w.total} correct recently
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-[3px] text-micro"
                  style={{ background: "var(--color-danger-100)", color: "var(--color-danger-700)" }}
                >
                  {w.percent}%
                </span>
              </div>
            ))}
          </>
        )}

        <button
          type="button"
          onClick={() => push("/plan/self-tests/run", { state: { size: Math.round(length / 1.5) } })}
          className="mt-2 rounded-xl p-3.5 text-left"
          style={{ border: "1px solid var(--color-brand-500)", background: "var(--color-brand-50)" }}
        >
          <div className="flex items-center gap-[9px]">
            <Sparkle size={16} weight="regular" style={{ color: "var(--color-brand-700)" }} aria-hidden="true" />
            <div className="text-[13.5px] font-medium" style={{ color: "var(--color-brand-800)" }}>
              Mixed test from your mistakes
            </div>
          </div>
          <div className="mt-[5px] text-[11.5px]" style={{ color: "var(--color-ink-400)" }}>
            A short adaptive session, weighted to your recent scores
          </div>
        </button>

        {examStatus && (
          <button
            type="button"
            onClick={() => push("/plan/exam-gate")}
            className="mt-auto flex items-center justify-between rounded-xl p-3 text-left"
            style={{ border: "1px solid var(--color-brand-500)", background: "var(--color-brand-50)" }}
          >
            <div>
              <div className="text-micro tracking-[.1em] uppercase" style={{ color: "var(--color-ink-600)" }}>
                Gate to {NEXT_LEVEL[examStatus.level] ?? "next level"}
              </div>
              <div className="mt-0.5 text-[13.5px] font-medium">
                {LEVEL_LABELS[examStatus.level]} final exam ·{" "}
                {examStatus.reason === "already_passed" ? "passed" : examStatus.reason === "cooldown" ? "cooling down" : "unlocked"}
              </div>
            </div>
            <FlagPennant size={16} weight="regular" style={{ color: "var(--color-brand-700)" }} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3.5 flex items-center gap-1.5">
        {LENGTHS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setLength(n)}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
            style={{
              background: length === n ? "var(--color-brand-100)" : "var(--color-ink-50)",
              color: length === n ? "var(--color-brand-800)" : "var(--color-ink-600)",
            }}
          >
            {n} · {Math.round(n * 1.1)} min
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => push("/plan/self-tests/run", { state: { size: length } })}
        className="mt-3 min-h-[48px] rounded-[11px] text-[15px] font-medium text-white"
        style={{ background: "linear-gradient(160deg,var(--color-brand-solid-light),var(--color-brand-solid))" }}
      >
        Start test
      </button>
    </div>
  );
}

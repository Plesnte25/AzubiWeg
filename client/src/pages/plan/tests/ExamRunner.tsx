import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { api } from "../../../api/client";
import type { ExamAnswerValue, ExamAttempt, ExamQuestionPublic } from "../../../api/types";
import { Modal } from "../../../components/ui/Modal";
import { PillButton } from "../../../components/ui/PillButton";
import { useNavStack } from "../../../lib/navStack";
import { OptionButton, ResultTile, TestShell } from "./kit";
import { questionCard } from "./styles";
import { band } from "../journey/model";

/*
 * The level exam (Plan gate). Real mode is the gate: 7-day gap between attempts, a pass unlocks the next level. Mock
 * mode (router state { mode: "mock" }) is practice: no lock, never counts as a pass; the result says whether it would
 * have passed. Timed — the clock submits for you when it runs out. No feedback per question (it's an exam).
 */

const SECTION: Record<string, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  gender_drill: "Gender drill",
  listening: "Listening",
};
const NEXT: Record<string, string | null> = { a1: "A2", a2: "B1", b1: null };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function ExamRunner() {
  const { goBack } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const mode = (location.state as { mode?: "real" | "mock" } | null)?.mode ?? "real";
  const [session, setSession] = useState<{
    attemptId: string;
    level: string;
    questions: ExamQuestionPublic[];
    timeLimitMinutes: number;
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswerValue>>({});
  const [result, setResult] = useState<{ attempt: ExamAttempt; wouldHavePassed: boolean } | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const start = useMutation({
    mutationFn: () => api.startExam(mode),
    onSuccess: (d) => {
      setSession(d);
      setLeft(d.timeLimitMinutes * 60);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't start the exam"),
  });
  useEffect(() => {
    start.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useMutation({
    mutationFn: () =>
      api.submitExam(
        session!.attemptId,
        session!.questions.map((q) => ({
          qid: q.qid,
          answer: answers[q.qid] ?? (q.type === "fill_blank" ? "" : q.type === "true_false" ? false : -1),
        })),
      ),
    onSuccess: (d) => {
      setResult(d);
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useEffect(() => {
    if (left === null || result || submit.isPending) return;
    if (left <= 0) {
      submit.mutate();
      return;
    }
    const t = setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = mode === "mock" ? "Mock exam" : "Exam";
  if (error)
    return (
      <TestShell title={title} index={0} total={1} onClose={goBack}>
        <div style={questionCard}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{error}</span>
          <PillButton className="self-start" height={42} onClick={goBack}>
            Back
          </PillButton>
        </div>
      </TestShell>
    );
  if (!session) return <div className="min-h-dvh" aria-busy="true" />;

  const total = session.questions.length;
  if (result) {
    const a = result.attempt;
    const passed = a.passed === true;
    const next = NEXT[a.level];
    const line =
      mode === "mock"
        ? `Practice run — it doesn't count. ${result.wouldHavePassed ? "This would have passed." : "Not a pass yet; the section scores show where to aim."}`
        : passed
          ? `${a.level.toUpperCase()} passed.${next ? ` ${next} is open now.` : ""}`
          : "Not quite there yet. You can try again in 7 days.";
    return (
      <TestShell title={title} index={total} total={total} onClose={goBack}>
        <ResultTile
          score={a.score ?? 0}
          total={a.total ?? total}
          headline={`${a.level.toUpperCase()} ${mode === "mock" ? "mock exam" : "exam"}`}
          line={line}
          bg={passed || (mode === "mock" && result.wouldHavePassed) ? "var(--mint)" : "var(--orange)"}
        >
          {a.sectionBreakdown && (
            <div className="flex flex-col gap-1.5">
              {a.sectionBreakdown.map((s) => {
                const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div
                    key={s.section}
                    className="flex items-center gap-2"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "2px solid var(--line)",
                      background: "var(--plain)",
                      color: "var(--plainText)",
                    }}
                  >
                    <span className="flex-1" style={{ fontSize: 14, fontWeight: 700 }}>
                      {SECTION[s.section] ?? s.section}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {s.correct}/{s.total}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 999,
                        border: "2px solid var(--line)",
                        background: band(pct),
                        color: "var(--onTile)",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ResultTile>
        <PillButton onClick={goBack}>Back to the plan</PillButton>
      </TestShell>
    );
  }

  const q = session.questions[index]!;
  const value = answers[q.qid];
  const set = (v: ExamAnswerValue) => setAnswers((x) => ({ ...x, [q.qid]: v }));
  const last = index === total - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <TestShell
      title={title}
      index={index}
      total={total}
      clock={left !== null ? clock(Math.max(0, left)) : undefined}
      clockWarn={(left ?? 999) < 60}
      onClose={() => setLeaving(true)}
    >
      <div style={{ ...questionCard, background: mode === "mock" ? "var(--plain)" : "var(--plain)" }}>
        <span
          className="uppercase"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--plainMuted)" }}
        >
          {mode === "mock" ? "Mock · " : ""}
          {SECTION[q.section] ?? q.section}
        </span>
        <span
          lang="de"
          style={{ fontSize: "calc(var(--k) * 24px)", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.25 }}
        >
          {q.prompt}
        </span>
        {q.type === "fill_blank" ? (
          <input
            autoFocus
            lang="de"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (last ? submit.mutate() : setIndex(index + 1))}
            placeholder="Your answer…"
            aria-label="Your answer"
            style={{
              height: 52,
              padding: "0 14px",
              border: "2.5px solid var(--line)",
              borderRadius: 14,
              background: "var(--plain2)",
              color: "var(--plainText)",
              fontSize: 18,
              fontWeight: 700,
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(q.type === "mcq" ? q.choices : ["Falsch", "Richtig"]).map((c, i) => {
              const v: ExamAnswerValue = q.type === "mcq" ? i : i === 1;
              return (
                <OptionButton key={c} lang="de" state={value === v ? "picked" : "idle"} onClick={() => set(v)}>
                  {c}
                </OptionButton>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <PillButton
          variant="secondary"
          style={{ minWidth: 110 }}
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Back
        </PillButton>
        {last ? (
          <PillButton className="flex-1" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Scoring…" : `Hand in (${answeredCount}/${total} answered)`}
          </PillButton>
        ) : (
          <PillButton className="flex-1" onClick={() => setIndex(index + 1)}>
            Next question
          </PillButton>
        )}
      </div>
      {leaving && (
        <Modal
          title="Leave the exam?"
          tag={title}
          subtitle={
            mode === "mock"
              ? "This mock attempt won't be scored. You can start another any time."
              : "This attempt won't be scored, and it starts the 7-day gap like a real one."
          }
          bg="var(--tomato)"
          width={460}
          onClose={() => setLeaving(false)}
          footer={
            <>
              <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={goBack}>
                Leave
              </PillButton>
              <PillButton className="flex-1" onClick={() => setLeaving(false)}>
                Keep going
              </PillButton>
            </>
          }
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {answeredCount} of {total} answered, {left !== null ? clock(Math.max(0, left)) : ""} left.
          </span>
        </Modal>
      )}
    </TestShell>
  );
}

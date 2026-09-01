import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Timer, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { ExamAnswerValue, ExamAttempt, ExamQuestionPublic } from "../../api/types";
import { Skeleton } from "../../components/ui/Skeleton";
import { useNavStack } from "../../lib/navStack";
import { TestDone } from "./TestDone";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The real gating-exam question-taking flow (Phase 12). Deliberately not
 * the handoff's pixel-fidelity MCQ.tsx/FillInBlank.tsx (that's Phase 14's
 * job, reskinning the *practice* self-test's question-bank.ts/engine.ts
 * output) -- functional, Nocturne-toned, generic across mcq/fill_blank/
 * true_false so the exam is actually completable rather than a dead end
 * behind Exam Gate's "Start exam" button. "No pausing" per the handoff's
 * exam rules: no back-stack entry recorded for this screen (see navStack's
 * TRANSIENT_PATH_PREFIXES), closing mid-exam needs an explicit confirm.
 */
export default function ExamRunner() {
  const { goBack } = useNavStack();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<{ attemptId: string; level: string; questions: ExamQuestionPublic[]; timeLimitMinutes: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswerValue>>({});
  const [textDraft, setTextDraft] = useState("");
  const [result, setResult] = useState<ExamAttempt | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: api.startExam,
    onSuccess: (data) => {
      setSession(data);
      setSecondsLeft(data.timeLimitMinutes * 60);
    },
    onError: (e) => setStartError(e instanceof Error ? e.message : "Couldn't start the exam"),
  });
  useEffect(() => {
    start.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useMutation({
    mutationFn: () =>
      api.submitExam(
        session!.attemptId,
        session!.questions.map((q) => ({ qid: q.qid, answer: answers[q.qid] ?? (q.type === "fill_blank" ? "" : q.type === "true_false" ? false : -1) })),
      ),
    onSuccess: (data) => {
      setResult(data.attempt);
      queryClient.invalidateQueries({ queryKey: ["learning", "exam", "status"] });
      queryClient.invalidateQueries({ queryKey: ["learning", "syllabus"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useEffect(() => {
    if (secondsLeft === null || result || submit.isPending) return;
    if (secondsLeft <= 0) {
      submit.mutate();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  function recordAnswer(qid: string, value: ExamAnswerValue) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  function next() {
    if (!session) return;
    setTextDraft("");
    if (index < session.questions.length - 1) setIndex((i) => i + 1);
    else submit.mutate();
  }

  function close() {
    if (confirm("Leave the exam now? This attempt won't be scored, and starts your cooldown just like a real one.")) goBack();
  }

  if (result) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "radial-gradient(100% 42% at 50% 14%, #262a60 0%, #161826 70%)" }}>
        <TestDone attempt={result} onHome={() => goBack()} onSeeNextLevel={() => goBack()} />
      </div>
    );
  }

  if (startError) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col items-center justify-center gap-3 px-5 text-center" style={{ background: "#161826" }}>
        <p style={{ color: "rgba(233,233,237,.6)" }}>{startError}</p>
        <button type="button" onClick={goBack} className="text-[13px]" style={{ color: "#b5abfc" }}>
          ‹ Back
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col gap-3 px-5 pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "#161826" }}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const q = session.questions[index]!;
  const answered = answers[q.qid] !== undefined;

  return (
    <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "radial-gradient(120% 50% at 50% 0%, #1d2033, #161826 62%)" }}>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={close} aria-label="Leave exam" style={{ color: "rgba(233,233,237,.55)" }}>
          <X size={19} weight="regular" aria-hidden="true" />
        </button>
        <div className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: "#292b31" }}>
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(index / session.questions.length) * 100}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
        </div>
        <div className="min-w-[42px] text-right text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          {index + 1}/{session.questions.length}
        </div>
      </div>

      {secondsLeft !== null && (
        <div className="mt-2.5 flex justify-center">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px]"
            style={{ background: secondsLeft < 120 ? "rgba(209,155,134,.16)" : "rgba(145,132,217,.14)", color: secondsLeft < 120 ? "#e4c4b6" : "#b5abfc" }}
          >
            <Timer size={10} weight="regular" aria-hidden="true" />
            {formatClock(secondsLeft)} left
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        <div>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            {q.section.replace("_", " ")}
          </div>
          <div className="mt-2 text-[20px] leading-snug font-medium">{q.prompt}</div>
        </div>

        {q.type === "mcq" && (
          <div className="flex flex-col gap-2">
            {q.choices.map((choice, i) => {
              const selected = answers[q.qid] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => recordAnswer(q.qid, i)}
                  className="rounded-[11px] p-3.5 text-left text-[14.5px]"
                  style={{ border: `1px solid ${selected ? "#9184d9" : "rgba(233,233,237,.14)"}`, background: selected ? "rgba(145,132,217,.13)" : "transparent", color: selected ? "#d2cefd" : "#e9e9ed" }}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-3">
            {[true, false].map((v) => {
              const selected = answers[q.qid] === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => recordAnswer(q.qid, v)}
                  className="flex-1 rounded-[11px] p-3.5 text-[15px] font-medium"
                  style={{ border: `1px solid ${selected ? "#9184d9" : "rgba(233,233,237,.14)"}`, background: selected ? "rgba(145,132,217,.13)" : "transparent", color: selected ? "#d2cefd" : "#e9e9ed" }}
                >
                  {v ? "Richtig" : "Falsch"}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "fill_blank" && (
          <input
            autoFocus
            value={typeof answers[q.qid] === "string" ? (answers[q.qid] as string) : textDraft}
            onChange={(e) => {
              setTextDraft(e.target.value);
              recordAnswer(q.qid, e.target.value);
            }}
            placeholder="Type your answer…"
            className="box-border w-full rounded-[11px] px-[13px] py-3 text-[16px] outline-none"
            style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid #9184d9" }}
          />
        )}
      </div>

      <div className="pb-4">
        <button
          type="button"
          disabled={!answered || submit.isPending}
          onClick={next}
          className="min-h-[48px] w-full rounded-[11px] text-[15px] font-medium text-white disabled:opacity-40"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          {index < session.questions.length - 1 ? "Next" : submit.isPending ? "Submitting…" : "Finish"}
        </button>
      </div>
    </div>
  );
}

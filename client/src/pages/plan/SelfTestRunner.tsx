import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { ApiError, api } from "../../api/client";
import type { CefrLevel, RoadmapSkill, SessionQuestion, TopicBreakdown } from "../../api/types";
import { isAnswerAccepted } from "../../lib/quiz";
import { useNavStack } from "../../lib/navStack";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { FillInBlankView } from "./FillInBlank";
import { MCQView } from "./MCQ";
import { SelfTestDone } from "./SelfTestDone";

interface AnswerRecord {
  qid: string;
  topic: string;
  level: CefrLevel;
  skill: RoadmapSkill;
  correct: boolean;
  prompt: string;
}

type NotebookState = { status: "idle" | "saved" } | { status: "pick"; candidates: string[] };

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function synthesizedExplanation(q: SessionQuestion): string {
  if (q.type === "mcq") return `Correct answer: ${q.choices[q.answerIndex]}`;
  if (q.type === "fill_blank") return `Correct answer: ${q.accepted[0]}`;
  return `Correct answer: ${q.answer ? "Richtig" : "Falsch"}`;
}

/**
 * Owns the whole practice self-test session (question list, answers,
 * elapsed clock, notebook actions) at the single transient route
 * `/plan/self-tests/run` — the handoff renders this as two visually
 * distinct screens per question type (sMcq/sBlank), reskinned here as
 * MCQView/FillInBlankView, swapped in place rather than as separate routes
 * so one session can mix both types without relaying state through the
 * router on every question (true_false questions render through MCQView
 * too — a 2-option pick, same shape, no dedicated screen in the handoff).
 */
export default function SelfTestRunner() {
  const { goBack } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const size = (location.state as { size?: number } | null)?.size ?? 12;

  const [session, setSession] = useState<{ questions: SessionQuestion[]; reviewOnly?: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [draft, setDraft] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [notebookState, setNotebookState] = useState<NotebookState>({ status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const start = useMutation({
    mutationFn: (n: number) => api.startSelfTest({ size: n }),
    onSuccess: (data) => {
      setSession({ questions: data.questions });
      setIndex(0);
      setAnswers([]);
    },
    onError: (e) => setStartError(e instanceof ApiError ? e.message : "Could not start the test"),
  });
  useEffect(() => {
    start.mutate(size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finished = session !== null && index >= session.questions.length;
  useEffect(() => {
    if (!session || finished) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [session, finished, startedAt]);

  const submit = useMutation({
    mutationFn: (records: AnswerRecord[]) => {
      const byTopic = new Map<string, TopicBreakdown>();
      for (const r of records) {
        const key = `${r.topic}|${r.level}`;
        const entry = byTopic.get(key) ?? { topic: r.topic, level: r.level, skill: r.skill, correct: 0, total: 0 };
        entry.total += 1;
        if (r.correct) entry.correct += 1;
        byTopic.set(key, entry);
      }
      return api.submitQuizResult({
        score: records.filter((r) => r.correct).length,
        total: records.length,
        kind: "mixed",
        questionIds: records.map((r) => r.qid),
        breakdown: [...byTopic.values()],
      });
    },
    onSuccess: () => invalidateHub(queryClient),
  });

  const addToNotebook = useMutation({
    mutationFn: ({ q, theme }: { q: SessionQuestion; theme?: string }) =>
      api.addToNotebook({ level: q.level, topic: q.topic, questionPrompt: q.prompt, explanation: synthesizedExplanation(q), theme }),
    onSuccess: (result) => {
      if (result.matched) setNotebookState({ status: "saved" });
      else setNotebookState({ status: "pick", candidates: result.candidates ?? [] });
    },
  });

  if (startError) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "#161826" }}>
        <p className="text-[13.5px]" style={{ color: "rgba(233,233,237,.6)" }}>
          {startError}
        </p>
        <button type="button" onClick={goBack} className="text-[13px]" style={{ color: "#b5abfc" }}>
          ‹ Back
        </button>
      </div>
    );
  }

  if (!session) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#1f2236" }} />;
  }

  const q = session.questions[index];
  const isLastQuestion = index === session.questions.length - 1;
  const wrongAnswers = answers.filter((a) => !a.correct);
  const byTopicResults = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = byTopicResults.get(a.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    byTopicResults.set(a.topic, entry);
  }

  function record(correct: boolean) {
    if (!q) return;
    const next = [...answers, { qid: q.qid, topic: q.topic, level: q.level, skill: q.skill, correct, prompt: q.prompt }];
    setAnswers(next);
    setNotebookState({ status: "idle" });
    if (session!.reviewOnly) return; // feedback shows in place; advance() moves on
    if (isLastQuestion) submit.mutate(next);
  }

  function advance() {
    setPicked(null);
    setChecked(false);
    setDraft("");
    if (isLastQuestion) {
      setIndex(index + 1); // past the end -> results
      return;
    }
    setIndex(index + 1);
  }

  function reviewWrong() {
    const wrongQuestions = session!.questions.filter((sq) => wrongAnswers.some((w) => w.qid === sq.qid));
    if (wrongQuestions.length === 0) return;
    setSession({ questions: wrongQuestions, reviewOnly: true });
    setIndex(0);
    setAnswers([]);
    setPicked(null);
    setChecked(false);
  }

  // past the last question -> results
  if (index >= session.questions.length) {
    return (
      <div
        className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
        style={{ background: "radial-gradient(100% 42% at 50% 14%, #262a60 0%, #161826 70%)" }}
      >
        <SelfTestDone
          answers={answers}
          byTopic={byTopicResults}
          elapsedSeconds={elapsed}
          onReviewWrong={wrongAnswers.length > 0 ? reviewWrong : null}
          onDone={goBack}
        />
      </div>
    );
  }

  const answered = q.type === "fill_blank" ? checked : picked !== null;
  const correct = q.type === "mcq" ? picked === q.answerIndex : q.type === "true_false" ? picked === (q.answer ? 1 : 0) : isAnswerAccepted(draft, q.accepted);
  const nextLabel = isLastQuestion ? (session.reviewOnly ? "Finish review" : "See result") : session.reviewOnly ? "Next" : "Next question";

  const pipStates: ("correct" | "wrong" | "current" | "upcoming")[] = session.questions.map((sq, i) => {
    if (i === index) return "current";
    const a = answers.find((x) => x.qid === sq.qid);
    if (!a) return "upcoming";
    return a.correct ? "correct" : "wrong";
  });

  const notebookProps = {
    notebookState,
    onAdd: (theme?: string) => addToNotebook.mutate({ q, theme }),
    adding: addToNotebook.isPending,
  };

  if (q.type === "fill_blank") {
    return (
      <FillInBlankView
        prompt={q.prompt}
        topic={q.topic}
        qNum={index + 1}
        qTotal={session.questions.length}
        draft={draft}
        onDraftChange={(v) => {
          setDraft(v);
          setChecked(false);
        }}
        checked={checked}
        correct={correct}
        feedback={checked ? (correct ? "Correct." : synthesizedExplanation(q)) : null}
        actionLabel={!checked ? "Check" : nextLabel}
        onAction={() => {
          if (!checked) {
            setChecked(true);
            record(correct);
          } else advance();
        }}
        onSkip={() => {
          record(false);
          advance();
        }}
        onClose={goBack}
        {...notebookProps}
      />
    );
  }

  return (
    <MCQView
      question={q}
      qNum={index + 1}
      qTotal={session.questions.length}
      pipStates={pipStates}
      clock={formatClock(elapsed)}
      picked={picked}
      answered={answered}
      correct={correct}
      feedbackBody={answered ? synthesizedExplanation(q) : ""}
      nextLabel={nextLabel}
      onPick={(i) => {
        setPicked(i);
        record(q.type === "mcq" ? i === q.answerIndex : i === (q.answer ? 1 : 0));
      }}
      onNext={advance}
      onClose={goBack}
      {...notebookProps}
    />
  );
}

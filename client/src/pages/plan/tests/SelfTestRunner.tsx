import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { ApiError, api } from "../../../api/client";
import type { CefrLevel, SessionQuestion, TopicBreakdown } from "../../../api/types";
import { Chip } from "../../../components/ui/Chip";
import { PillButton } from "../../../components/ui/PillButton";
import { isAnswerAccepted } from "../../../lib/quiz";
import { useNavStack } from "../../../lib/navStack";
import { stripLeadingPosTag } from "../../../lib/wordDisplay";
import { FeedbackPill, OptionButton, ResultTile, TestShell } from "./kit";
import { questionCard } from "./styles";

/*
 * Self-test runner: the mixed practice test (authored bank + your own words), or — with router state
 * { checkpointIndex, level } — a Plan checkpoint test scoped to that checkpoint's stations (20 questions, recorded,
 * never gating). Answers ship with the questions (self-reported, same trust model as always). Wrong answers can be
 * added to the matching station's grammar notebook.
 */

interface Answer {
  q: SessionQuestion;
  correct: boolean;
}

type Notebook = { status: "idle" | "saved" } | { status: "pick"; candidates: string[] };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
// vocab questions carry raw stored meanings ("(Noun) table; …") — shown without the part-of-speech tag
const solution = (q: SessionQuestion) =>
  q.type === "mcq" ? stripLeadingPosTag(q.choices[q.answerIndex] ?? "") : q.type === "fill_blank" ? q.accepted[0] : q.answer ? "Richtig" : "Falsch";

export default function SelfTestRunner() {
  const { goBack } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const state = (location.state as { size?: number; checkpointIndex?: 1 | 2 | 3; level?: CefrLevel } | null) ?? {};
  const checkpoint = state.checkpointIndex ?? null;
  const size = checkpoint ? 20 : (state.size ?? 12);

  const [session, setSession] = useState<{
    questions: SessionQuestion[];
    level: CefrLevel;
    reviewOnly?: boolean;
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<Notebook>({ status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const start = useMutation({
    mutationFn: () =>
      api.startSelfTest({ size, ...(checkpoint ? { checkpointIndex: checkpoint, level: state.level } : {}) }),
    onSuccess: (d) => setSession({ questions: d.questions, level: d.level }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't start the test"),
  });
  useEffect(() => {
    start.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = !!session && index >= session.questions.length;
  useEffect(() => {
    if (!session || finished) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [session, finished, startedAt]);

  const submit = useMutation({
    mutationFn: (all: Answer[]) => {
      const byTopic = new Map<string, TopicBreakdown>();
      const byType = new Map<"mcq" | "fill_blank" | "true_false", { correct: number; total: number }>();
      for (const a of all) {
        const key = `${a.q.topic}|${a.q.level}`;
        const t = byTopic.get(key) ?? { topic: a.q.topic, level: a.q.level, skill: a.q.skill, correct: 0, total: 0 };
        t.total += 1;
        if (a.correct) t.correct += 1;
        byTopic.set(key, t);
        const y = byType.get(a.q.type) ?? { correct: 0, total: 0 };
        y.total += 1;
        if (a.correct) y.correct += 1;
        byType.set(a.q.type, y);
      }
      return api.submitQuizResult({
        score: all.filter((a) => a.correct).length,
        total: all.length,
        kind: checkpoint ? "checkpoint" : "mixed",
        checkpointIndex: checkpoint,
        level: checkpoint ? session!.level : null,
        questionIds: all.map((a) => a.q.qid),
        breakdown: [...byTopic.values()],
        typeBreakdown: [...byType.entries()].map(([type, v]) => ({ type, ...v })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const addToNotebook = useMutation({
    mutationFn: ({ q, theme }: { q: SessionQuestion; theme?: string }) =>
      api.addToNotebook({
        level: q.level,
        topic: q.topic,
        questionPrompt: q.prompt,
        explanation: `Correct answer: ${solution(q)}`,
        theme,
      }),
    onSuccess: (r) => setNotebook(r.matched ? { status: "saved" } : { status: "pick", candidates: r.candidates ?? [] }),
  });

  const title = checkpoint ? `Checkpoint ${checkpoint}` : "Self-test";
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
  const results = session.questions.map((q) => answers.find((a) => a.q.qid === q.qid)?.correct ?? null);

  if (finished) {
    const score = answers.filter((a) => a.correct).length;
    const wrong = answers.filter((a) => !a.correct);
    const topics = new Map<string, { c: number; t: number }>();
    for (const a of answers) {
      const e = topics.get(a.q.topic) ?? { c: 0, t: 0 };
      e.t += 1;
      if (a.correct) e.c += 1;
      topics.set(a.q.topic, e);
    }
    return (
      <TestShell title={title} index={total} total={total} results={results} onClose={goBack}>
        <ResultTile
          score={score}
          total={total}
          headline={
            session.reviewOnly ? "Review round" : checkpoint ? `Checkpoint ${checkpoint} · recorded` : "Self-test"
          }
          line={`${clock(elapsed)} · ${wrong.length ? `${wrong.length} to look at again` : "Nothing missed. Stark!"}`}
          bg="var(--mint)"
        >
          <div className="flex flex-wrap gap-1.5">
            {[...topics.entries()].map(([t, v]) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  border: "2px solid var(--line)",
                  background: v.c === v.t ? "var(--plain)" : "var(--tomato)",
                }}
              >
                {t.replace(/-/g, " ")} {v.c}/{v.t}
              </span>
            ))}
          </div>
        </ResultTile>
        <div className="flex gap-2">
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={goBack}>
            Done
          </PillButton>
          {wrong.length > 0 && (
            <PillButton
              className="flex-1"
              onClick={() => {
                setSession({ ...session, questions: wrong.map((w) => w.q), reviewOnly: true });
                setAnswers([]);
                setIndex(0);
                setPicked(null);
                setChecked(false);
                setDraft("");
              }}
            >
              Review the wrong ones
            </PillButton>
          )}
        </div>
      </TestShell>
    );
  }

  const q = session.questions[index]!;
  const answered = q.type === "fill_blank" ? checked : picked !== null;
  const correct =
    q.type === "mcq"
      ? picked === q.answerIndex
      : q.type === "true_false"
        ? picked === (q.answer ? 1 : 0)
        : isAnswerAccepted(draft, q.accepted);
  const last = index === total - 1;

  const record = (ok: boolean) => {
    const next = [...answers, { q, correct: ok }];
    setAnswers(next);
    setNotebook({ status: "idle" });
    if (last && !session.reviewOnly) submit.mutate(next);
  };
  const advance = () => {
    setPicked(null);
    setChecked(false);
    setDraft("");
    setIndex(index + 1);
  };
  const choices = q.type === "mcq" ? q.choices.map(stripLeadingPosTag) : q.type === "true_false" ? ["Falsch", "Richtig"] : [];
  const rightIndex = q.type === "mcq" ? q.answerIndex : q.type === "true_false" ? (q.answer ? 1 : 0) : -1;

  return (
    <TestShell title={title} index={index} total={total} results={results} clock={clock(elapsed)} onClose={goBack}>
      <div style={questionCard}>
        <span
          className="uppercase"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--plainMuted)" }}
        >
          {q.level.toUpperCase()} · {q.topic.replace(/-/g, " ")}
        </span>
        <span
          lang="de"
          style={{ fontSize: "calc(var(--k) * 26px)", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.2 }}
        >
          {q.prompt}
        </span>
        {q.type === "fill_blank" ? (
          <input
            autoFocus
            value={draft}
            lang="de"
            disabled={checked}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !draft.trim()) return;
              if (!checked) {
                setChecked(true);
                record(isAnswerAccepted(draft, q.accepted));
              } else advance();
            }}
            placeholder="Type the missing word…"
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
            {choices.map((c, i) => (
              <OptionButton
                key={c}
                lang="de"
                disabled={answered}
                state={!answered ? "idle" : i === rightIndex ? "right" : i === picked ? "wrong" : "dim"}
                onClick={() => {
                  setPicked(i);
                  record(i === rightIndex);
                }}
              >
                {c}
              </OptionButton>
            ))}
          </div>
        )}
      </div>
      {answered && (
        <div className="flex flex-col gap-3">
          <FeedbackPill ok={correct}>{correct ? "Richtig!" : `Answer: ${solution(q)}`}</FeedbackPill>
          {!correct && notebook.status === "idle" && (
            <button
              type="button"
              disabled={addToNotebook.isPending}
              onClick={() => addToNotebook.mutate({ q })}
              className="cursor-pointer self-start"
              style={{
                height: 34,
                padding: "0 12px",
                border: "2px dashed var(--line)",
                borderRadius: 999,
                background: "transparent",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Add to the grammar notebook
            </button>
          )}
          {notebook.status === "saved" && (
            <span style={{ fontSize: 13, fontWeight: 700 }}>Saved to the station's notebook.</span>
          )}
          {notebook.status === "pick" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Which station?</span>
              {notebook.candidates.map((c) => (
                <Chip key={c} size="sm" onClick={() => addToNotebook.mutate({ q, theme: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
      <PillButton
        disabled={q.type === "fill_blank" ? !draft.trim() && !checked : !answered}
        onClick={() => {
          if (q.type === "fill_blank" && !checked) {
            setChecked(true);
            record(isAnswerAccepted(draft, q.accepted));
          } else advance();
        }}
      >
        {q.type === "fill_blank" && !checked
          ? "Check"
          : last
            ? session.reviewOnly
              ? "Finish review"
              : "See result"
            : "Next question"}
      </PillButton>
    </TestShell>
  );
}

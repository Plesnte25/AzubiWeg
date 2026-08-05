import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { CefrLevel, RoadmapSkill, SessionQuestion, TopicBreakdown } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { isAnswerAccepted } from "../../lib/quiz";
import type { Destination } from "./LearningRail";
import { invalidateHub } from "./queryHelpers";

interface AnswerRecord {
  qid: string;
  topic: string;
  level: CefrLevel;
  skill: RoadmapSkill;
  correct: boolean;
  prompt: string;
}

type Phase = "entry" | "question" | "feedback" | "results" | "paused";

interface Session {
  questions: SessionQuestion[];
  level: CefrLevel;
  reviewOnly?: boolean;
}

function synthesizedExplanation(q: SessionQuestion): string {
  if (q.type === "mcq") return `Correct answer: ${q.choices[q.answerIndex]}`;
  if (q.type === "fill_blank") return `Correct answer: ${q.accepted[0]}`;
  return `Correct answer: ${q.answer ? "Richtig" : "Falsch"}`;
}

export function SelfTestsPage({ onRunningChange, onNavigate }: { onRunningChange: (running: boolean) => void; onNavigate: (d: Destination) => void }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("entry");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [length, setLength] = useState(12);
  const [notebookState, setNotebookState] = useState<{ status: "idle" | "saved" } | { status: "pick"; candidates: string[] }>({ status: "idle" });

  const { data: quizResults } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });

  useEffect(() => {
    onRunningChange(phase !== "entry");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = useMutation({
    mutationFn: (size: number) => api.startSelfTest({ size }),
    onSuccess: (data) => {
      setSession(data);
      setIndex(0);
      setAnswers([]);
      setPhase("question");
    },
  });
  const [startError, setStartError] = useState<string | null>(null);

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
        level: session?.level,
        questionIds: records.map((r) => r.qid),
        breakdown: [...byTopic.values()],
      });
    },
    onSuccess: () => invalidateHub(queryClient),
  });

  const q = session?.questions[index];

  function record(correct: boolean) {
    if (!q) return;
    const next = [...answers, { qid: q.qid, topic: q.topic, level: q.level, skill: q.skill, correct, prompt: q.prompt }];
    setAnswers(next);
    setLastCorrect(correct);
    setNotebookState({ status: "idle" });
    if (session?.reviewOnly) {
      setPhase("feedback");
      return;
    }
    if (index === (session?.questions.length ?? 0) - 1) {
      setPhase("results");
      submit.mutate(next);
    } else {
      setPhase("feedback");
    }
  }

  function advance() {
    if (session?.reviewOnly) {
      if (index === session.questions.length - 1) {
        setPhase("results");
      } else {
        setIndex(index + 1);
        setPicked(null);
        setDraft("");
        setPhase("question");
      }
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setDraft("");
    setPhase("question");
  }

  function endTest() {
    setSession(null);
    setPhase("entry");
  }

  function backToHub() {
    endTest();
    onNavigate("today");
  }

  // keyboard nav
  useEffect(() => {
    if (phase !== "question" || !q) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPhase("paused");
        return;
      }
      if (q!.type === "mcq" && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < q!.choices.length) {
          setPicked(i);
          record(i === q!.answerIndex);
        }
      } else if (q!.type === "true_false" && (e.key === "1" || e.key === "2")) {
        const value = e.key === "1";
        setPicked(value ? 1 : 0);
        record(value === q!.answer);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q, index]);

  useEffect(() => {
    if (phase !== "feedback") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") advance();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  const addToNotebook = useMutation({
    mutationFn: (theme?: string) => {
      if (!q) throw new Error("no question");
      return api.addToNotebook({ level: q.level, topic: q.topic, questionPrompt: q.prompt, explanation: synthesizedExplanation(q), theme });
    },
    onSuccess: (result) => {
      if (result.matched) setNotebookState({ status: "saved" });
      else setNotebookState({ status: "pick", candidates: result.candidates ?? [] });
    },
  });

  const wrongAnswers = answers.filter((a) => !a.correct);
  const byTopicResults = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = byTopicResults.get(a.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    byTopicResults.set(a.topic, entry);
  }

  function reviewWrong() {
    if (!session) return;
    const wrongQuestions = session.questions.filter((sq) => wrongAnswers.some((w) => w.qid === sq.qid));
    if (wrongQuestions.length === 0) return;
    setSession({ questions: wrongQuestions, level: session.level, reviewOnly: true });
    setIndex(0);
    setAnswers([]);
    setPhase("question");
  }

  // No server-side topic filter exists for a self-test session yet — this
  // starts a short general session rather than one strictly scoped to the
  // weakest topic (buildSession has no topic-restriction parameter today).
  function drillWeakest() {
    start.mutate(6);
  }

  if (phase === "entry") {
    return (
      <div className="flex min-h-[330px] flex-col rounded-[18px] bg-ink-900 p-5 text-white md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">Self-test</p>
        <h1 className="mt-1 text-[22px] font-bold md:text-[26px]">Test yourself</h1>
        <p className="mt-2 max-w-[56ch] text-[13.5px] text-ink-400">
          Grammar, real-life situations and your own vocabulary. Adapts to recent scores, never repeats a recent question, never touches your review
          schedule.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Length</p>
          {[8, 12, 20].map((n) => (
            <button
              key={n}
              onClick={() => setLength(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                length === n ? "border-[1.5px] border-white text-white" : "border-[var(--color-surface-dark-3)] text-ink-400 hover:bg-[var(--color-surface-dark-1)]"
              }`}
            >
              {n} · {Math.round(n * 1.1)} min
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            loading={start.isPending}
            onClick={() => {
              setStartError(null);
              start.mutate(length, { onError: (e) => setStartError(e instanceof ApiError ? e.message : "Could not start the test") });
            }}
          >
            Start test
          </Button>
          {quizResults?.results[0] && (
            <p className="text-sm text-ink-400">
              last {quizResults.results[0].score}/{quizResults.results[0].total} · {new Date(quizResults.results[0].takenAt).toLocaleDateString()}
              {quizResults.avg !== null && ` · average ${quizResults.avg}%`}
            </p>
          )}
        </div>
        {startError && <p className="mt-2 text-sm text-brand-400">{startError}</p>}
        {quizResults && (quizResults.weakestTopics.length > 0 || quizResults.testsTaken > 0) && (
          <div className="mt-5 flex flex-wrap gap-4 border-t border-[var(--color-surface-dark-2)] pt-3 text-xs text-ink-400">
            {quizResults.weakestTopics[0] && (
              <span>
                Weakest: <span className="font-medium text-white">{quizResults.weakestTopics[0].topic}</span> ({quizResults.weakestTopics[0].percent}%)
              </span>
            )}
            {quizResults.weakestTopics[1] && (
              <span>
                Next: <span className="font-medium text-white">{quizResults.weakestTopics[1].topic}</span> ({quizResults.weakestTopics[1].percent}%)
              </span>
            )}
            <span>{quizResults.testsTaken} tests taken</span>
          </div>
        )}
      </div>
    );
  }

  if (!session || !q) return null;

  return (
    <div className="flex min-h-[330px] flex-col rounded-[18px] bg-ink-900 p-7 text-white">
      {phase === "paused" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg font-semibold">Paused</p>
          <div className="flex gap-2">
            <Button onClick={() => setPhase(answers.length > index ? "feedback" : "question")}>Resume</Button>
            <Button variant="outline" className="border-[var(--color-surface-dark-3)] text-white" onClick={backToHub}>
              End test
            </Button>
          </div>
        </div>
      ) : phase === "results" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-[46px] font-bold leading-none">
            {answers.filter((a) => a.correct).length}
            <span className="text-[22px] font-normal text-ink-400">/{answers.length}</span>
          </p>
          <p className="text-sm text-ink-400">{Math.round((answers.filter((a) => a.correct).length / answers.length) * 100)}% correct</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {answers.map((a, i) => (
              <div key={i} className={`grid size-[27px] place-items-center rounded-[7px] text-xs font-bold ${a.correct ? "bg-ok-600" : "bg-brand-500"}`}>
                {a.correct ? "✓" : "✕"}
              </div>
            ))}
          </div>
          <div className="w-full max-w-sm space-y-1.5 border-t border-[var(--color-surface-dark-2)] pt-3 text-left">
            {[...byTopicResults.entries()].map(([topic, v]) => (
              <div key={topic} className="flex items-center justify-between text-sm">
                <span className="text-ink-400">{topic}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-surface-dark-2)]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(v.correct / v.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {wrongAnswers.length > 0 && <Button onClick={reviewWrong}>Review {wrongAnswers.length} wrong</Button>}
            {quizResults?.weakestTopics[0] && (
              <Button variant="outline" className="border-[var(--color-surface-dark-3)] text-white" onClick={drillWeakest}>
                Drill {quizResults.weakestTopics[0].topic}
              </Button>
            )}
            <Button variant="outline" className="border-[var(--color-surface-dark-3)] text-white" onClick={backToHub}>
              Back to hub
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex flex-1 gap-1">
              {session.questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < index ? "bg-brand-500" : i === index ? "bg-white" : "bg-[var(--color-surface-dark-2)]"}`}
                />
              ))}
            </div>
            <span className="ml-4 shrink-0 text-xs text-ink-400">
              {index + 1} / {session.questions.length} · esc pauses
            </span>
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">{q.topic}</p>
          <p className="mt-1 text-[22px] font-bold">{q.prompt}</p>

          <div className="mt-5 flex-1">
            {q.type === "mcq" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {q.choices.map((choice, i) => {
                  const answered = phase === "feedback";
                  let style = "border-[var(--color-surface-dark-3)] hover:bg-[var(--color-surface-dark-1)]";
                  if (answered) {
                    if (i === q.answerIndex) style = "border-ok-600 bg-[var(--color-ok-50)]/10 text-ok-600";
                    else if (i === picked) style = "border-brand-500 bg-brand-900/30 text-brand-400";
                    else style = "border-[var(--color-surface-dark-3)] opacity-50";
                  }
                  return (
                    <button
                      key={i}
                      disabled={answered}
                      onClick={() => {
                        setPicked(i);
                        record(i === q.answerIndex);
                      }}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[15px] transition-colors ${style}`}
                    >
                      <span className="grid size-[22px] shrink-0 place-items-center rounded bg-[var(--color-surface-dark-2)] text-xs font-bold">{i + 1}</span>
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "true_false" && (
              <div className="grid max-w-md gap-2 sm:grid-cols-2">
                {[true, false].map((value) => {
                  const answered = phase === "feedback";
                  let style = "border-[var(--color-surface-dark-3)] hover:bg-[var(--color-surface-dark-1)]";
                  if (answered) {
                    if (value === q.answer) style = "border-ok-600 text-ok-600";
                    else if (picked === (value ? 1 : 0)) style = "border-brand-500 text-brand-400";
                    else style = "border-[var(--color-surface-dark-3)] opacity-50";
                  }
                  return (
                    <button
                      key={String(value)}
                      disabled={answered}
                      onClick={() => {
                        setPicked(value ? 1 : 0);
                        record(value === q.answer);
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium ${style}`}
                    >
                      {value ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                      {value ? "Richtig" : "Falsch"}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "fill_blank" && (
              <form
                className="flex max-w-md gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim() || phase === "feedback") return;
                  record(isAnswerAccepted(draft, q.accepted));
                }}
              >
                <input
                  autoFocus
                  disabled={phase === "feedback"}
                  className={`flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm text-white ${
                    phase === "feedback" ? (lastCorrect ? "border-ok-600" : "border-brand-500") : "border-[var(--color-surface-dark-3)]"
                  }`}
                  placeholder="Type your answer…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                {phase !== "feedback" && (
                  <Button size="sm" disabled={!draft.trim()}>
                    Check
                  </Button>
                )}
              </form>
            )}
          </div>

          {phase === "feedback" && (
            <div className="mt-4 border-t border-[var(--color-surface-dark-2)] pt-4">
              <div className="border-l-2 border-[var(--color-surface-dark-3)] pl-3.5">
                <p className="text-[13px] text-ink-400">{synthesizedExplanation(q)}</p>
                <p className="mt-1 text-xs text-ink-400">
                  Topic: {q.topic} · this question now counts toward that topic's mastery
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!session.reviewOnly && <Button onClick={advance}>Next question</Button>}
                {session.reviewOnly && (
                  <Button onClick={advance}>{index === session.questions.length - 1 ? "Finish review" : "Next"}</Button>
                )}
                {notebookState.status === "idle" && (
                  <Button variant="outline" className="border-[var(--color-surface-dark-3)] text-white" loading={addToNotebook.isPending} onClick={() => addToNotebook.mutate(undefined)}>
                    Add to notebook
                  </Button>
                )}
                {notebookState.status === "saved" && <span className="text-xs text-ok-600">Added to notebook</span>}
                {!session.reviewOnly && <span className="text-xs text-ink-400">↵ next</span>}
              </div>
              {notebookState.status === "pick" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-ink-400">Which station?</span>
                  {notebookState.candidates.map((theme) => (
                    <button
                      key={theme}
                      onClick={() => addToNotebook.mutate(theme)}
                      className="rounded-full border border-[var(--color-surface-dark-3)] px-2 py-0.5 text-xs hover:bg-[var(--color-surface-dark-1)]"
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "question" && (
            <div className="mt-4 flex gap-4 border-t border-[var(--color-surface-dark-2)] pt-3 text-xs text-ink-400">
              <span>↑ ↓ move</span>
              <span>1–3 pick</span>
              <span>↵ next</span>
              <button onClick={() => record(false)} className="ml-auto hover:text-white">
                Skip question
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type {
  CefrLevel,
  GoetheReadiness,
  RoadmapReviewSummary,
  RoadmapSkill,
  SessionQuestion,
  TopicBreakdown,
} from "../../api/types";
import FillBar from "../../components/FillBar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { isAnswerAccepted } from "../../lib/quiz";

const fmtShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

const SKILL_LABEL: Record<RoadmapSkill, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  bureaucracy: "Deutschland Context",
  milestone: "Milestone",
  reflection: "Rest/Reflection",
};

function ReviewSummaryBody({ summary }: { summary: RoadmapReviewSummary }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-600">Tasks completed</span>
          <span className="font-medium">
            {summary.tasksCompleted}/{summary.tasksTotal}
          </span>
        </div>
        <FillBar percent={summary.tasksTotal === 0 ? 0 : Math.round((summary.tasksCompleted / summary.tasksTotal) * 100)} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <p className="text-ink-600">
          Vocab added <span className="float-right font-medium text-ink-900">{summary.vocabAdded}</span>
        </p>
        <p className="text-ink-600">
          Vocab reviewed <span className="float-right font-medium text-ink-900">{summary.vocabReviewed}</span>
        </p>
        <p className="text-ink-600">
          Grammar completed <span className="float-right font-medium text-ink-900">{summary.grammarCompleted.length}</span>
        </p>
        <p className="text-ink-600">
          Minutes logged <span className="float-right font-medium text-ink-900">{summary.loggedMinutes}</span>
        </p>
      </div>
      <p className="text-xs text-ink-400">
        {summary.tasksWithLoggedTime} of {summary.tasksCompleted} completed tasks had time logged — self-reported, not
        automatically tracked.
      </p>

      {summary.bySkill.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">By skill</h4>
          <div className="mt-1 space-y-1">
            {summary.bySkill.map((s) => (
              <div key={s.skill} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{SKILL_LABEL[s.skill]}</span>
                <span>
                  {s.done}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.weakAreas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">Weak areas (self-test topics)</h4>
          <div className="mt-1 space-y-1">
            {summary.weakAreas.slice(0, 5).map((w) => (
              <div key={w.topic} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{w.topic}</span>
                <span className={w.percent < 60 ? "text-danger-600" : "text-ink-900"}>
                  {w.correct}/{w.total} ({w.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WeeklyReviewSection() {
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview() });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <h3 className="font-semibold">
        Week of {fmtShort(data.weekStart)} – {fmtShort(data.weekEnd)}
      </h3>
      <div className="mt-3">
        <ReviewSummaryBody summary={data} />
      </div>
    </Card>
  );
}

export function MonthlyReviewSection() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap", "review", "month", month],
    queryFn: () => api.roadmapMonthlyReview(month),
  });

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <button className="flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-paper" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Prev
        </button>
        <h3 className="font-semibold">
          {new Date(month + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h3>
        <button className="flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:bg-paper" onClick={() => shiftMonth(1)}>
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data ? <ReviewSummaryBody summary={data} /> : null}
    </Card>
  );
}

const READINESS_VARIANT: Record<GoetheReadiness["readinessLabel"], "neutral" | "brand" | "success"> = {
  "not started": "neutral",
  building: "brand",
  "ready soon": "success",
  "exam ready": "success",
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export function GoetheReadinessSection() {
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "readiness"], queryFn: api.goetheReadiness });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  const TrendIcon = data.trend ? TREND_ICON[data.trend] : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Goethe readiness — {data.level.toUpperCase()}</h3>
        <Badge variant={READINESS_VARIANT[data.readinessLabel]} size="md">
          {data.readinessLabel}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-ink-400">
        A rough estimate from your syllabus progress and recent self-tests — not an exam guarantee.
      </p>
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-600">Syllabus complete</span>
          <span className="font-medium">{data.syllabusPercent}%</span>
        </div>
        <FillBar percent={data.syllabusPercent} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <p className="text-ink-600">
          Avg. recent test score{" "}
          <span className="float-right font-medium text-ink-900">
            {data.avgRecentTestScore === null ? "—" : `${data.avgRecentTestScore}%`}
          </span>
        </p>
        <p className="flex items-center justify-between text-ink-600">
          Trend
          <span className="font-medium text-ink-900">
            {TrendIcon ? <TrendIcon className="size-4" aria-hidden="true" /> : "—"}
          </span>
        </p>
      </div>
    </Card>
  );
}

// ── Self-tests ──

interface AnswerRecord {
  qid: string;
  topic: string;
  level: CefrLevel;
  correct: boolean;
}

export function TestsSection() {
  const [session, setSession] = useState<{ questions: SessionQuestion[]; level: CefrLevel } | null>(
    null,
  );

  return (
    <div className="space-y-6">
      {session ? (
        <TestRunner session={session} onDone={() => setSession(null)} />
      ) : (
        <TestLauncher onStart={setSession} />
      )}
      {!session && <TestHistory />}
    </div>
  );
}

function TestLauncher({
  onStart,
}: {
  onStart: (s: { questions: SessionQuestion[]; level: CefrLevel }) => void;
}) {
  const [size, setSize] = useState(12);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => api.startSelfTest({ size }),
    onSuccess: (data) => {
      setError(null);
      onStart(data);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not start the test"),
  });

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Test yourself</h2>
        <p className="text-sm text-ink-600">
          A mixed test built for your current level — grammar, real-life situations, and your own
          vocabulary. It adapts to your recent scores, never repeats recent questions, and never
          touches your review schedule.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-hairline bg-paper px-2 py-1.5 text-sm"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {[8, 12, 20].map((n) => (
            <option key={n} value={n}>
              {n} questions
            </option>
          ))}
        </select>
        <Button size="sm" loading={start.isPending} onClick={() => start.mutate()}>
          Start test
        </Button>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </Card>
  );
}

function TestRunner({
  session,
  onDone,
}: {
  session: { questions: SessionQuestion[]; level: CefrLevel };
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { questions } = session;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [phase, setPhase] = useState<"answering" | "feedback" | "finished">("answering");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const submit = useMutation({
    mutationFn: (records: AnswerRecord[]) => {
      const byTopic = new Map<string, TopicBreakdown>();
      for (const r of records) {
        const key = `${r.topic}|${r.level}`;
        const entry = byTopic.get(key) ?? { topic: r.topic, level: r.level, correct: 0, total: 0 };
        entry.total += 1;
        if (r.correct) entry.correct += 1;
        byTopic.set(key, entry);
      }
      return api.submitQuizResult({
        score: records.filter((r) => r.correct).length,
        total: records.length,
        kind: "mixed",
        level: session.level,
        questionIds: records.map((r) => r.qid),
        breakdown: [...byTopic.values()],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning", "quizResults"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const q = questions[index];

  function record(correct: boolean) {
    const next = [...answers, { qid: q.qid, topic: q.topic, level: q.level, correct }];
    setAnswers(next);
    setLastCorrect(correct);
    if (index === questions.length - 1) {
      setPhase("finished");
      submit.mutate(next);
    } else {
      setPhase("feedback");
    }
  }

  function advance() {
    setIndex(index + 1);
    setPicked(null);
    setDraft("");
    setPhase("answering");
  }

  if (phase === "finished") {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const entry = byTopic.get(a.topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.correct) entry.correct += 1;
      byTopic.set(a.topic, entry);
    }
    return (
      <Card padding="lg" className="space-y-4 text-center">
        <p className="text-3xl font-semibold">
          {score} / {questions.length}
        </p>
        <p className="text-ink-600">
          {pct}% correct{pct === 100 ? " — perfekt!" : pct >= 80 ? " — sehr gut!" : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[...byTopic.entries()].map(([topic, t]) => (
            <Badge key={topic} variant={t.correct === t.total ? "success" : t.correct === 0 ? "danger" : "neutral"}>
              {topic} {t.correct}/{t.total}
            </Badge>
          ))}
        </div>
        <Button onClick={onDone}>Done</Button>
      </Card>
    );
  }

  const answered = phase === "feedback";

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between text-sm text-ink-600">
        <span>
          Question {index + 1} of {questions.length}
          <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs uppercase">{q.level}</span>
          <span className="ml-1 text-xs text-ink-400">{q.topic}</span>
        </span>
        <span>
          Score {answers.filter((a) => a.correct).length}
          <button className="ml-3 text-ink-400 hover:text-danger-600" onClick={onDone}>
            Quit
          </button>
        </span>
      </div>

      <p className="text-xl font-semibold">{q.prompt}</p>

      {q.type === "mcq" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.choices.map((choice, i) => {
            let style = "border-hairline hover:bg-paper";
            if (answered) {
              if (i === q.answerIndex) style = "border-ok-600 bg-ok-50 text-ok-600";
              else if (i === picked) style = "border-danger-600 bg-danger-50 text-danger-600";
              else style = "border-hairline opacity-60";
            }
            return (
              <button
                key={i}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${style}`}
                disabled={answered}
                onClick={() => {
                  setPicked(i);
                  record(i === q.answerIndex);
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "true_false" && (
        <div className="grid max-w-md gap-2 sm:grid-cols-2">
          {[true, false].map((value) => {
            let style = "border-hairline hover:bg-paper";
            if (answered) {
              if (value === q.answer) style = "border-ok-600 bg-ok-50 text-ok-600";
              else if (picked === (value ? 1 : 0)) style = "border-danger-600 bg-danger-50 text-danger-600";
              else style = "border-hairline opacity-60";
            }
            return (
              <button
                key={String(value)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${style}`}
                disabled={answered}
                onClick={() => {
                  setPicked(value ? 1 : 0);
                  record(value === q.answer);
                }}
              >
                {value ? (
                  <>
                    <Check className="size-4" aria-hidden="true" /> Richtig
                  </>
                ) : (
                  <>
                    <X className="size-4" aria-hidden="true" /> Falsch
                  </>
                )}
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
            if (!draft.trim() || answered) return;
            record(isAnswerAccepted(draft, q.accepted));
          }}
        >
          <input
            autoFocus
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              answered
                ? lastCorrect
                  ? "border-ok-600 bg-ok-50"
                  : "border-danger-600 bg-danger-50"
                : "border-hairline bg-paper"
            }`}
            placeholder="Type your answer…"
            value={draft}
            disabled={answered}
            onChange={(e) => setDraft(e.target.value)}
          />
          {!answered && (
            <Button size="sm" disabled={!draft.trim()}>
              Check
            </Button>
          )}
        </form>
      )}

      {answered && (
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${lastCorrect ? "text-ok-600" : "text-danger-600"}`}>
            {lastCorrect ? "Richtig!" : "Leider falsch."}
          </span>
          {!lastCorrect && q.type === "fill_blank" && (
            <span className="text-sm text-ink-600">
              Answer: <span className="font-medium text-ink-900">{q.accepted[0]}</span>
            </span>
          )}
          <Button size="sm" onClick={advance}>
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}

function TestHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "quizResults"],
    queryFn: api.quizResults,
  });

  if (isLoading || !data || data.results.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Recent results</h2>
        <p className="text-sm text-ink-600">
          Best {data.best}% · average {data.avg}%
        </p>
      </div>
      <div className="space-y-1.5">
        {data.results.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-2 text-sm"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {r.score} / {r.total}
              </span>
              {r.level && (
                <span className="rounded-full bg-paper px-2 py-0.5 text-xs uppercase">{r.level}</span>
              )}
              <span className="text-ink-600">
                {r.kind === "mixed" ? "mixed test" : "vocab quiz"}
                {r.lesson ? ` · ${r.lesson}` : ""}
              </span>
            </span>
            <span className="text-ink-400">{new Date(r.takenAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

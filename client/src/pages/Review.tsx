import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Clock, PartyPopper, Volume2 } from "lucide-react";
import { api, playWordAudio } from "../api/client";
import type { Grade, Word } from "../api/types";
import { Badge } from "../components/ui/Badge";
import { Button, buttonVariants } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";

const SECTIONS = [
  { key: "practice", label: "Practice" },
  { key: "history", label: "History" },
  { key: "weak", label: "Weak words" },
  { key: "stats", label: "Stats" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

export default function Review() {
  const [section, setSection] = useState<Section>("practice");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Review</h1>
          <p className="text-sm text-ink-600">Spaced-repetition vocabulary practice.</p>
        </div>
        <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
      </div>

      {section === "practice" && <PracticeSection />}
      {section === "history" && <HistorySection />}
      {section === "weak" && <WeakWordsSection />}
      {section === "stats" && <StatsSection />}
    </div>
  );
}

function PracticeSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: api.reviewQueue,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [queue, setQueue] = useState<Word[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<Record<Grade, number>>({ hard: 0, good: 0, easy: 0 });
  const [newBadges, setNewBadges] = useState<{ label: string }[]>([]);

  useEffect(() => {
    if (data && queue === null) setQueue([...data.due, ...data.fresh]);
  }, [data, queue]);

  const grade = useMutation({
    mutationFn: ({ wordId, g }: { wordId: string; g: Grade }) => api.gradeWord(wordId, g),
    onSuccess: (res, { g }) => {
      setDone((d) => ({ ...d, [g]: d[g] + 1 }));
      setQueue((q) => (q ? q.slice(1) : q));
      setRevealed(false);
      if (res.newlyUnlockedBadges.length > 0) setNewBadges((b) => [...b, ...res.newlyUnlockedBadges]);
      queryClient.invalidateQueries({ queryKey: ["reviews", "history"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "weak-words"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "stats"] });
    },
  });

  if (isLoading || queue === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="mx-auto h-4 w-32" />
        <SkeletonCard className="h-56" />
      </div>
    );
  }

  const current = queue[0];
  const total = Object.values(done).reduce((a, b) => a + b, 0);

  if (!current) {
    return (
      <Card padding="lg" className="mx-auto max-w-md text-center">
        <PartyPopper className="mx-auto size-8 text-brand-500" aria-hidden="true" />
        <h1 className="mt-2 text-lg font-semibold">Session complete</h1>
        {total > 0 ? (
          <p className="mt-1 text-sm text-ink-600">
            {total} reviewed — {done.easy} easy · {done.good} good · {done.hard} hard
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-600">Nothing due right now. Komm morgen wieder!</p>
        )}
        {newBadges.length > 0 && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-brand-700">
            <Award className="size-4" aria-hidden="true" />
            New badge{newBadges.length === 1 ? "" : "s"}: {newBadges.map((b) => b.label).join(", ")}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/" className={buttonVariants({ variant: "primary" })}>
            Dashboard
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setQueue(null);
              setDone({ hard: 0, good: 0, easy: 0 });
              queryClient.invalidateQueries({ queryKey: ["review-queue"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          >
            Check for more
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-3 text-center text-xs text-ink-400">
        {queue.length} remaining · {total} done
      </p>
      {newBadges.length > 0 && (
        <p className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-center text-sm text-brand-700">
          <Award className="mr-1 inline size-4" aria-hidden="true" />
          New badge{newBadges.length === 1 ? "" : "s"}: {newBadges.map((b) => b.label).join(", ")}
        </p>
      )}
      <Card padding="lg" className="text-center">
        <div className="text-2xl font-semibold">{current.headword}</div>
        {current.srDue === null && (
          <Badge variant="brand" className="mt-1">
            new card
          </Badge>
        )}

        {revealed ? (
          <div className="mt-5 space-y-2 border-t border-hairline pt-5 text-left text-sm">
            {current.ipa && <p className="text-center text-ink-400">/{current.ipa}/</p>}
            {current.meaning && <p>{current.meaning}</p>}
            {current.grammar && (
              <p>
                <span className="text-ink-400">Grammar </span>
                {current.grammar}
              </p>
            )}
            {current.example && (
              <p>
                <span className="text-ink-400">Example </span>
                <em>{current.example}</em>
              </p>
            )}
            {current.audioPath && (
              <p className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Volume2 className="size-3.5" aria-hidden="true" />}
                  onClick={() => void playWordAudio(current.id)}
                >
                  Play
                </Button>
              </p>
            )}
          </div>
        ) : (
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => {
              setRevealed(true);
              if (current.audioPath) void playWordAudio(current.id).catch(() => {});
            }}
          >
            Show answer
          </Button>
        )}
      </Card>

      {revealed && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["hard", "Hard", "border-danger-100 text-danger-700 hover:bg-danger-50"],
              ["good", "Good", "border-hairline text-ink-900 hover:bg-paper"],
              ["easy", "Easy", "border-ok-100 text-ok-700 hover:bg-ok-50"],
            ] as const
          ).map(([g, label, cls]) => (
            <button
              key={g}
              disabled={grade.isPending}
              className={`rounded-md border bg-card px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${cls}`}
              onClick={() => grade.mutate({ wordId: current.id, g })}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const GRADE_VARIANT: Record<Grade, "danger" | "neutral" | "success"> = {
  hard: "danger",
  good: "neutral",
  easy: "success",
};

function HistorySection() {
  const { data, isLoading } = useQuery({ queryKey: ["reviews", "history"], queryFn: () => api.reviewHistory(100) });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (!data || data.entries.length === 0) {
    return <EmptyState icon={Clock} title="No reviews yet" description="Practice a few cards to build up history." />;
  }

  return (
    <div className="space-y-1.5">
      {data.entries.map((e) => (
        <div
          key={e.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{e.headword}</span>
            <Badge variant={GRADE_VARIANT[e.grade]} className="capitalize">
              {e.grade}
            </Badge>
          </span>
          <span className="text-ink-400">
            {new Date(e.reviewedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · next in{" "}
            {e.intervalAfter}d
          </span>
        </div>
      ))}
    </div>
  );
}

function WeakWordsSection() {
  const { data, isLoading } = useQuery({ queryKey: ["reviews", "weak-words"], queryFn: () => api.reviewWeakWords(50) });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (!data || data.words.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="No weak words right now"
        description='Anything most recently graded "hard" shows up here.'
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-600">
        Words whose most recent grade was "hard" — worth another look next time you review.
      </p>
      <div className="space-y-1.5">
        {data.words.map((w) => (
          <div
            key={w.wordId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm"
          >
            <span className="font-medium">{w.headword}</span>
            <span className="text-ink-400">
              last reviewed {new Date(w.lastReviewedAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSection() {
  const { data, isLoading } = useQuery({ queryKey: ["reviews", "stats"], queryFn: api.reviewStats });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
        <SkeletonCard className="h-32" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-2xl font-semibold">{data.reviewsToday}</p>
          <p className="text-xs text-ink-400">Today</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{data.reviewsThisWeek}</p>
          <p className="text-xs text-ink-400">Last 7 days</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{data.totalReviews}</p>
          <p className="text-xs text-ink-400">All time</p>
        </Card>
      </div>
      <Card>
        <h3 className="font-semibold">Grade breakdown</h3>
        <div className="mt-2 space-y-1.5">
          {(["easy", "good", "hard"] as const).map((g) => {
            const count = data.gradeBreakdown[g];
            const percent = data.totalReviews === 0 ? 0 : Math.round((count / data.totalReviews) * 100);
            return (
              <div key={g} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 capitalize text-ink-600">{g}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                  <div
                    className={`h-full ${g === "hard" ? "bg-danger-600" : g === "good" ? "bg-ink-400" : "bg-ok-600"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-ink-400">
                  {count} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
        {data.avgIntervalAfter !== null && (
          <p className="mt-3 text-xs text-ink-400">
            Average interval after grading: {data.avgIntervalAfter} day{data.avgIntervalAfter === 1 ? "" : "s"}.
          </p>
        )}
      </Card>
    </div>
  );
}

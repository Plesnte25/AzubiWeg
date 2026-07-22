import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, playWordAudio } from "../api/client";
import type { Grade, Word } from "../api/types";

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
        <div className="flex gap-1 rounded-full border border-hairline bg-card p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                section === s.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper"
              }`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
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

  if (isLoading || queue === null) return <p className="text-ink-600">Loading…</p>;

  const current = queue[0];
  const total = Object.values(done).reduce((a, b) => a + b, 0);

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-hairline bg-card p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-2 text-lg font-semibold">Session complete</h1>
        {total > 0 ? (
          <p className="mt-1 text-sm text-ink-600">
            {total} reviewed — {done.easy} easy · {done.good} good · {done.hard} hard
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-600">Nothing due right now. Komm morgen wieder!</p>
        )}
        {newBadges.length > 0 && (
          <p className="mt-2 text-sm text-brand-600">
            🏅 New badge{newBadges.length === 1 ? "" : "s"}: {newBadges.map((b) => b.label).join(", ")}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/" className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white">
            Dashboard
          </Link>
          <button
            className="rounded-md border border-hairline px-4 py-2 text-sm"
            onClick={() => {
              setQueue(null);
              setDone({ hard: 0, good: 0, easy: 0 });
              queryClient.invalidateQueries({ queryKey: ["review-queue"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          >
            Check for more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-3 text-center text-xs text-ink-400">
        {queue.length} remaining · {total} done
      </p>
      {newBadges.length > 0 && (
        <p className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-center text-sm text-brand-600">
          🏅 New badge{newBadges.length === 1 ? "" : "s"}: {newBadges.map((b) => b.label).join(", ")}
        </p>
      )}
      <div className="rounded-xl border border-hairline bg-card p-8 text-center shadow-sm">
        <div className="text-2xl font-semibold">{current.headword}</div>
        {current.srDue === null && (
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
            new card
          </span>
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
                <button
                  className="rounded-full border border-hairline px-3 py-1 text-sm hover:bg-paper"
                  onClick={() => void playWordAudio(current.id)}
                >
                  🔊 Play
                </button>
              </p>
            )}
          </div>
        ) : (
          <button
            className="mt-6 w-full rounded-md bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
            onClick={() => {
              setRevealed(true);
              if (current.audioPath) void playWordAudio(current.id).catch(() => {});
            }}
          >
            Show answer
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["hard", "Hard", "border-red-300 text-red-800 hover:bg-red-50"],
              ["good", "Good", "border-hairline text-ink-900 hover:bg-paper"],
              ["easy", "Easy", "border-green-300 text-green-800 hover:bg-green-50"],
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

const GRADE_STYLE: Record<Grade, string> = {
  hard: "border-red-300 bg-red-50 text-red-800",
  good: "border-hairline bg-paper text-ink-900",
  easy: "border-green-300 bg-green-50 text-green-800",
};

function HistorySection() {
  const { data, isLoading } = useQuery({ queryKey: ["reviews", "history"], queryFn: () => api.reviewHistory(100) });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!data || data.entries.length === 0) {
    return (
      <p className="rounded-xl border border-hairline bg-card p-6 text-center text-ink-400">
        No reviews yet — practice a few cards to build up history.
      </p>
    );
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
            <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${GRADE_STYLE[e.grade]}`}>
              {e.grade}
            </span>
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

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!data || data.words.length === 0) {
    return (
      <p className="rounded-xl border border-hairline bg-card p-6 text-center text-ink-400">
        No weak words right now — anything most recently graded "hard" shows up here.
      </p>
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
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-600/30 bg-danger-50 px-3 py-2 text-sm"
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

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{data.reviewsToday}</p>
          <p className="text-xs text-ink-400">Today</p>
        </div>
        <div className="rounded-xl border border-hairline bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{data.reviewsThisWeek}</p>
          <p className="text-xs text-ink-400">Last 7 days</p>
        </div>
        <div className="rounded-xl border border-hairline bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{data.totalReviews}</p>
          <p className="text-xs text-ink-400">All time</p>
        </div>
      </div>
      <div className="rounded-xl border border-hairline bg-card p-4">
        <h3 className="font-semibold">Grade breakdown</h3>
        <div className="mt-2 space-y-1.5">
          {(["easy", "good", "hard"] as const).map((g) => {
            const count = data.gradeBreakdown[g];
            const percent = data.totalReviews === 0 ? 0 : Math.round((count / data.totalReviews) * 100);
            return (
              <div key={g} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 capitalize text-ink-600">{g}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                  <div className={`h-full ${g === "hard" ? "bg-red-400" : g === "good" ? "bg-ink-400" : "bg-green-400"}`} style={{ width: `${percent}%` }} />
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
      </div>
    </div>
  );
}

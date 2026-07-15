import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, playWordAudio } from "../api/client";
import type { Grade, Word } from "../api/types";

export default function Review() {
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

  useEffect(() => {
    if (data && queue === null) setQueue([...data.due, ...data.fresh]);
  }, [data, queue]);

  const grade = useMutation({
    mutationFn: ({ wordId, g }: { wordId: string; g: Grade }) => api.gradeWord(wordId, g),
    onSuccess: (_res, { g }) => {
      setDone((d) => ({ ...d, [g]: d[g] + 1 }));
      setQueue((q) => (q ? q.slice(1) : q));
      setRevealed(false);
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

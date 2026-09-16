import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { Grade, Word } from "../../api/types";

export type QueueOrder = "due-first" | "new-first" | "shuffle";

export function orderQueue(due: Word[], fresh: Word[], order: QueueOrder): Word[] {
  if (order === "new-first") return [...fresh, ...due];
  if (order === "shuffle") {
    const all = [...due, ...fresh];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j]!, all[i]!];
    }
    return all;
  }
  return [...due, ...fresh];
}

/**
 * The review-session state machine (queue ordering, grading, cache
 * invalidation, mid-session leech toggling, elapsed-time tracking) — used by
 * the single Nocturne review screen (client/src/pages/review/ReviewSession.tsx)
 * at every breakpoint. Ported from the pre-Nocturne split of the same name
 * (formerly shared by PracticeOverlay/ReviewModal, one per breakpoint).
 */
export function useReviewSession({ words }: { words?: Word[] }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: api.reviewQueue,
    enabled: words === undefined,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [queue, setQueue] = useState<Word[] | null>(words ?? null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<Record<Grade, number>>({ hard: 0, good: 0, easy: 0 });
  const startedAtRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (words === undefined && data && queue === null) setQueue(orderQueue(data.due, data.fresh, "due-first"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, queue, words]);

  // staleTime: Infinity above is deliberate -- it keeps this session's queue
  // frozen (no reshuffling mid-session if some other invalidation fires) --
  // but that same freeze must not survive past this mount, or reopening
  // Review after a partial/interrupted session replays the untouched
  // pre-session snapshot instead of the real remaining due list (each grade
  // is already persisted server-side immediately; only this client cache was
  // stale). removeQueries (not invalidateQueries) on unmount: invalidating
  // still lets the next mount's useQuery synchronously return the now-stale
  // cached data on its first render, and the `queue === null` guard above
  // then locks that stale snapshot in before the background refetch it
  // triggers resolves. Removing the cache entry outright means the next
  // mount starts with no data at all, so `queue` only ever gets seeded once
  // a real network round trip against current srDue values completes.
  useEffect(() => {
    if (words !== undefined) return;
    return () => {
      queryClient.removeQueries({ queryKey: ["review-queue"] });
    };
  }, [queryClient, words]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const grade = useMutation({
    mutationFn: ({ wordId, g }: { wordId: string; g: Grade }) => api.gradeWord(wordId, g),
    onSuccess: (_res, { g }) => {
      setDone((d) => ({ ...d, [g]: d[g] + 1 }));
      setQueue((q) => (q ? q.slice(1) : q));
      setRevealed(false);
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "history"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "weak-words"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "stats"] });
    },
  });

  const loading = words === undefined && (isLoading || queue === null);
  const current = queue?.[0] ?? null;
  const total = Object.values(done).reduce((a, b) => a + b, 0);
  const remaining = queue?.length ?? 0;
  const sessionSize = remaining + total;
  const progressPercent = sessionSize === 0 ? 0 : Math.round((total / sessionSize) * 100);

  return {
    loading,
    queue: queue ?? [],
    current,
    total,
    remaining,
    sessionSize,
    progressPercent,
    revealed,
    setRevealed,
    done,
    grade,
    elapsedSeconds,
  };
}

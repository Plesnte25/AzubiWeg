import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { Grade, Word } from "../../api/types";
import { toast } from "../../components/ui/Toast";

/*
 * The review-session state machine (AzubiReview.dc.html §2.7): a tagged queue, an index, the grades given this
 * session, and undo snapshots. Every grade is saved to the server straight away (it writes the schedule, and the
 * vault when linked); Again also puts the card back into this session 4 places later. Undo reverts the last grade on
 * the server (POST /reviews/:id/undo) and restores the snapshot.
 */

export type CardTag = "Due" | "New" | "Shaky";
export interface QueueItem {
  word: Word;
  tag: CardTag;
}
export interface GradedEntry {
  wordId: string;
  grade: Grade;
}
interface Snapshot {
  queue: QueueItem[];
  idx: number;
  graded: GradedEntry[];
}

/** Again re-inserts the card this many places later (or at the end). */
const AGAIN_GAP = 4;

/** A card's tag from its own state, for curated sessions (drills) that don't come from the queue endpoint. */
function tagFor(word: Word): CardTag {
  if (!word.srDue) return "New";
  return word.strength === 1 || word.strength === 2 ? "Shaky" : "Due";
}

export function useReviewSession({ words }: { words?: Word[] }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: api.reviewQueue,
    enabled: words === undefined,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [queue, setQueue] = useState<QueueItem[] | null>(words ? words.map((w) => ({ word: w, tag: tagFor(w) })) : null);
  const [initial, setInitial] = useState<QueueItem[] | null>(queue);
  const [idx, setIdx] = useState(0);
  const [graded, setGraded] = useState<GradedEntry[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [flipped, setFlipped] = useState(false);
  const startedAtRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (words === undefined && data && queue === null) {
      const q: QueueItem[] = [
        ...data.due.map((w) => ({ word: w, tag: "Due" as const })),
        ...data.fresh.map((w) => ({ word: w, tag: "New" as const })),
        ...data.shaky.map((w) => ({ word: w, tag: "Shaky" as const })),
      ];
      setQueue(q);
      setInitial(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, queue, words]);

  // staleTime: Infinity keeps this session's queue frozen, but the snapshot must not outlive the mount: reopening
  // Review has to start from the real remaining due list, so the cache entry is removed (not invalidated) on unmount.
  useEffect(() => {
    if (words !== undefined) return;
    return () => {
      queryClient.removeQueries({ queryKey: ["review-queue"] });
    };
  }, [queryClient, words]);

  const loading = words === undefined && (isLoading || queue === null);
  const total = queue?.length ?? 0;
  const done = !loading && idx >= total;

  // the timer counts while the session runs and stops on the done card
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [done]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["words"] });
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const gradeMutation = useMutation({
    mutationFn: ({ wordId, g }: { wordId: string; g: Grade }) => api.gradeWord(wordId, g),
    onSuccess: (_res, { wordId, g }) => {
      if (!queue) return;
      setHistory((h) => [...h, { queue, idx, graded }]);
      const next = queue.slice();
      if (g === "again") next.splice(Math.min(next.length, idx + AGAIN_GAP), 0, next[idx]!);
      setQueue(next);
      setIdx(idx + 1);
      setGraded([...graded, { wordId, grade: g }]);
      setFlipped(false);
      invalidate();
    },
    onError: () => toast.error("Couldn't save that grade · try again"),
  });

  const undoMutation = useMutation({
    mutationFn: (wordId: string) => api.undoReview(wordId),
    onSuccess: () => {
      const snap = history[history.length - 1];
      if (!snap) return;
      setQueue(snap.queue);
      setIdx(snap.idx);
      setGraded(snap.graded);
      setHistory(history.slice(0, -1));
      setFlipped(false);
      invalidate();
      toast.info("Undone");
    },
    onError: () => toast.error("Couldn't undo that"),
  });

  const current = queue && idx < queue.length ? queue[idx]! : null;
  const busy = gradeMutation.isPending || undoMutation.isPending;

  return {
    loading,
    done,
    current,
    queue: queue ?? [],
    idx,
    total,
    graded,
    flipped,
    setFlipped,
    elapsedSeconds,
    canUndo: history.length > 0 && !busy,
    busy,
    grade: (g: Grade) => current && !busy && gradeMutation.mutate({ wordId: current.word.id, g }),
    undo: () => {
      const last = graded[graded.length - 1];
      if (last && !busy) undoMutation.mutate(last.wordId);
    },
    /** Restart with only the cards graded Again this session. */
    drillAgain: () => {
      const ids = [...new Set(graded.filter((x) => x.grade === "again").map((x) => x.wordId))];
      const items = ids.map((id) => (queue ?? []).find((q) => q.word.id === id)!).filter(Boolean);
      restartWith(items);
    },
    restart: () => restartWith(initial ?? []),
  };

  function restartWith(items: QueueItem[]) {
    setQueue(items);
    setIdx(0);
    setGraded([]);
    setHistory([]);
    setFlipped(false);
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
  }
}

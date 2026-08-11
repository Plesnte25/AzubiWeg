import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Grade, Word } from "../../api/types";

export type QueueOrder = "due-first" | "new-first" | "shuffle";
export const ORDERS: { key: QueueOrder; label: string }[] = [
  { key: "due-first", label: "Due first" },
  { key: "new-first", label: "New first" },
  { key: "shuffle", label: "Shuffle" },
];

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
 * invalidation, mid-session leech toggling) — shared by `PracticeOverlay`
 * (lg, full-screen chrome) and `ReviewModal` (sm/md, centered
 * blurred-backdrop chrome). Extracted so this real, moderately complex
 * machine doesn't drift if copy-pasted between the two.
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

  const [order, setOrder] = useState<QueueOrder>("due-first");
  const [queue, setQueue] = useState<Word[] | null>(words ?? null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<Record<Grade, number>>({ hard: 0, good: 0, easy: 0 });

  useEffect(() => {
    if (words === undefined && data && queue === null) setQueue(orderQueue(data.due, data.fresh, order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, queue, words]);

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

  const toggleLeech = useMutation({
    mutationFn: (word: Word) => api.updateWord(word.id, { leech: !word.leech }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      setQueue((q) => q?.map((w) => (w.id === current?.id ? { ...w, leech: !w.leech } : w)) ?? q);
    },
  });

  const loading = words === undefined && (isLoading || queue === null);
  const current = queue?.[0] ?? null;
  const total = Object.values(done).reduce((a, b) => a + b, 0);
  const remaining = queue?.length ?? 0;
  const progressPercent = remaining + total === 0 ? 0 : Math.round((total / (remaining + total)) * 100);

  function changeOrder(next: QueueOrder) {
    setOrder(next);
    if (data) setQueue(orderQueue(data.due, data.fresh, next));
  }

  function checkForMore() {
    setQueue(null);
    setDone({ hard: 0, good: 0, easy: 0 });
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  return {
    loading,
    current,
    total,
    remaining,
    progressPercent,
    revealed,
    setRevealed,
    order,
    changeOrder,
    done,
    grade,
    toggleLeech,
    checkForMore,
    isGeneralQueue: words === undefined,
  };
}

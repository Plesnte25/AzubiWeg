import { bankQuestionStation } from "./checkpoint.js";
import type { MistakeSummary } from "./mistakes.js";
import { weakAreasFromBreakdowns } from "./review.js";

export type WeakSpot =
  | { source: "self_test"; label: string; topic: string; level: string | null; percent: number; answered: number }
  | { source: "mistakes"; label: string; category: string; count: number; topics: string[] };

/** Fewest self-test answers on a topic before its accuracy counts as a weak spot. */
export const MIN_ANSWERS = 3;

const MISTAKE_LABELS: Record<string, string> = {
  gender_article: "Articles (der/die/das)",
  case: "Cases",
  word_order: "Word order",
  conjugation: "Conjugation",
  vocabulary: "Vocabulary",
  spelling: "Spelling",
  pronunciation: "Pronunciation",
  listening_detail: "Listening details",
  collocation: "Collocations",
  other: "Other mistakes",
};

/**
 * Today's "Weak spot" tile (and the Checkpoint weak-spot chips): the weakest self-test topic with enough answers,
 * labelled with its Plan station name where the bank topic maps to one ("dativ" → "Dative case"); otherwise the
 * most frequent recent exercise mistake category; otherwise null (the tile shows its empty state).
 */
export function pickWeakSpot(
  breakdowns: { topic: string; level?: string | null; correct: number; total: number }[],
  mistakes: MistakeSummary[],
): WeakSpot | null {
  const levelByTopic = new Map(breakdowns.map((b) => [b.topic, b.level ?? null]));
  const weakest = weakAreasFromBreakdowns(breakdowns).find((w) => w.total >= MIN_ANSWERS && w.percent < 100);
  if (weakest) {
    const level = levelByTopic.get(weakest.topic) ?? null;
    const station = level ? bankQuestionStation({ level: level as "a1" | "a2" | "b1", topic: weakest.topic }) : null;
    const label = station ?? (weakest.topic === "vocabulary" ? "Vocabulary" : weakest.topic.replace(/-/g, " "));
    return { source: "self_test", label, topic: weakest.topic, level, percent: weakest.percent, answered: weakest.total };
  }
  const top = mistakes[0];
  if (top) return { source: "mistakes", label: MISTAKE_LABELS[top.category] ?? top.category, category: top.category, count: top.count, topics: top.topics };
  return null;
}

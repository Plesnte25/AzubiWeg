import { useMemo } from "react";
import type { SrsState, Word } from "../../api/types";

export interface VocabFilters {
  search: string;
  state: SrsState | "leech" | "all";
}

export const DEFAULT_FILTERS: VocabFilters = {
  search: "",
  state: "all",
};

function matchesFacet(word: Word, filters: VocabFilters, skip?: "search" | "state"): boolean {
  if (skip !== "search" && filters.search) {
    const haystack = `${word.headword} ${word.meaning ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  if (skip !== "state" && filters.state !== "all") {
    if (filters.state === "leech") {
      if (!word.leech) return false;
    } else if (word.state !== filters.state) return false;
  }
  return true;
}

function countBy<K extends string>(pool: Word[], key: (w: Word) => K[]): Record<K, number> {
  const counts = {} as Record<K, number>;
  for (const w of pool) {
    for (const k of key(w)) counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/**
 * State counts are cross-filtered against search (but not state itself), so
 * switching search narrows the counts shown on each state tab without one
 * tab's own count reshuffling under the cursor when you pick it.
 */
export function useVocabFacets(words: Word[], filters: VocabFilters) {
  return useMemo(() => {
    const filtered = words.filter((w) => matchesFacet(w, filters));
    const statePool = words.filter((w) => matchesFacet(w, filters, "state"));

    return {
      filtered,
      stateCounts: countBy(statePool, (w) => [w.leech ? "leech" : w.state]),
      totalInPool: words.length,
    };
  }, [words, filters]);
}

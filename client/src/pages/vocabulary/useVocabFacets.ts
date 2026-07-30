import { useMemo, useState } from "react";
import type { CefrLevel, Genus, SrsState, Themenfeld, Word, Wortart } from "../../api/types";

export interface VocabFilters {
  search: string;
  state: SrsState | "leech" | "all";
  level: CefrLevel | "all";
  wortart: Wortart | "all";
  genus: NonNullable<Genus> | "all";
  themenfeld: Themenfeld | "unclassified" | "all";
  lesson: string | "all";
}

export const DEFAULT_FILTERS: VocabFilters = {
  search: "",
  state: "all",
  level: "all",
  wortart: "all",
  genus: "all",
  themenfeld: "all",
  lesson: "all",
};

type FacetKey = keyof VocabFilters;

function matchesFacet(word: Word, filters: VocabFilters, skip?: FacetKey): boolean {
  if (skip !== "search" && filters.search) {
    const haystack = `${word.headword} ${word.meaning ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  if (skip !== "state" && filters.state !== "all") {
    if (filters.state === "leech") {
      if (!word.leech) return false;
    } else if (word.state !== filters.state) return false;
  }
  if (skip !== "level" && filters.level !== "all" && word.level !== filters.level) return false;
  if (skip !== "wortart" && filters.wortart !== "all" && word.wortart !== filters.wortart) return false;
  if (skip !== "genus" && filters.genus !== "all" && word.genus !== filters.genus) return false;
  if (skip !== "themenfeld" && filters.themenfeld !== "all") {
    if (filters.themenfeld === "unclassified") {
      if (word.themenfeld.length > 0) return false;
    } else if (!word.themenfeld.includes(filters.themenfeld)) return false;
  }
  if (skip !== "lesson" && filters.lesson !== "all" && (word.lesson ?? "") !== filters.lesson) return false;
  return true;
}

function matches(word: Word, filters: VocabFilters): boolean {
  return matchesFacet(word, filters);
}

function countBy<K extends string>(pool: Word[], key: (w: Word) => K[]): Record<K, number> {
  const counts = {} as Record<K, number>;
  for (const w of pool) {
    for (const k of key(w)) counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/**
 * Cross-filtered facet counts: each facet's counts are computed against the
 * *other* active facets, not the whole vault, so switching one filter
 * doesn't reshuffle another's counts under the cursor — ports facetPool(skip)
 * from design_handoff_azubiweg_vocabulary/design/Vocabulary.dc.html (~L938).
 */
export function useVocabFacets(words: Word[], filters: VocabFilters) {
  return useMemo(() => {
    const filtered = words.filter((w) => matches(w, filters));

    const statePool = words.filter((w) => matchesFacet(w, filters, "state"));
    const levelPool = words.filter((w) => matchesFacet(w, filters, "level"));
    const wortartPool = words.filter((w) => matchesFacet(w, filters, "wortart"));
    const genusPool = words.filter((w) => matchesFacet(w, filters, "genus"));
    const themePool = words.filter((w) => matchesFacet(w, filters, "themenfeld"));
    const lessonPool = words.filter((w) => matchesFacet(w, filters, "lesson"));

    return {
      filtered,
      stateCounts: countBy(statePool, (w) => [w.leech ? "leech" : w.state]),
      levelCounts: countBy(levelPool, (w) => (w.level ? [w.level] : [])),
      wortartCounts: countBy(wortartPool, (w) => [w.wortart]),
      genusCounts: countBy(genusPool, (w) => (w.genus ? [w.genus] : [])),
      themenfeldCounts: countBy(themePool, (w) => (w.themenfeld.length ? w.themenfeld : ["unclassified"])),
      lessonCounts: countBy(lessonPool, (w) => (w.lesson ? [w.lesson] : [])),
      totalInPool: words.length,
    };
  }, [words, filters]);
}

export function useVocabFiltersState() {
  return useState<VocabFilters>(DEFAULT_FILTERS);
}

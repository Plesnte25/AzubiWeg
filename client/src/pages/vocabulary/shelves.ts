import type { Word } from "../../api/types";
import { WORTART_COLORS, WORTART_ORDER } from "../../lib/vocab";

export type GroupBy = "wortart" | "az" | "woche";

export const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "wortart", label: "Wortart" },
  { key: "az", label: "A–Z" },
  { key: "woche", label: "Woche" },
];

export interface ShelfGroup {
  id: string;
  title: string;
  titleColor?: string;
  glyph?: string;
  words: Word[];
}

export const byHeadword = (a: Word, b: Word) => a.sortKey.localeCompare(b.sortKey);

export function buildShelves(words: Word[], groupBy: GroupBy): ShelfGroup[] {
  if (groupBy === "wortart") {
    return WORTART_ORDER.map((w) => ({
      id: `wortart-${w}`,
      title: w,
      glyph: "●",
      titleColor: WORTART_COLORS[w],
      words: words.filter((word) => word.wortart === w).sort(byHeadword),
    })).filter((s) => s.words.length > 0);
  }
  if (groupBy === "woche") {
    const map = new Map<string, Word[]>();
    for (const w of words) {
      const key = w.lesson ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return [...map.entries()]
      .map(([key, ws]) => ({ id: `woche-${key || "none"}`, title: key || "No lesson", words: ws.sort(byHeadword) }))
      .sort((a, b) => (a.title === "No lesson" ? 1 : b.title === "No lesson" ? -1 : a.title.localeCompare(b.title)));
  }
  // az
  const map = new Map<string, Word[]>();
  for (const w of words) {
    const letter = (w.sortKey[0] ?? "#").toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(w);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, ws]) => ({ id: `az-${letter}`, title: letter, words: ws.sort(byHeadword) }));
}

import type { Grade, ReviewHistoryEntry, Word } from "../api/types";
import { GENUS_BG, GENUS_COLORS, WORTART_COLORS } from "./vocab";

// last-N-review grade -> bar height, tiered the same way the handoff's demo
// bars are (taller/lighter = stronger); "hard" is the only real grade that
// lands in the 3rd tier below, "no review yet" pads with the dimmest one.
// Shared by the Words list's row sparkline (Vocabulary.tsx) and Word
// Detail's larger review-history chart (words/ReviewHistoryCard.tsx).
export const GRADE_HEIGHT: Record<Grade, number> = { hard: 6, good: 11, easy: 16 };
export const NO_DATA_HEIGHT = 3;
export const SPARKLINE_SLOTS = 6;

export function barColor(height: number): string {
  if (height > 13) return "#b5abfc";
  if (height > 8) return "#9184d9";
  if (height > 5) return "#5d5294";
  return "#3f424d";
}

/** Last `slots` grades (oldest -> newest, left to right), left-padded with
 * "no data" slots for a word with fewer than `slots` logged reviews. */
export function buildSparkline(grades: Grade[], slots: number = SPARKLINE_SLOTS): number[] {
  const recent = grades.slice(-slots);
  const padding = Array<number>(slots - recent.length).fill(NO_DATA_HEIGHT);
  return [...padding, ...recent.map((g) => GRADE_HEIGHT[g])];
}

export function chipLabel(word: Word): string {
  if (word.genus) return word.genus;
  if (word.wortart === "Verb") return "V";
  return word.wortart[0]!;
}

export function chipColor(word: Word): string {
  return word.genus ? GENUS_COLORS[word.genus] : WORTART_COLORS[word.wortart];
}

/** Gender-tinted badge background (der/die/das only) — a neutral fallback
 * for non-noun words, which have no genus to tint by. */
export function chipBg(word: Word): string {
  return word.genus ? GENUS_BG[word.genus] : "rgba(233,233,237,.08)";
}

/** "der"/"die"/"das"/"verb", or the lowercased wortart for anything else
 * (adjective, adverb, ...) — the article/kind label shown on Word Detail's
 * and the review card's header chip. */
export function fullArtLabel(word: Word): string {
  if (word.genus) return word.genus;
  if (word.wortart === "Verb") return "verb";
  return word.wortart.toLowerCase();
}

export interface SlippingWord {
  wordId: string;
  headword: string;
  streak: number;
}

/** "The one that keeps slipping" (Session Done's flagged-word row) — the
 * word on the longest unbroken streak of "hard" grades, walking each word's
 * own history newest-first and stopping at the first non-hard grade (this
 * app has no "again" grade — see ReviewSession.tsx's doc comment — so
 * "hard" is the honest equivalent of the handoff's "marked again"). Reuses
 * the same GET /api/reviews/history data every other review-history display
 * already fetches, no new endpoint. A streak of 1 isn't "keeps slipping"
 * yet, so returns null below that. */
export function findSlippingWord(entries: ReviewHistoryEntry[]): SlippingWord | null {
  const byWord = new Map<string, ReviewHistoryEntry[]>();
  for (const e of entries) {
    const list = byWord.get(e.wordId);
    if (list) list.push(e);
    else byWord.set(e.wordId, [e]);
  }
  let best: SlippingWord | null = null;
  for (const [wordId, logs] of byWord) {
    const sorted = [...logs].sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
    let streak = 0;
    for (const log of sorted) {
      if (log.grade !== "hard") break;
      streak++;
    }
    if (streak >= 2 && (!best || streak > best.streak)) {
      best = { wordId, headword: sorted[0]!.headword, streak };
    }
  }
  return best;
}

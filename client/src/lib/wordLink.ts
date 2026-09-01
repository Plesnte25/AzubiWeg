import type { Word } from "../api/types";
import { fullArtLabel } from "./wordDisplay";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Live "Link {word} to this note?" detection for the Note Editor — a
 * word-boundary, case-insensitive match of any loaded headword inside the
 * note's plain-text body (debounced by the caller). `excludeWordId` skips a
 * word already linked, so a match doesn't just re-prompt for the same word
 * on every keystroke. When several headwords match, the longest one wins
 * (e.g. typing "Wochenende" shouldn't surface a shorter, less specific
 * "Woche" match if both happen to be in the deck). */
export function findLinkableWord(bodyText: string, words: Word[], excludeWordId: string | null): Word | null {
  const text = bodyText.trim();
  if (!text) return null;
  let best: Word | null = null;
  for (const w of words) {
    if (w.id === excludeWordId || !w.headword) continue;
    const re = new RegExp(`\\b${escapeRegExp(w.headword)}\\b`, "i");
    if (re.test(text) && (!best || w.headword.length > best.headword.length)) best = w;
  }
  return best;
}

/** "die Wohnung" — article/kind + headword, for the link prompt and the
 * linked-word chip. */
export function wordLinkLabel(word: Word): string {
  return `${fullArtLabel(word)} ${word.headword}`;
}

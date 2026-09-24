import type { CSSProperties } from "react";
import type { Strength, Word } from "../api/types";

/*
 * Bento word display (AzubiWords.dc.html). One place for the article chip, the tile colour a word's detail takes,
 * and the 1–5 strength pips — Words, the review session and Stats all use these.
 */

/** Chip text: der/die/das for nouns with a known gender, "verb", else the short word type. */
export function articleLabel(word: Pick<Word, "genus" | "wortart">): string {
  if (word.genus) return word.genus;
  if (word.wortart === "Verb") return "verb";
  if (word.wortart === "Adjektiv") return "adj";
  if (word.wortart === "Adverb") return "adv";
  if (word.wortart === "Wendung") return "phrase";
  return "word";
}

/** README gender map (der sky · die pink · das mint · verb lilac); adjectives orange as in the Family tab. */
export function wordColor(word: Pick<Word, "genus" | "wortart">): string {
  if (word.genus === "der") return "var(--sky)";
  if (word.genus === "die") return "var(--pink)";
  if (word.genus === "das") return "var(--mint)";
  if (word.wortart === "Verb") return "var(--lilac)";
  if (word.wortart === "Adjektiv") return "var(--orange)";
  return "var(--lemon)";
}

export function articleChipStyle(word: Pick<Word, "genus" | "wortart">, big = false): CSSProperties {
  return {
    flexShrink: 0,
    alignSelf: big ? "flex-start" : "center",
    minWidth: big ? 0 : 42,
    height: big ? 30 : 28,
    padding: "0 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "2.5px solid var(--line)",
    background: wordColor(word),
    color: "var(--onTile)",
    fontSize: big ? 15 : 13,
    fontWeight: 700,
    boxSizing: "border-box",
    transform: "rotate(-3deg)",
  };
}

export const STRENGTH_LABELS = ["not reviewed yet", "very shaky", "shaky", "getting there", "solid", "yours"] as const;

/** The five pips: ≤ 2 tomato · 3 lemon · ≥ 4 mint; never-reviewed words get dashed empty pips. */
export function pipStyles(strength: Strength, big = false): CSSProperties[] {
  const fill = strength <= 2 ? "var(--tomato)" : strength >= 4 ? "var(--mint)" : "var(--lemon)";
  return Array.from({ length: 5 }, (_, k) => ({
    width: big ? "auto" : 8,
    flex: big ? 1 : "none",
    height: big ? 14 : 16,
    borderRadius: big ? 5 : 3,
    border: `2px ${strength === 0 ? "dashed" : "solid"} var(--line)`,
    boxSizing: "border-box",
    background: k < strength ? fill : big ? "var(--plain)" : "var(--pipOff)",
  }));
}

/** New = added in the last 7 days (plan decision). */
export function isNewWord(word: Pick<Word, "createdAt">): boolean {
  return Date.now() - new Date(word.createdAt).getTime() < 7 * 86_400_000;
}

/** srDue is a @db.Date (UTC midnight): format with UTC getters so it never shifts a day (CLAUDE.md date gotcha). */
export function nextReviewLabel(srDue: string | null): string {
  if (!srDue) return "not scheduled";
  const d = new Date(srDue);
  const due = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due - today) / 86_400_000);
  if (days <= 0) return "due now";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  return new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

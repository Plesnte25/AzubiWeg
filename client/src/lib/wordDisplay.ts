import type { Grade, ReviewHistoryEntry, Word, Wortart } from "../api/types";
import { GENUS_BG, GENUS_COLORS, WORTART_COLORS } from "./vocab";

// last-N-review grade -> bar height, tiered the same way the handoff's demo
// bars are (taller/lighter = stronger); "hard" is the only real grade that
// lands in the 3rd tier below, "no review yet" pads with the dimmest one.
// Shared by the Words list's row sparkline (Vocabulary.tsx) and Word
// Detail's larger review-history chart (words/ReviewHistoryCard.tsx).
export const GRADE_HEIGHT: Record<Grade, number> = { again: 3, hard: 6, good: 11, easy: 16 };
export const NO_DATA_HEIGHT = 3;
export const SPARKLINE_SLOTS = 6;

export function barColor(height: number): string {
  if (height > 13) return "var(--color-brand-700)";
  if (height > 8) return "var(--color-brand-500)";
  if (height > 5) return "var(--color-brand-solid)";
  // neutral, not brand-tinted — matches the original's dark-gray "no data"
  // tier being visually distinct from the 3 purple-tinted has-data tiers
  // above, rather than just a fainter purple.
  return "var(--color-ink-300)";
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
  return word.genus ? GENUS_BG[word.genus] : "var(--color-hairline-soft)";
}

const LEADING_POS_TAG = /^\((?:Noun|Verb|Adjective|Adverb|Interjection|Pronoun|Preposition|Conjunction|Numeral|Article)\)\s*/i;

/** Display-only: strips a redundant leading "(Noun)"/"(Verb)"/etc. tag from
 * a word's meaning — the word class is already shown via the header chip
 * and doesn't need repeating inside the meaning text too. Only the
 * *leading* tag is stripped; a later tag mid-string (e.g. a second sense
 * with a genuinely different class, "(Adverb) also...; (Interjection)
 * in answering...") is real, distinguishing information and stays.
 * Doesn't touch the stored data — meaning keeps its authored form for the
 * vault round-trip, this only affects what's rendered. */
export function stripLeadingPosTag(meaning: string, ownClass?: Wortart | null): string {
  const leading = meaning.match(LEADING_POS_TAG)?.[0].trim().slice(1, -1).toLowerCase() ?? null;
  const stripped = meaning.replace(LEADING_POS_TAG, "");
  if (ownClass === undefined) return stripped;
  // Display only, with the word's class known: a later tag that just repeats it (or the leading tag) is noise too —
  // "(Noun) bench; pew; (Noun) bank" → "bench; pew; bank". Tags naming a different class stay.
  const own = ownClass ? WORTART_POS[ownClass] : null;
  return stripped.replace(INNER_POS_TAG, (tag: string, cls: string) => {
    const c = cls.toLowerCase();
    return c === own || c === leading ? "" : tag;
  });
}

const INNER_POS_TAG = /\((Noun|Verb|Adjective|Adverb|Interjection|Pronoun|Preposition|Conjunction|Numeral|Article)\)\s*/gi;
const WORTART_POS: Partial<Record<Wortart, string>> = { Nomen: "noun", Verb: "verb", Adjektiv: "adjective", Adverb: "adverb" };

/** "der"/"die"/"das"/"verb", or the lowercased wortart for anything else
 * (adjective, adverb, ...) — the article/kind label shown on Word Detail's
 * and the review card's header chip. */
export function fullArtLabel(word: Word): string {
  if (word.genus) return word.genus;
  if (word.wortart === "Verb") return "verb";
  return word.wortart.toLowerCase();
}

export interface StatusBadge {
  label: string;
  bg: string;
  color: string;
}

// Reuses the design system's existing amber warning tokens (index.css's
// --color token block, documented in CLAUDE.md) rather than introducing a
// new color -- both enrichmentStatus values this badge covers are "needs
// your attention" states, the same semantic the amber pair already carries
// elsewhere in the app.
const NEEDS_ATTENTION_BG = "var(--color-warning-50)";
const NEEDS_ATTENTION_COLOR = "var(--color-warning-600)";

/** Badge for a word's `enrichmentStatus` -- only for the two states worth
 * surfacing as a visible flag (something the learner should look at and
 * possibly act on). `published`/`protected` render no badge: `published` is
 * the normal, unremarkable case, and `protected` (manual/legacy `mt`)
 * isn't itself a problem -- it's the opposite, a word a human or the
 * Python-side pipeline already vouched for. */
export function statusBadge(word: Word): StatusBadge | null {
  switch (word.enrichmentStatus) {
    case "published_review":
      return { label: "Needs review", bg: NEEDS_ATTENTION_BG, color: NEEDS_ATTENTION_COLOR };
    case "unresolved":
    case "incomplete":
      return { label: "Incomplete", bg: NEEDS_ATTENTION_BG, color: NEEDS_ATTENTION_COLOR };
    default:
      return null;
  }
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
      if (log.grade !== "hard" && log.grade !== "again") break;
      streak++;
    }
    if (streak >= 2 && (!best || streak > best.streak)) {
      best = { wordId, headword: sorted[0]!.headword, streak };
    }
  }
  return best;
}

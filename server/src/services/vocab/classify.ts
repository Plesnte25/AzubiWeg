import type { CefrLevel, Grade } from "@prisma/client";
import { stripEditorialMetadata, type CardCuration } from "../vault/format.js";
import { deriveEnrichmentStatus, type DerivedEnrichmentStatus } from "../enrichment/index.js";

export type Wortart = "Nomen" | "Verb" | "Adjektiv" | "Adverb" | "Funktionswort" | "Wendung";
export type Genus = "der" | "die" | "das" | null;
export type SrsState = "new" | "due" | "learning" | "mastered";

const MASTERED_INTERVAL_DAYS = 21;

/**
 * `meaning` carries a Wiktionary POS tag when enrichment found one
 * ("(Noun) train station", see meaningFromEntries() in
 * services/enrichment/wiktionary.ts) — never persisted separately, so this
 * re-derives Wortart from it on every read instead of storing it.
 */
const POS_TO_WORTART: Record<string, Wortart> = {
  noun: "Nomen",
  "proper noun": "Nomen",
  verb: "Verb",
  adjective: "Adjektiv",
  adverb: "Adverb",
  preposition: "Funktionswort",
  postposition: "Funktionswort",
  conjunction: "Funktionswort",
  pronoun: "Funktionswort",
  determiner: "Funktionswort",
  article: "Funktionswort",
  particle: "Funktionswort",
  interjection: "Funktionswort",
  numeral: "Funktionswort",
  prefix: "Funktionswort",
  suffix: "Funktionswort",
  phrase: "Wendung",
  idiom: "Wendung",
};

/** Best-effort — a manually-typed or machine-translated meaning/grammar may carry no POS tag at all. */
export function deriveWortart(meaning: string | null, grammar: string | null): Wortart {
  const posMatch = meaning?.match(/^\(([\w\s]+)\)/);
  if (posMatch) {
    const wortart = POS_TO_WORTART[posMatch[1]!.trim().toLowerCase()];
    if (wortart) return wortart;
  }
  // grammar starting with a gendered article ("der; Plural: ...") only happens for nouns
  // (see buildGrammarNote() in enrichment/index.ts); principal parts ("sieht, sah, hat gesehen") are verb-only
  if (grammar && /^(der|die|das)\b/i.test(grammar)) return "Nomen";
  if (grammar && /,.*\bhat\b|,.*\bist\b/.test(grammar)) return "Verb";
  const headwordLike = meaning ?? "";
  if (/\s/.test(headwordLike.trim()) === false && /^[A-ZÄÖÜ]/.test(headwordLike)) return "Nomen";
  return "Funktionswort";
}

/** Best-effort — reads the already-formatted `grammar` string's leading der/die/das, same convention KaikkiEntry.gender uses at import time. */
export function deriveGenus(grammar: string | null): Genus {
  if (!grammar) return null;
  const m = grammar.match(/^(der|die|das)\b/i);
  if (m) return m[1]!.toLowerCase() as Genus;
  const fallback = grammar.match(/\b(masc|fem|neut)\b/i);
  if (fallback) return { masc: "der", fem: "die", neut: "das" }[fallback[1]!.toLowerCase()] as Genus;
  return null;
}

export function deriveSrsState(word: { srDue: Date | null; srInterval: number | null }): SrsState {
  if (word.srDue === null) return "new";
  if (word.srDue.getTime() <= Date.now()) return "due";
  if (word.srInterval !== null && word.srInterval >= MASTERED_INTERVAL_DAYS) return "mastered";
  return "learning";
}

/** Word strength 1–5 for the Bento pips, or 0 = never reviewed (dashed, no pips). Derived, never stored. */
export type Strength = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * One definition of word strength for every surface (Words pips/chip/tile, Stats, the Today tile), replacing the
 * three older "weak word" readings. Derived from the SRS interval bands plus the most recent grade:
 *
 * - 0: never reviewed (no SR state yet).
 * - 1: manually flagged as shaky (`Word.leech`), or last graded hard with an interval of at most 1 day.
 * - 2: interval under 3 days, or last graded hard.
 * - 3: 3–9 days · 4: 10–20 days · 5: 21+ days (the same 21-day line `deriveSrsState` calls "mastered").
 *
 * A manual flag wins even before the first review: flagging is the user saying "this one's shaky". `lastGrade` is
 * null when the app has no ReviewLog for the word (e.g. it was scheduled in Obsidian), which then reads as not-hard.
 */
export function strength(word: { srInterval: number | null; leech: boolean }, lastGrade: Grade | null): Strength {
  if (word.leech) return 1;
  const interval = word.srInterval;
  if (interval === null) return 0;
  // a lapse (again) reads like hard: not remembered
  const hard = lastGrade === "hard" || lastGrade === "again";
  if (hard && interval <= 1) return 1;
  if (hard || interval < 3) return 2;
  if (interval < 10) return 3;
  if (interval < MASTERED_INTERVAL_DAYS) return 4;
  return 5;
}

/** "Shaky" everywhere = strength 1–2 (README: filter chip "Shaky (strength ≤ 2)"). Never-reviewed words aren't. */
export function isShaky(s: Strength): boolean {
  return s === 1 || s === 2;
}

function levelForWeek(week: number): CefrLevel | null {
  if (week >= 1 && week <= 7) return "a1";
  if (week >= 9 && week <= 15) return "a2";
  if (week >= 17 && week <= 24) return "b1";
  return null;
}

/**
 * The CEFR level implied by a word's lesson tag. `Word.lesson` is `\w-` only (the vault's `#lesson/([\w-]+)` tag),
 * so this extracts a week number from whatever slug shape it was typed in ("week-5", "week05", "w5", …) and maps it
 * onto the roadmap's level ranges (roadmap-generator.ts PHASE_LEVELS). Milestone weeks (8/16/25/26) have no level.
 */
export function classifyLevel(lesson: string | null): CefrLevel | null {
  if (!lesson) return null;
  const m = lesson.match(/(?:week|wk|w)[-_]?(\d{1,2})\b/i);
  if (!m) return null;
  const week = Number(m[1]);
  return week >= 1 && week <= 26 ? levelForWeek(week) : null;
}

/** Attaches the read-time-derived facets (never persisted) to any word-shaped row. */
export function withComputedFields<
  T extends {
    meaning: string | null;
    grammar: string | null;
    srDue: Date | null;
    srInterval: number | null;
    curation: CardCuration;
    form?: string | null;
    example?: string | null;
  },
>(word: T): T & { wortart: Wortart; genus: Genus; state: SrsState; enrichmentStatus: DerivedEnrichmentStatus } {
  return {
    ...word,
    meaning: word.meaning ? stripEditorialMetadata(word.meaning) : null,
    grammar: word.grammar ? stripEditorialMetadata(word.grammar) : null,
    form: word.form ? stripEditorialMetadata(word.form) : word.form,
    example: word.example ? stripEditorialMetadata(word.example) : word.example,
    wortart: deriveWortart(word.meaning, word.grammar),
    genus: deriveGenus(word.grammar),
    state: deriveSrsState(word),
    enrichmentStatus: deriveEnrichmentStatus(word.meaning, word.curation),
  };
}

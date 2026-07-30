import type { CefrLevel, Themenfeld } from "@prisma/client";

export type Wortart = "Nomen" | "Verb" | "Adjektiv" | "Adverb" | "Funktionswort" | "Wendung";
export type Genus = "der" | "die" | "das" | null;
export type SrsState = "new" | "due" | "learning" | "mastered";

/** The frozen 14-value Themenfeld list, for zod validation at the API boundary. */
export const THEMENFELD_VALUES = [
  "person_familie",
  "alltag_zuhause",
  "essen_einkaufen",
  "arbeit_ausbildung",
  "bildung",
  "gesundheit",
  "reise_verkehr",
  "freizeit_kultur",
  "medien_technik",
  "geld",
  "amt_buerokratie",
  "gefuehle_meinung",
  "natur_umwelt",
  "gesellschaft",
] as const satisfies readonly Themenfeld[];

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
  // (see buildGrammarNote() in wiktionary.ts); principal parts ("sieht, sah, hat gesehen") are verb-only
  if (grammar && /^(der|die|das)\b/i.test(grammar)) return "Nomen";
  if (grammar && /,.*\bhat\b|,.*\bist\b/.test(grammar)) return "Verb";
  const headwordLike = meaning ?? "";
  if (/\s/.test(headwordLike.trim()) === false && /^[A-ZÄÖÜ]/.test(headwordLike)) return "Nomen";
  return "Funktionswort";
}

/** Best-effort — mirrors extractGender()'s der/die/das convention, but reads the already-formatted `grammar` string, not raw wikitext. */
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

interface LessonThemeEntry {
  themenfeld: Themenfeld[];
  level: CefrLevel;
}

/**
 * `Word.lesson` is constrained (both by the API's zod schema here and by
 * the vault card format's `#lesson/([\w-]+)` tag, see services/vault/
 * format.ts) to `\w-` only — no spaces, no "&". So this can't key off the
 * human-readable strings elsewhere in the app (SyllabusItem.theme,
 * roadmap-defaults.ts's week `theme`) — a lesson value can never literally
 * equal "money & services". Instead it extracts a **week number** from
 * whatever slug shape the lesson was typed in ("week-5", "week05", "w5", …)
 * and looks that up against the same week ranges roadmap-generator.ts's
 * PHASE_LEVELS uses, plus a per-week Themenfeld table transcribed from each
 * regular week's `theme` in roadmap-defaults.ts's DEFAULT_ROADMAP_DAYS.
 * Lessons with no extractable week number fall through to the keyword
 * heuristic below. Milestone weeks (8/16/25/26) aren't in the table: no
 * vocab is programmatically tied to them.
 */
const WEEK_THEMENFELD: Record<number, Themenfeld[]> = {
  1: ["alltag_zuhause"],
  2: ["alltag_zuhause"],
  3: ["essen_einkaufen"],
  4: ["alltag_zuhause"],
  5: ["reise_verkehr"],
  6: ["person_familie"],
  7: ["alltag_zuhause"],
  9: ["freizeit_kultur"],
  10: ["alltag_zuhause"],
  11: ["gesundheit"],
  12: ["gesellschaft"],
  13: ["alltag_zuhause"],
  14: ["geld", "essen_einkaufen"],
  15: ["alltag_zuhause"],
  17: ["reise_verkehr"],
  18: ["amt_buerokratie"],
  19: ["gefuehle_meinung"],
  20: ["arbeit_ausbildung"],
  21: ["bildung"],
  22: ["medien_technik", "freizeit_kultur"],
  23: ["amt_buerokratie"],
  24: ["arbeit_ausbildung", "gefuehle_meinung"],
};

function levelForWeek(week: number): CefrLevel | null {
  if (week >= 1 && week <= 7) return "a1";
  if (week >= 9 && week <= 15) return "a2";
  if (week >= 17 && week <= 24) return "b1";
  return null;
}

function weekNumberFromLesson(lesson: string): number | null {
  const m = lesson.match(/(?:week|wk|w)[-_]?(\d{1,2})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 26 ? n : null;
}

function lessonThemeEntry(lesson: string): LessonThemeEntry | null {
  const week = weekNumberFromLesson(lesson);
  if (week === null) return null;
  const level = levelForWeek(week);
  const themenfeld = WEEK_THEMENFELD[week];
  if (!level || !themenfeld) return null;
  return { themenfeld, level };
}

/**
 * Best-effort keyword classifier for lesson-less (ad-hoc inbox) words —
 * deliberately isolated from classifyTheme()'s caller so a later one-off
 * backfill script can swap in an LLM call here without touching the live
 * add/edit path (never wire an LLM call into that path).
 */
export function classifyThemeHeuristic(headword: string, meaning: string | null): Themenfeld[] {
  const haystack = `${headword} ${meaning ?? ""}`.toLowerCase();
  const KEYWORDS: [Themenfeld, string[]][] = [
    ["person_familie", ["familie", "eltern", "mutter", "vater", "kind", "geschwister", "family", "parent", "sibling"]],
    ["alltag_zuhause", ["zuhause", "wohnung", "zimmer", "möbel", "haushalt", "alltag", "routine", "home", "room", "furniture", "household"]],
    ["essen_einkaufen", ["essen", "trinken", "lebensmittel", "supermarkt", "einkaufen", "restaurant", "food", "drink", "grocery", "shop", "meal"]],
    ["arbeit_ausbildung", ["arbeit", "beruf", "ausbildung", "betrieb", "kollege", "job", "work", "career", "apprenticeship", "employer"]],
    ["bildung", ["schule", "kurs", "prüfung", "studium", "universität", "school", "exam", "course", "university", "education"]],
    ["gesundheit", ["gesund", "krank", "arzt", "apotheke", "schmerz", "medikament", "health", "doctor", "sick", "pharmacy", "medicine"]],
    ["reise_verkehr", ["reise", "zug", "bahnhof", "bus", "auto", "fahren", "flug", "travel", "train", "station", "bus", "flight", "transport"]],
    ["freizeit_kultur", ["hobby", "freizeit", "sport", "musik", "film", "buch", "kultur", "hobby", "leisure", "music", "movie", "book"]],
    ["medien_technik", ["handy", "internet", "computer", "app", "medien", "phone", "internet", "computer", "media", "digital"]],
    ["geld", ["geld", "bank", "konto", "preis", "bezahlen", "money", "bank", "account", "price", "pay"]],
    ["amt_buerokratie", ["amt", "antrag", "formular", "behörde", "anmeldung", "bescheid", "office", "form", "authority", "registration"]],
    ["gefuehle_meinung", ["gefühl", "meinung", "glücklich", "traurig", "feeling", "opinion", "happy", "sad", "believe"]],
    ["natur_umwelt", ["natur", "umwelt", "wetter", "tier", "pflanze", "nature", "environment", "weather", "animal", "plant"]],
    ["gesellschaft", ["gesellschaft", "politik", "wahl", "society", "politics", "election", "culture"]],
  ];
  // Word-boundary match, not substring — a plain `.includes()` let short
  // keywords like "app" false-positive inside unrelated words ("apple",
  // "application"), e.g. Apfel/Bewerbung both wrongly landing in
  // medien_technik because their English glosses contain "app".
  const matches: Themenfeld[] = [];
  for (const [themenfeld, keywords] of KEYWORDS) {
    if (keywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(haystack))) matches.push(themenfeld);
    if (matches.length >= 2) break;
  }
  return matches;
}

/** Attaches the read-time-derived facets (never persisted) to any word-shaped row. */
export function withComputedFields<
  T extends { meaning: string | null; grammar: string | null; srDue: Date | null; srInterval: number | null },
>(word: T): T & { wortart: Wortart; genus: Genus; state: SrsState } {
  return {
    ...word,
    wortart: deriveWortart(word.meaning, word.grammar),
    genus: deriveGenus(word.grammar),
    state: deriveSrsState(word),
  };
}

export function classifyTheme(word: {
  lesson: string | null;
  headword: string;
  meaning: string | null;
}): { themenfeld: Themenfeld[]; level: CefrLevel | null } {
  if (word.lesson) {
    const entry = lessonThemeEntry(word.lesson);
    if (entry) return entry;
  }
  return { themenfeld: classifyThemeHeuristic(word.headword, word.meaning), level: null };
}

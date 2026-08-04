import type { Genus, SrsState, Themenfeld, Word, Wortart } from "../api/types";

/** Fixed 14-item Themenfeld list (frozen, no free text) — same order everywhere it's listed. */
export const THEMENFELD_ORDER: Themenfeld[] = [
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
];

export const THEMENFELD_LABELS: Record<Themenfeld, string> = {
  person_familie: "Person & Familie",
  alltag_zuhause: "Alltag & Zuhause",
  essen_einkaufen: "Essen & Einkaufen",
  arbeit_ausbildung: "Arbeit & Ausbildung",
  bildung: "Bildung",
  gesundheit: "Gesundheit",
  reise_verkehr: "Reise & Verkehr",
  freizeit_kultur: "Freizeit & Kultur",
  medien_technik: "Medien & Technik",
  geld: "Geld",
  amt_buerokratie: "Amt & Bürokratie",
  gefuehle_meinung: "Gefühle & Meinung",
  natur_umwelt: "Natur & Umwelt",
  gesellschaft: "Gesellschaft",
};

export const WORTART_ORDER: Wortart[] = ["Nomen", "Verb", "Adjektiv", "Adverb", "Funktionswort", "Wendung"];

export const WORTART_COLORS: Record<Wortart, string> = {
  Nomen: "var(--color-wortart-nomen)",
  Verb: "var(--color-wortart-verb)",
  Adjektiv: "var(--color-wortart-adjektiv)",
  Adverb: "var(--color-wortart-adverb)",
  Funktionswort: "var(--color-wortart-funktionswort)",
  Wendung: "var(--color-wortart-wendung)",
};

export const GENUS_COLORS: Record<NonNullable<Genus>, string> = {
  der: "var(--color-genus-der)",
  die: "var(--color-genus-die)",
  das: "var(--color-genus-das)",
};

export const STATE_ORDER: SrsState[] = ["new", "due", "learning", "mastered"];

export const STATE_LABELS: Record<SrsState, string> = {
  new: "New",
  due: "Due today",
  learning: "Learning",
  mastered: "Mastered",
};

export const STATE_COLORS: Record<SrsState, string> = {
  new: "var(--color-state-new)",
  due: "var(--color-state-due)",
  learning: "var(--color-state-learning)",
  mastered: "var(--color-state-mastered)",
};

/** Prefixes a gendered article onto a headword for display ("Bahnhof" -> "der Bahnhof"). */
export function articleFront(headword: string, genus: Genus): string {
  return genus ? `${genus} ${headword}` : headword;
}

const MASTERED_INTERVAL_DAYS = 21;

/** Shared new/learning/mastered split — same threshold used by every
 * "mastery bar" rendering (lg's `MasteryBar`, sm/md's `MasteryStrip`), kept
 * in one place so the two never drift apart. */
export function masteryBreakdown(words: Word[]) {
  let newCount = 0;
  let masteredCount = 0;
  for (const w of words) {
    if (w.srDue === null) newCount++;
    else if (w.srInterval !== null && w.srInterval >= MASTERED_INTERVAL_DAYS) masteredCount++;
  }
  const learningCount = words.length - newCount - masteredCount;
  const total = words.length || 1;
  const masteredPercent = Math.round((masteredCount / total) * 100);
  return { newCount, learningCount, masteredCount, masteredPercent };
}

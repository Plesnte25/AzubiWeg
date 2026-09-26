import { prisma } from "../../db.js";

/**
 * Tatoeba fallback for a word's bilingual example. kaikki/Wiktionary examples come first; when a word has none that
 * is short enough (or it can't be translated), this finds a real German sentence with a human English translation
 * from the TatoebaPair table (scripts/import-tatoeba.ts). Tatoeba sentences are written and translated by people, so
 * this stays within "missing data is hidden, not faked": nothing is generated.
 */

export interface TatoebaExample {
  de: string;
  en: string;
  deId: number;
}

/** Lowercased word tokens (the importer stores them de-duplicated). */
export function tokenizeGerman(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter(Boolean);
}

type Declension = Partial<Record<string, { sg?: string; pl?: string }>>;
type Conjugation = { present?: Partial<Record<string, string>>; past?: string; perfect?: string };

const ARTICLES = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines"]);
const AUXILIARIES = new Set(["hat", "ist", "haben", "sein"]);

/**
 * Every single-token form of a word that a sentence could contain: the headword, its declension cells (articles
 * stripped), plural from the grammar note, and its present, past and participle forms. Separable-verb halves ("rufe
 * … an") aren't matched; the headword and the participle still are.
 */
export function wordForms(headword: string, opts: { grammar?: string | null; declension?: unknown; conjugation?: unknown } = {}): string[] {
  const forms = new Set<string>();
  const add = (text: string | null | undefined, skip: Set<string> = ARTICLES) => {
    if (!text) return;
    for (const t of tokenizeGerman(text)) if (!skip.has(t)) forms.add(t);
  };
  add(headword);
  const plural = opts.grammar?.match(/Plural:\s*(?:die\s+)?([^\s,;]+)/i)?.[1];
  add(plural);
  const decl = opts.declension as Declension | null | undefined;
  if (decl && typeof decl === "object") for (const cell of Object.values(decl)) (add(cell?.sg), add(cell?.pl));
  const conj = opts.conjugation as Conjugation | null | undefined;
  if (conj && typeof conj === "object") {
    for (const f of Object.values(conj.present ?? {})) add(f);
    add(conj.past);
    add(conj.perfect, AUXILIARIES);
  }
  // principal parts in the grammar note ("arbeitet, arbeitete, hat gearbeitet") for verbs without a table
  if (opts.grammar && /,.*\b(hat|ist)\b/.test(opts.grammar)) add(opts.grammar, AUXILIARIES);
  return [...forms];
}

// Tatoeba's house characters; fine sentences, but a learner's example reads better without them when there's a choice
const STOCK_NAMES = /\b(Tom|Maria|Mary|John)\b/;

// Old spelling: pre-1996 (daß, muß), common in older Tatoeba sentences, and 19th-century (Theil, seyn), common in
// Wiktionary's quotations. A learner should see today's. Lookarounds, not \b: \b is ASCII-only and never matches
// next to ß.
const OLD_SPELLING = /(?<!\p{L})(daß|muß|mußte|läßt|faßt|Schluß|Theil\p{L}*|theil\p{L}*|seyn|thun|Thür|Werth)(?!\p{L})/u;
const SIMPLE_MAX_WORDS = 12;

/** One short sentence (at most 12 words, no "a / b" alternatives) in current spelling: a flashcard example. */
export function isSimpleExample(text: string | null): boolean {
  if (!text) return false;
  const words = tokenizeGerman(text).length;
  return words >= 2 && words <= SIMPLE_MAX_WORDS && !OLD_SPELLING.test(text) && !text.includes("/");
}

/**
 * For a capitalised headword (a noun, or a nominalised verb like "das Sprechen"), true when the sentence uses one of
 * its forms capitalised. Tokens are lowercased, so without this "Zahlen" (numbers) matched "zahlen" (to pay).
 */
export function usesNounForm(sentence: string, forms: string[], { midSentence = false } = {}): boolean {
  // midSentence: skip the first word, where every word is capitalised ("Sprechen Sie…" is the verb)
  const words = new Set(sentence.split(/[^\p{L}]+/u).filter(Boolean).slice(midSentence ? 1 : 0));
  return forms.some((f) => words.has(f.charAt(0).toUpperCase() + f.slice(1)));
}

// Tatoeba has plenty of dark sentences; an everyday one makes a better flashcard when there's a choice
const GRIM = /(?<!\p{L})(tot|tote[nr]?|tod|töte\w*|getötet|sterb\w*|starb|gestorben|mord\w*|umbring\w*|selbstmord|krieg|hass\w*|leiche)(?!\p{L})/iu;

/** Lower is better: close to seven words, no stock names, current spelling, nothing grim. */
export function exampleScore(p: { de: string; wordCount: number }): number {
  return (
    Math.abs(p.wordCount - 7) +
    (STOCK_NAMES.test(p.de) ? 3 : 0) +
    (OLD_SPELLING.test(p.de) ? 5 : 0) +
    (GRIM.test(p.de) ? 6 : 0)
  );
}

/** True when `tokens` contains `phrase` as consecutive tokens. */
export function containsPhrase(tokens: string[], phrase: string[]): boolean {
  return tokens.some((_, i) => phrase.every((p, j) => tokens[i + j] === p));
}

/**
 * The best Tatoeba pair for a word, or null (none found, or the table hasn't been imported). A single-word headword
 * matches any of its `forms`; a phrase ("Guten Morgen", "Entschuldigen Sie") must appear word for word.
 */
export async function findTatoebaExample(headword: string, forms: string[]): Promise<TatoebaExample | null> {
  const phrase = tokenizeGerman(headword);
  if (phrase.length === 0) return null;
  const isPhrase = phrase.length > 1;
  let candidates: { deId: number; de: string; en: string; wordCount: number; tokens: string[] }[];
  try {
    candidates = await prisma.tatoebaPair.findMany({
      where: { tokens: isPhrase ? { hasEvery: phrase } : { hasSome: forms.length ? forms : phrase } },
      orderBy: { wordCount: "asc" },
      take: isPhrase ? 1000 : 200,
      select: { deId: true, de: true, en: true, wordCount: true, tokens: true },
    });
  } catch (e) {
    console.warn("[tatoeba] lookup failed:", e instanceof Error ? e.message : e);
    return null;
  }
  // stored tokens are de-duplicated, so the phrase order is checked against the sentence itself
  if (isPhrase) candidates = candidates.filter((c) => containsPhrase(tokenizeGerman(c.de), phrase));
  else if (/^\p{Lu}/u.test(headword.trim())) {
    const nounForms = forms.length ? forms : phrase;
    const mid = candidates.filter((c) => usesNounForm(c.de, nounForms, { midSentence: true }));
    candidates = mid.length ? mid : candidates.filter((c) => usesNounForm(c.de, nounForms));
  }
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (exampleScore(b) < exampleScore(a) ? b : a));
  return { de: best.de, en: best.en, deId: best.deId };
}

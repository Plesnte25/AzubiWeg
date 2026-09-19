/**
 * Word resolution + enrichment against the local KaikkiEntry/KaikkiForm
 * tables (server/scripts/import-kaikki.ts) — replaces the old live
 * per-word Wiktionary wikitext fetch in wiktionary.ts. Two problems this
 * still solves, same as before:
 *  - Typed casing may not match the lemma's actual casing (iOS
 *    auto-capitalization) -> try case variants.
 *  - Inflected forms ("bist", "schwamm", "Bücher") only exist inside their
 *    lemma's own forms array, not as a separate top-level entry -> reverse-
 *    lookup via KaikkiForm and file the card under the lemma, keeping a
 *    Form: note about what was actually typed.
 *
 * Because this is now a local DB lookup instead of a live HTTP fetch, there
 * is no network-failure/rate-limit distinction to make at this layer any
 * more (that risk moved entirely into the importer script, decoupled from
 * the "add a word" runtime path) -- TransientLookupError is kept only
 * because translateLiteral() (the machine-translation fallback) still hits
 * a live network endpoint.
 */
import { prisma } from "../../db.js";
import type { KaikkiEntry } from "@prisma/client";

const USER_AGENT = "AzubiWeg/1.0 (personal study tool)";
const REQUEST_TIMEOUT_MS = 10_000;

// The pos values this app imports from kaikki.org's dump. Exported from here
// (not scripts/import-kaikki.ts, which executes a top-level main() on module
// load -- importing anything from it, e.g. from a test file, risks
// triggering real DB/network work) so it's directly testable and shared by
// both the importer and this module's own resolution logic. "interjection"
// and "name" were added after a real incident: excluding them meant a word
// like "danke" never got its real Interjection sense imported at all (only
// a bad verb form-of entry existed locally), and every country/city name
// (pos "name") fell through to a machine-translation-only fallback, losing
// its "(Proper noun)" label and gaining a spurious review flag.
export const SUPPORTED_POS = new Set(["noun", "verb", "adj", "adv", "interjection", "name"]);

export class TransientLookupError extends Error {}

export interface Resolution {
  headword: string;
  typed: string;
  formNote: string | null;
  meaning: string | null;
  source: "kaikki" | "translation";
  // True when >=2 distinct senses actually survive combineMeaning()'s own
  // noise guards and get published -- not the raw candidate count before
  // truncation, which reflects what a reader actually sees.
  ambiguous: boolean;
  // True whenever ANY KaikkiEntry was found for this headword, even with no
  // usable meaning -- lets enrichResolved() tell "confirmed not German"
  // apart from "real German word, no gloss yet" (see resolveViaKaikki).
  hasGermanEntry: boolean;
  // The specific KaikkiEntry.id combineMeaning() actually drew the primary
  // sense from, when one exists -- lets enrichResolved() fetch grammar/IPA/
  // audio/declension/conjugation from exactly that entry instead of
  // re-deriving "the primary entry" from `headword` via a second,
  // independently-sorted findEntriesByHeadword() query. That re-derivation
  // is where a real, measured divergence lived: reachable via an inflected
  // form, a fresh headword-keyed query can pick a different homograph than
  // the one the form actually belongs to (e.g. "bist" resolves via the verb
  // "sein" KaikkiForm entry, but a bare "sein" lookup's generic
  // noun>verb>adj>adv POS_PRIORITY tiebreak picks the unrelated noun "Sein"
  // == "being/existence" instead) -- see the plan's Phase 4 measurement
  // (1,413 of 87,021 inflected-form-reachable lemma groups affected, 234
  // losing their grammar table entirely). Null only when no entry exists at
  // all (the not-found fallback) or the resolution never got this far
  // (a transient failure's synthetic Resolution).
  entryId: string | null;
}

/** Same candidate-title logic as the old wiktionary.ts (unchanged, pure). */
export function candidateTitles(word: string): string[] {
  const candidates: string[] = [];
  for (const base of [word, word.replace(/[.!?]+$/, "").trim()]) {
    if (!base) continue;
    candidates.push(
      base,
      base[0]!.toLowerCase() + base.slice(1),
      base[0]!.toUpperCase() + base.slice(1),
      base.toLowerCase(),
    );
  }
  return [...new Set(candidates)];
}

/** Sentence-initial capitalization is common in user input and does not by
 * itself mean the user wants a proper noun or a German noun. Prefer the
 * lowercase lexical entry first for capitalized input, while retaining the
 * original-case candidates as a fallback for words that only exist capitalized
 * (for example country names). */
export function resolutionTitles(word: string): string[] {
  const candidates = candidateTitles(word);
  if (!word || word === word.toLowerCase()) return candidates;
  const lowercaseCandidates = candidates.filter((candidate) => candidate === candidate.toLowerCase());
  const otherCandidates = candidates.filter((candidate) => candidate !== candidate.toLowerCase());
  return [...lowercaseCandidates, ...otherCandidates];
}

// Preference order when a headword has entries under more than one part of
// speech (kaikki.org gives one entry per pos, unlike Wiktionary's combined
// page) -- mirrors the old meaningFromEntries()'s effective ordering (a
// page's Noun block typically preceded its Verb block). Only a tiebreaker,
// though: a real (non-form-of) meaning always wins first -- otherwise a verb
// whose infinitive doubles as a derived gerund-noun ("das Gehen", "das
// Essen" -- very common in German) would pick the empty gerund-noun entry
// over the verb entry that actually has the conjugation table, exactly the
// bug found live against "gehen" (its noun entry is "gerund of gehen:
// 'going'" with no forms at all) during the 2026-08-30 kaikki.org cutover.
// "name"/"interjection" deliberately sit at the end, not in SUPPORTED_POS's
// implicit fallback bucket (indexOf === -1 -> treated as lowest priority
// anyway) -- an explicit, documented tiebreak rather than an accidental one:
// a common noun/verb/adj/adv sense should keep winning over a same-cased
// name/interjection homograph by default.
const POS_PRIORITY = ["noun", "verb", "adj", "adv", "name", "interjection"];

async function findEntriesByHeadword(headwordLower: string): Promise<KaikkiEntry[]> {
  const rows = await prisma.kaikkiEntry.findMany({ where: { headwordLower } });
  return rows.sort((a, b) => {
    const hasMeaning = Number(!!b.meaning) - Number(!!a.meaning);
    if (hasMeaning !== 0) return hasMeaning;
    const ai = POS_PRIORITY.indexOf(a.pos);
    const bi = POS_PRIORITY.indexOf(b.pos);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/** Full KaikkiEntry by id -- the direct counterpart to findPrimaryEntry()
 * below, used when a Resolution already carries a specific entryId rather
 * than needing one re-derived from a headword string. */
export async function findEntryById(id: string): Promise<KaikkiEntry | null> {
  return prisma.kaikkiEntry.findUnique({ where: { id } });
}

/** Moves `preferredId` (if present) to the front of `entries`, preserving
 * relative order of the rest -- for when a specific entry is already known
 * to be the right one (e.g. the entry an inflected form actually belongs
 * to) rather than trusting the generic POS_PRIORITY tiebreak in
 * findEntriesByHeadword() above. A no-op if `preferredId` isn't in the
 * list, or is already first. */
export function prioritizeEntry<T extends { id: string }>(entries: T[], preferredId: string): T[] {
  const idx = entries.findIndex((e) => e.id === preferredId);
  if (idx <= 0) return entries;
  return [entries[idx]!, ...entries.slice(0, idx), ...entries.slice(idx + 1)];
}

/** Restricts `entries` to only those whose headword matches `candidate`
 * EXACTLY (case-sensitive) when any such entry exists -- unlike
 * prioritizeEntry above (a reorder, for when a specific entry id is already
 * known to be right), this is a filter: cross-case homographs are dropped
 * from consideration entirely, not just deprioritized. Reordering alone
 * isn't enough here because combineMeaning() below still combines up to 2
 * entries -- for "bar", merely moving the adjective "bar" ahead of the noun
 * "Bar" still leaves "Bar" (nightclub loanword sense) available as a second
 * combined sense, which would still read as ambiguous and still contain the
 * literal token "bar" that trips isSpellingCognate() into rejecting the
 * whole word -- a real regression found live during the 2026-09-18
 * re-enrichment audit incident. A word genuinely ambiguous WITHIN the same
 * exact casing (two senses both spelled "bar") is unaffected -- only
 * cross-case contamination is eliminated. A no-op when no entry's headword
 * matches `candidate` exactly. */
export function selectExactCaseEntries<T extends { headword: string }>(entries: T[], candidate: string): T[] {
  const exact = entries.filter((e) => e.headword === candidate);
  return exact.length ? exact : entries;
}

/** Combines up to 2 entries' meanings, same "(Pos) gloss; (Pos) gloss" shape
 * as the old meaningFromEntries() output -- including its same length-based
 * guard against an obscure long second sense (e.g. "Buch" has a second,
 * unrelated "noun" entry glossing as "omasum, the third compartment of the
 * stomach of a ruminant" -- a real hit found live during the 2026-08-30
 * kaikki.org cutover, same class of noise the old wikitext pipeline's
 * `pieces[1]![1].length > 40` check existed to drop). */
export function combineMeaning(entries: KaikkiEntry[]): { meaning: string | null; ambiguous: boolean } {
  const withMeaning = entries.filter((e) => e.meaning);
  if (!withMeaning.length) return { meaning: null, ambiguous: false };
  const posLabel: Record<string, string> = {
    noun: "Noun",
    verb: "Verb",
    adj: "Adjective",
    adv: "Adverb",
    interjection: "Interjection",
    name: "Proper noun",
  };
  let picked = withMeaning.slice(0, 2);
  if (picked.length === 2 && picked[1]!.meaning!.length > 40) picked = picked.slice(0, 1);
  const pieces = picked.map((e) => {
    const label = posLabel[e.pos];
    return label ? `(${label}) ${e.meaning}` : e.meaning!;
  });
  let joined = pieces.join("; ");
  let ambiguous = pieces.length === 2;
  if (pieces.length === 2 && joined.length > 140) {
    joined = pieces[0]!;
    ambiguous = false;
  }
  // Reflects what's actually published (post-truncation), not the raw
  // candidate count -- a 2nd sense dropped for being long/noisy (the
  // >40-char guard above) or the combined string being too long (this
  // 140-char guard) leaves only one sense shown, which isn't genuine
  // ambiguity for a reader to resolve.
  return { meaning: joined, ambiguous };
}

/**
 * Finds the local KaikkiEntry (any pos) for a typed word, trying case
 * variants, then falls back to the inflected-form reverse index. No network
 * I/O here -- resolution failure just means "not in the imported dump",
 * checked at read time in enrichResolved() below against the translation
 * fallback.
 *
 * A direct-entry hit only short-circuits the search when it actually has a
 * real (non-form-of) meaning -- kaikki.org gives some inflected forms their
 * own minimal entry too (e.g. "bist" has a real headword="bist" KaikkiEntry,
 * pos "verb", but its only gloss is the cross-reference "second-person
 * singular present of sein", filtered to meaning=null by firstMeaning()'s
 * FORM_OF_GLOSS_RE). Stopping there instead of falling through to the
 * KaikkiForm reverse lookup would resolve "bist" to itself with no meaning
 * at all, skipping the "bist" -> "sein" lemma-following this function
 * exists to do -- found live during the 2026-08-30 kaikki.org cutover.
 */
async function resolveViaKaikki(word: string): Promise<Resolution> {
  const typed = word;
  // Accumulated across both loops so a real KaikkiEntry that exists but has
  // no usable meaning (entries.length > 0, combineMeaning still returns
  // null) isn't forgotten by the time a candidate exhausts both loops and
  // falls through to the bare fallback at the bottom -- without this, a
  // real German word with no gloss would look identical to a genuinely
  // nonexistent one there, sending it to "rejected" instead of "unresolved".
  let hasGermanEntry = false;
  for (const candidate of resolutionTitles(word)) {
    const rawEntries = await findEntriesByHeadword(candidate.toLowerCase());
    if (rawEntries.length > 0) hasGermanEntry = true;
    // Restrict to exact-case matches before combining -- see
    // selectExactCaseEntries's doc comment for why reordering alone (as an
    // earlier fix attempt did) isn't enough to stop a cross-case homograph
    // (e.g. "Bar") from leaking into the published meaning for "bar".
    const entries = selectExactCaseEntries(rawEntries, candidate);
    const { meaning, ambiguous } = combineMeaning(entries);
    if (meaning) {
      return {
        headword: entries[0]!.headword, typed, formNote: null, meaning, ambiguous,
        hasGermanEntry: true, source: "kaikki", entryId: entries[0]!.id,
      };
    }
  }
  for (const candidate of resolutionTitles(word)) {
    const form = await prisma.kaikkiForm.findFirst({
      where: { formLower: candidate.toLowerCase() },
      include: { entry: true },
    });
    if (form) {
      const entries = await findEntriesByHeadword(form.entry.headwordLower);
      if (entries.length > 0) hasGermanEntry = true;
      const desc = form.tags ? `${form.tags} of ${form.entry.headword}` : `form of ${form.entry.headword}`;
      // Reorder around the entry the typed form actually belongs to, rather
      // than trusting the generic POS_PRIORITY tiebreak on the whole
      // headwordLower group -- otherwise an unrelated homograph (a noun
      // sharing the verb's lemma spelling, very common in German) can win
      // both the published meaning AND (via the old findPrimaryEntry()
      // re-derivation this Resolution.entryId now replaces) the grammar/
      // conjugation table, even though the user typed a form of the OTHER
      // entry.
      const prioritized = entries.length ? prioritizeEntry(entries, form.entry.id) : [form.entry];
      const { meaning, ambiguous } = combineMeaning(prioritized);
      return {
        headword: form.entry.headword,
        typed,
        formNote: `${typed} = ${desc}`,
        meaning,
        ambiguous,
        hasGermanEntry: true,
        source: "kaikki",
        entryId: form.entry.id,
      };
    }
  }
  return {
    headword: word, typed, formNote: null, meaning: null, ambiguous: false,
    hasGermanEntry, source: "kaikki", entryId: null,
  };
}

/** Retries on a transient network failure -- only translateLiteral below
 * still does live I/O in this module. */
async function getWithRetry(url: string): Promise<Response> {
  let delay = 2000;
  let res!: Response;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      throw new TransientLookupError(e instanceof Error ? e.message : String(e));
    }
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return res;
}

/** Low-level call to the free, unofficial Google Translate endpoint (no API
 * key) -- shared by translateLiteral (single-word meaning fallback) and
 * translateText (sentence fallback for exampleTranslation) below. Returns
 * the raw trimmed translation, or null on any failure/empty result -- no
 * word-specific "did this actually translate" judgment here, callers apply
 * their own. */
async function googleTranslateDe(text: string): Promise<string | null> {
  if (!text) return null;
  const params = new URLSearchParams({ client: "gtx", sl: "de", tl: "en", dt: "t", q: text });
  try {
    const res = await getWithRetry(`https://translate.googleapis.com/translate_a/single?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as [[string, string][]];
    const translated = data[0].map((chunk) => chunk[0]).join("").trim();
    return translated || null;
  } catch (e) {
    if (e instanceof TransientLookupError) throw e;
    return null;
  }
}

/** Free, unofficial fallback for whenever the local dump has no entry at
 * all -- same endpoint/behavior as the old wiktionary.ts's translateLiteral.
 * The no-op guard below is specific to a single word: Google's endpoint
 * often just echoes back a proper noun or an already-English word instead
 * of failing outright, which for a lone word means "didn't really
 * translate" and should be treated as no translation. */
async function translateLiteral(word: string): Promise<string | null> {
  const translated = await googleTranslateDe(word);
  if (!translated || translated.toLowerCase() === word.trim().toLowerCase()) return null;
  return translated;
}

/** Sentence-level fallback for Word.exampleTranslation, used when a real
 * German example exists but no sourced KaikkiEntry translation does. Skips
 * translateLiteral's single-word echo check -- a real sentence translating
 * to something that happens to look similar isn't the same "didn't
 * translate" failure mode a lone word has, and would false-negative on
 * legitimate short sentences. */
export async function translateText(text: string): Promise<string | null> {
  return googleTranslateDe(text);
}

export async function resolveWord(word: string): Promise<Resolution> {
  const res = await resolveViaKaikki(word);
  if (res.meaning) return res;
  const translated = await translateLiteral(res.headword);
  if (translated) return { ...res, meaning: translated, source: "translation" };
  return res;
}

/** The full KaikkiEntry a resolved headword came from, for the enrichment
 * fields (ipa/example/declension/conjugation/audio/etymology) that
 * resolveWord()'s Resolution shape doesn't carry. Picks the same
 * pos-priority entry combineMeaning() would have used for a bare headword
 * lookup with no more specific answer available -- prefer Resolution.entryId
 * + findEntryById() over this whenever a Resolution is on hand, since this
 * function has no way to know a specific entry (e.g. one reached via an
 * inflected form) was already the right answer. Kept as the fallback for
 * when entryId is null or its entry has since been deleted. */
export async function findPrimaryEntry(headword: string): Promise<KaikkiEntry | null> {
  const entries = selectExactCaseEntries(await findEntriesByHeadword(headword.toLowerCase()), headword);
  return entries[0] ?? null;
}

// ── English loanword / cognate rejection ──
// Same two-signal design as the old wiktionary.ts (either signal excludes a
// word): isSpellingCognate is pure headword/meaning string comparison and
// ports over completely unchanged. looksLikeEnglishLoanword is re-tuned
// against kaikki.org's etymology_text, which is already plain English prose
// (not German wikitext), so the signal is actually simpler here: Wiktionary's
// own etymology writer consistently phrases a real borrowing as "Borrowed
// from English X" / "(Unadapted) borrowing from English X" / a short "from
// English X" with no deeper ancestry chain, and phrases a cognate mention as
// "Compare ... English X" / "Cognate with ... English X" / "Akin to ...
// English X" -- verified live against Computer/E-Mail/Hobby/okay/Sport
// (true positives) and Hand/Name/Katze/Winter/essen/fliegen/klein/und
// (false positives to avoid), the same word set the old wikitext version
// was tuned against, 2026-08-30.

const FORM_OF_CROSSREF_RE =
  /\b(?:gerund|plural|inflection|form|agent noun|female equivalent|diminutive|augmentative|verbal noun|infinitive)\s+of\s+\S+[:;,]?\s*/gi;

export function isSpellingCognate(headword: string, meaning: string | null): boolean {
  if (!meaning) return false;
  const text = meaning.replace(/^\([\w\s]+\)\s*/, "").trim();
  let firstSense = text.split(";", 1)[0]!;
  firstSense = firstSense.replace(FORM_OF_CROSSREF_RE, "");
  const tokens = firstSense.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) ?? [];
  const target = headword.replace(/[.!?]+$/, "").toLowerCase();
  if (target.length < 2) return false;
  return tokens.some((tok) => tok.toLowerCase() === target);
}

const COGNATE_MARKER_RE = /\b(compare|cognate with|akin to)\b/i;
const NATIVE_ANCESTRY_RE = /\b(middle high german|old high german|proto-germanic|proto-west germanic|proto-indo-european)\b/i;
const BORROWED_RE = /\bborrow(ed|ing) from english\b/i;
const FROM_ENGLISH_RE = /\bfrom english\b/i;

export function looksLikeEnglishLoanword(etymologyText: string | null): boolean {
  if (!etymologyText) return false;
  const marker = etymologyText.match(COGNATE_MARKER_RE);
  const primary = marker ? etymologyText.slice(0, marker.index) : etymologyText;
  if (BORROWED_RE.test(primary)) return true;
  return FROM_ENGLISH_RE.test(primary) && !NATIVE_ANCESTRY_RE.test(primary);
}

export function isEnglishCognate(headword: string, meaning: string | null, etymologyText: string | null): boolean {
  return isSpellingCognate(headword, meaning) || looksLikeEnglishLoanword(etymologyText);
}

// ── Pure per-record field extraction, ported from kaikki.org's raw JSONL
// shape into this app's Word/KaikkiEntry conventions. Kept here (not in
// scripts/import-kaikki.ts, which only orchestrates the stream+DB-write
// loop) so they're directly unit-testable against real captured fixtures,
// same precedent as the old wiktionary.ts's extract* functions. ──

export interface KaikkiFormRaw {
  form: string;
  tags?: string[];
  source?: string;
}
export interface KaikkiSenseRaw {
  glosses?: string[];
  examples?: { text?: string; translation?: string; type?: string; ref?: string }[];
  tags?: string[];
}
export interface KaikkiSoundRaw {
  ipa?: string;
  audio?: string;
}
export interface KaikkiRecordRaw {
  word: string;
  pos: string;
  lang_code?: string;
  senses?: KaikkiSenseRaw[];
  forms?: KaikkiFormRaw[];
  sounds?: KaikkiSoundRaw[];
  etymology_text?: string;
  head_templates?: { name?: string; args?: Record<string, string> }[];
}

const GENDER_MAP: Record<string, string> = { m: "der", f: "die", n: "das" };

/** Noun gender from the `de-noun` head template's first arg segment (e.g.
 * "n,,^er" -> neuter -> "das"). null for non-nouns or an unparseable template. */
export function extractGender(rec: KaikkiRecordRaw): string | null {
  const t = rec.head_templates?.find((h) => h.name === "de-noun");
  const arg1 = t?.args?.["1"];
  if (!arg1) return null;
  const code = arg1.split(",")[0]?.trim();
  return code ? (GENDER_MAP[code] ?? null) : null;
}

type CaseKey = "nom" | "akk" | "dat" | "gen";
const CASE_TAGS: Record<CaseKey, string> = {
  nom: "nominative",
  akk: "accusative",
  dat: "dative",
  gen: "genitive",
};

/** Nom/Akk/Dat/Gen x Sg/Pl table from forms tagged `source: "declension"`.
 * Multiple forms can share a cell (e.g. dative singular "Haus"/"Hause") —
 * first one seen wins, same convention the old wikitext extractors used. */
export function extractDeclension(forms: KaikkiFormRaw[]): Record<string, { sg?: string; pl?: string }> | null {
  const table: Record<string, { sg?: string; pl?: string }> = {};
  for (const f of forms) {
    if (f.source !== "declension" || !f.tags) continue;
    const number = f.tags.includes("plural") ? "pl" : f.tags.includes("singular") ? "sg" : null;
    if (!number) continue;
    for (const [key, tag] of Object.entries(CASE_TAGS) as [CaseKey, string][]) {
      if (!f.tags.includes(tag)) continue;
      table[key] ??= {};
      if (!table[key][number]) table[key][number] = f.form;
    }
  }
  return Object.keys(table).length ? table : null;
}

const PERSON_TAGS: Record<string, string> = {
  ich: "first-person",
  du: "second-person",
  er: "third-person",
};

/** Present-tense 6-person grid (+ best-effort past/perfect) from forms
 * tagged `source: "conjugation"`. */
export function extractConjugation(
  forms: KaikkiFormRaw[],
): { present?: Record<string, string>; past?: string; perfect?: string } | null {
  const present: Record<string, string> = {};
  let past: string | undefined;
  let perfect: string | undefined;

  for (const f of forms) {
    if (f.source !== "conjugation" || !f.tags) continue;
    if (f.tags.includes("present") && f.tags.includes("indicative")) {
      const plural = f.tags.includes("plural");
      for (const [person, tag] of Object.entries(PERSON_TAGS)) {
        if (!f.tags.includes(tag)) continue;
        const key = plural ? { ich: "wir", du: "ihr", er: "sie" }[person]! : person;
        present[key] ??= f.form;
      }
    } else if (
      f.tags.includes("past") &&
      f.tags.includes("indicative") &&
      f.tags.includes("first-person") &&
      f.tags.includes("singular")
    ) {
      past ??= f.form;
    } else if (f.tags.includes("participle") && f.tags.includes("perfect")) {
      perfect ??= f.form;
    }
  }
  if (!Object.keys(present).length && !past && !perfect) return null;
  return { present: Object.keys(present).length ? present : undefined, past, perfect };
}

// A gloss that's purely a grammatical cross-reference to another word
// ("gerund of gehen: 'going'", "singular imperative of hausen",
// "first-person singular present of hausen", "nominative/accusative/genitive
// plural of Buch") isn't a real, independent sense of THIS headword --
// it's Wiktionary noting that the same spelling also happens to be an
// inflected form of a different word. Found live against "Haus" (also has a
// "singular imperative of hausen" verb entry), "gehen" (whose noun entry is
// entirely "gerund of gehen"), and "Bücher" (whose own entry is entirely
// "nominative/accusative/genitive plural of Buch" -- a SLASH-separated case
// list, not a single case name, which an earlier version of this regex
// missed) during the 2026-08-30 kaikki.org cutover -- same bug class the
// old wikitext pipeline's extractLemma()/FORM_OF_CROSSREF_RE existed to
// avoid, recurring in this new source in a new guise each time.
const GRAMMATICAL_TERM_RE =
  "gerund|imperative|present|past|preterite|participle|infinitive|subjunctive|inflection|form|plural|singular|genitive|dative|accusative|nominative|comparative|superlative|diminutive|augmentative|agent noun|female equivalent|verbal noun|first-person|second-person|third-person";
const FORM_OF_GLOSS_RE = new RegExp(`^(?:(?:${GRAMMATICAL_TERM_RE})[\\s/]+)+of\\s+`, "i");

// A gloss that's WHOLLY grammatical labels with no trailing "of X" clause
// ("first-person singular present") is just as much a non-gloss as the
// "...of X" form above -- Kaikki doesn't always attach the cross-reference
// target to the gloss text itself. Real incident: "danke"'s only locally
// imported entry (before "interjection" was added to SUPPORTED_POS) had
// exactly this shape, and because it was the sole surviving candidate,
// combineMeaning() published it as an unambiguous "(Verb) first-person
// singular present" -- silently wrong, no review flag. Requires >=2
// consecutive terms (anchored start-to-end) so a real single-word
// definition that happens to share a term's spelling ("form", "plural" as
// legitimate short definitions) is never swallowed.
const BARE_GRAMMATICAL_FRAGMENT_RE = new RegExp(
  `^(?:(?:${GRAMMATICAL_TERM_RE})[\\s/,]+){1,}(?:${GRAMMATICAL_TERM_RE})$`,
  "i",
);

// A sense tagged "auxiliary" describes a word's grammatical function
// (e.g. "sein" forming the perfect tense of other verbs), not its own core
// meaning -- deprioritized in favor of any other sense, same "prefer
// unlabeled over usage-labeled" precedent the old wikitext pipeline used
// (its meaningFromEntries() explicitly existed to stop "sein" from glossing
// as "forms the present perfect..." over "to be"). Real senses in kaikki.org
// often carry a multi-element `glosses` array where earlier elements are a
// category preamble ("As a copulative verb:") and the LAST element is the
// actual short definition -- found live on "sein" itself, whose second
// sense is exactly `["As a copulative verb:", "to be"]`.
const DEPRIORITIZED_SENSE_TAGS = new Set(["auxiliary"]);

function realGlossOf(sense: KaikkiSenseRaw): string | null {
  const glosses = sense.glosses;
  if (!glosses?.length) return null;
  const last = glosses[glosses.length - 1]!;
  if (!last) return null;
  if (FORM_OF_GLOSS_RE.test(last)) return null;
  if (BARE_GRAMMATICAL_FRAGMENT_RE.test(last.trim())) return null;
  return last;
}

/** The single best real gloss across a record's senses — auxiliary/
 * grammatical-function senses and pure cross-reference glosses are skipped
 * in favor of the first sense that gives an actual definition. */
export function firstMeaning(senses: KaikkiSenseRaw[]): string | null {
  const isDeprioritized = (s: KaikkiSenseRaw) => s.tags?.some((t) => DEPRIORITIZED_SENSE_TAGS.has(t)) ?? false;
  const ranked = [...senses].sort((a, b) => Number(isDeprioritized(a)) - Number(isDeprioritized(b)));
  for (const s of ranked) {
    const gloss = realGlossOf(s);
    if (gloss) return gloss;
  }
  return null;
}

// Wiktionary's own unfilled-template placeholder for an example with no
// translation contributed yet — a literal, exact boilerplate string (not a
// real translation), found verbatim on 178 imported KaikkiEntry rows.
// Filtered wherever exampleTranslation is read, not just at import time, so
// already-imported rows (and the one-off backfill script, which reads
// KaikkiEntry directly) get the same treatment without a re-import.
const UNTRANSLATED_PLACEHOLDER = "(please add an English translation of this quotation)";

export function cleanExampleTranslation(text: string | null): string | null {
  return text && text.trim() !== UNTRANSLATED_PLACEHOLDER ? text : null;
}

function collapseWhitespace(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

const MIN_EXAMPLE_LEN = 8;
export const MAX_PEDAGOGICAL_EXAMPLE_LEN = 100;
// A leading "1925, Some Author, Title, p.123" -- style bibliographic opener,
// independent of Kaikki's own type/ref tags (which are sometimes missing/
// inconsistent) -- catches the same class of long literary/archaic
// quotation the type/ref check targets, as a defense-in-depth signal.
const CITATION_SHAPED_RE = /^\d{4},/;

/** Best available example across ALL senses, ranked into quality tiers --
 * not just the first hit, and not just "shortest non-quotation" (which can
 * still pick a fragment or a bibliographic citation). Tier 0: a real,
 * plain usage example (not quotation-tagged, not citation-shaped, long
 * enough to be a real sentence, contains a space so it isn't a bare
 * single-token fragment). Tier 1: real text that fails the "sentence-like"
 * checks. Citation-shaped and quotation-tagged material is rejected entirely:
 * it is source metadata, not learner content. Picks the shortest candidate
 * within the best available tier. Real incident:
 * short hand-picked pedagogical examples were replaced by long archaic
 * quotations (Hegel excerpts, 19th-century religious text, a 1925 calendar
 * citation) purely because they happened to appear in an earlier sense. */
export function firstExample(senses: KaikkiSenseRaw[]): { text: string | null; translation: string | null } {
  const candidates = senses
    .flatMap((s) => s.examples ?? [])
    .filter((e): e is typeof e & { text: string } => !!e.text)
    .map((e) => ({ ...e, text: collapseWhitespace(e.text) }))
    .filter((e) => e.text.length <= MAX_PEDAGOGICAL_EXAMPLE_LEN)
    .filter((e) => e.type !== "quotation" && !e.ref && !CITATION_SHAPED_RE.test(e.text));
  if (!candidates.length) return { text: null, translation: null };

  const tierOf = (e: (typeof candidates)[number]): number => {
    const isSentenceLike = e.text.length >= MIN_EXAMPLE_LEN && e.text.includes(" ");
    return isSentenceLike ? 0 : 1;
  };

  const bestTier = Math.min(...candidates.map(tierOf));
  const pool = candidates.filter((e) => tierOf(e) === bestTier);
  const best = [...pool].sort((a, b) => a.text.length - b.text.length)[0]!;
  return { text: best.text, translation: cleanExampleTranslation(best.translation ?? null) };
}

const MATERIALLY_LONGER_FACTOR = 1.5;

/** A learner-facing example must be short, sentence-like, and free of
 * citation-shaped or quotation-only source material. */
export function isPedagogicalExample(example: string | null): boolean {
  if (!example) return false;
  const text = collapseWhitespace(example);
  if (text.length > MAX_PEDAGOGICAL_EXAMPLE_LEN || text.length < MIN_EXAMPLE_LEN || !text.includes(" ")) {
    return false;
  }
  return !CITATION_SHAPED_RE.test(text) && !/[“”"]/.test(text);
}

/** Keeps the existing example/translation pair unless the candidate is a
 * real improvement -- never blanks a real example with null, never accepts
 * an overlong candidate (even when there was nothing before), never accepts
 * a candidate materially longer than what's already there. Always returns
 * example+translation TOGETHER from one side or the other -- never mixes an
 * example from one source with a translation from the other, which is
 * exactly the bug this guards against: a candidate's translation getting
 * silently paired with a retained old example for a different sentence. */
export function pickBetterExample(
  existing: { example: string | null; exampleTranslation: string | null },
  candidate: { example: string | null; exampleTranslation: string | null },
): { example: string | null; exampleTranslation: string | null } {
  if (!isPedagogicalExample(candidate.example)) return existing;
  if (!isPedagogicalExample(existing.example)) return candidate;
  const candidateText = candidate.example;
  const existingText = existing.example;
  if (candidateText && existingText && candidateText.length > existingText.length * MATERIALLY_LONGER_FACTOR) {
    return existing;
  }
  return candidate;
}

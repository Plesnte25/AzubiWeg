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

export class TransientLookupError extends Error {}

export interface Resolution {
  headword: string;
  typed: string;
  formNote: string | null;
  meaning: string | null;
  source: "kaikki" | "translation";
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
const POS_PRIORITY = ["noun", "verb", "adj", "adv"];

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

/** Combines up to 2 entries' meanings, same "(Pos) gloss; (Pos) gloss" shape
 * as the old meaningFromEntries() output -- including its same length-based
 * guard against an obscure long second sense (e.g. "Buch" has a second,
 * unrelated "noun" entry glossing as "omasum, the third compartment of the
 * stomach of a ruminant" -- a real hit found live during the 2026-08-30
 * kaikki.org cutover, same class of noise the old wikitext pipeline's
 * `pieces[1]![1].length > 40` check existed to drop). */
export function combineMeaning(entries: KaikkiEntry[]): string | null {
  const withMeaning = entries.filter((e) => e.meaning);
  if (!withMeaning.length) return null;
  const posLabel: Record<string, string> = { noun: "Noun", verb: "Verb", adj: "Adjective", adv: "Adverb" };
  let picked = withMeaning.slice(0, 2);
  if (picked.length === 2 && picked[1]!.meaning!.length > 40) picked = picked.slice(0, 1);
  const pieces = picked.map((e) => {
    const label = posLabel[e.pos];
    return label ? `(${label}) ${e.meaning}` : e.meaning!;
  });
  let joined = pieces.join("; ");
  if (pieces.length === 2 && joined.length > 140) joined = pieces[0]!;
  return joined;
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
  for (const candidate of candidateTitles(word)) {
    const entries = await findEntriesByHeadword(candidate.toLowerCase());
    const meaning = combineMeaning(entries);
    if (meaning) {
      return { headword: entries[0]!.headword, typed, formNote: null, meaning, source: "kaikki" };
    }
  }
  for (const candidate of candidateTitles(word)) {
    const form = await prisma.kaikkiForm.findFirst({
      where: { formLower: candidate.toLowerCase() },
      include: { entry: true },
    });
    if (form) {
      const entries = await findEntriesByHeadword(form.entry.headwordLower);
      const desc = form.tags ? `${form.tags} of ${form.entry.headword}` : `form of ${form.entry.headword}`;
      return {
        headword: form.entry.headword,
        typed,
        formNote: `${typed} = ${desc}`,
        meaning: combineMeaning(entries.length ? entries : [form.entry]),
        source: "kaikki",
      };
    }
  }
  return { headword: word, typed, formNote: null, meaning: null, source: "kaikki" };
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
 * pos-priority entry combineMeaning() would have used. */
export async function findPrimaryEntry(headword: string): Promise<KaikkiEntry | null> {
  const entries = await findEntriesByHeadword(headword.toLowerCase());
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
  examples?: { text?: string; translation?: string }[];
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
  return last && !FORM_OF_GLOSS_RE.test(last) ? last : null;
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

/** First sense with a usable example sentence, if any. */
export function firstExample(senses: KaikkiSenseRaw[]): { text: string | null; translation: string | null } {
  for (const s of senses) {
    const ex = s.examples?.find((e) => e.text);
    if (ex) return { text: ex.text ?? null, translation: cleanExampleTranslation(ex.translation ?? null) };
  }
  return { text: null, translation: null };
}

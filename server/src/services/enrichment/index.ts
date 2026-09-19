import type { CardCuration, CardFields } from "../vault/format.js";
import { downloadCommonsAudio, synthesizeTts } from "./audio.js";
import {
  type Resolution,
  TransientLookupError,
  cleanExampleTranslation,
  findEntryById,
  findPrimaryEntry,
  isEnglishCognate,
  pickBetterExample,
  resolveWord,
  translateText,
} from "./kaikki.js";
import { type PonsBudget, ponsDiagnosticEligible, runPonsDiagnostic } from "./pons.js";

export { resolveWord, type Resolution, TransientLookupError } from "./kaikki.js";
export { createPonsBudget, type PonsBudget } from "./pons.js";

// declension/conjugation are app-only columns on Word, same status as
// themenfeld/level/leech (never part of the vault card format — see Word's
// own schema comment) — deliberately NOT part of CardFields, which is the
// strict vault-round-trip contract. Callers must apply these through the
// same separate "app-only column" write path themenfeld/level already use,
// never let them ride along through Card.fields/vault markdown, or a vault
// resync (which re-parses CardFields fresh from the file, with no
// declension/conjugation in it) would silently wipe them back to null.
export interface EnrichmentResult extends CardFields {
  found: boolean; // false = meaning lookup failed, card added with a fill-manually note
  headword: string; // resolved lemma -- may differ from what was typed ("bist" -> "sein")
  typed: string;
  declension: unknown | null;
  conjugation: unknown | null;
  // English translation of `example` — same app-only status as declension/
  // conjugation above (see Word's schema comment), never part of CardFields.
  exampleTranslation: string | null;
  // set (and no card written by the caller) when the word was an English
  // loanword or confirmed not German -- null on a transient failure, which
  // still gets a placeholder card so a bad network day never looks like a
  // rejection (mirrors add_word.py's enrich_word).
  rejected: "loanword" | "not-german" | null;
}

// Status derived from a Word row read back later -- distinct from
// EnrichmentResult.found/rejected, which describe one live enrichment
// call's own immediate outcome. "transient_failure" deliberately isn't one
// of these values: once a row has been sitting for weeks, "still mid-
// failure" and "failed once, months ago" aren't meaningfully different
// without a timestamp this phase doesn't add -- a generated card with no
// meaning reads back as "incomplete" here regardless of why it's empty.
export type DerivedEnrichmentStatus =
  | "published" | "published_review" | "unresolved" | "incomplete" | "protected";

export function deriveEnrichmentStatus(
  meaning: string | null,
  curation: CardCuration,
): DerivedEnrichmentStatus {
  if (curation === "manual" || curation === "mt") return "protected"; // regardless of meaning --
                                                                        // including a deliberately-
                                                                        // blanked manual card, never
                                                                        // reported as "unresolved"
  if (curation === "review") return meaning ? "published_review" : "unresolved";
  return meaning ? "published" : "incomplete";
}

/**
 * Resolves a word, catching a network-level failure instead of letting it
 * propagate as an exception -- callers need to tell "transient, still add
 * a placeholder" apart from "confirmed not found, reject" (see
 * enrichResolved's transient param).
 */
export async function resolveWordSafe(
  word: string,
): Promise<{ res: Resolution; transient: boolean }> {
  try {
    return { res: await resolveWord(word), transient: false };
  } catch (e) {
    if (e instanceof TransientLookupError) {
      return {
        res: {
          headword: word, typed: word, formNote: null, meaning: null,
          ambiguous: false, hasGermanEntry: false, source: "kaikki", entryId: null,
        },
        transient: true,
      };
    }
    throw e;
  }
}

/** Free-text summary for the vault card's Grammar field, from a KaikkiEntry
 * — same human-readable convention the old wikitext version produced
 * ("der; Plural: die Häuser" / "geht, ging, ist gegangen"), now built from
 * already-structured data instead of regex. */
export function buildGrammarNote(
  entry: { gender: string | null; declension: unknown; conjugation: unknown } | null,
): string | null {
  if (!entry) return null;
  const conj = entry.conjugation as { present?: Record<string, string>; past?: string; perfect?: string } | null;
  if (conj) {
    const parts = [conj.present?.er, conj.past, conj.perfect].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  if (entry.gender) {
    const decl = entry.declension as { nom?: { pl?: string } } | null;
    const plural = decl?.nom?.pl;
    return plural ? `${entry.gender}; Plural: die ${plural}` : entry.gender;
  }
  return null;
}

/**
 * Enriches an already-resolved word — IPA, grammar, example, declension/
 * conjugation, audio (Commons recording, else Edge TTS), all looked up
 * against the resolved headword's local KaikkiEntry. Rejects (no audio/
 * extraction done, EnrichmentResult.rejected set) an English loanword or a
 * confirmed-not-German word, unless the resolution itself was transient
 * (network hiccup on the translation fallback, not a real "not found") --
 * that case still gets a placeholder card, same as add_word.py's enrich_word.
 */
export async function enrichResolved(
  res: Resolution,
  audioDir: string,
  lesson: string | null = null,
  transient = false,
  ponsBudget?: PonsBudget,
  // The prior card/row's example+translation, when re-enriching a word that
  // already has one -- lets a good existing example survive a re-enrichment
  // pass instead of being unconditionally overwritten (see
  // pickBetterExample()'s doc comment). null for a brand-new word. Must
  // always be sourced as a PAIR (never just the example text) -- see
  // sync.ts's enrichIntoVault() for why the vault-linked path in particular
  // has to fetch this from the Word DB row, not the parsed vault card.
  existingExample: { example: string | null; exampleTranslation: string | null } | null = null,
): Promise<EnrichmentResult> {
  // Prefer the exact entry the resolution already identified (res.entryId)
  // over re-deriving "the primary entry" from res.headword -- see
  // Resolution.entryId's doc comment for the real, measured divergence this
  // closes (an inflected-form lookup and a bare headword lookup can
  // disagree on which homograph is "primary"). findPrimaryEntry() stays as
  // the fallback for the entryId-null case (nothing resolved) and the
  // defensive case where that specific entry has since been deleted.
  let entry = null;
  if (!transient) {
    entry = res.entryId ? await findEntryById(res.entryId) : null;
    if (!entry) entry = await findPrimaryEntry(res.headword);
  }

  const empty = {
    ipa: null,
    grammar: null,
    form: res.formNote,
    example: null,
    audioPath: null,
    declension: null,
    conjugation: null,
    exampleTranslation: null,
    lesson,
    headword: res.headword,
    typed: res.typed,
    curation: "generated" as const,
    reviewNote: null,
  };
  if (!transient && res.meaning && isEnglishCognate(res.headword, res.meaning, entry?.etymology ?? null)) {
    return { ...empty, meaning: res.meaning, found: true, rejected: "loanword" };
  }
  if (!transient && !res.meaning) {
    if (res.hasGermanEntry) {
      // A real KaikkiEntry exists for this headword -- just no usable
      // English gloss yet. Publish a placeholder + review card instead of
      // discarding a genuine German word (mirrors add_word.py's
      // "unresolved" outcome).
      return {
        ...empty, meaning: null, found: false, rejected: null,
        curation: "review",
        reviewNote: "No confirmed meaning found; a German entry exists -- please fill in manually.",
      };
    }
    return { ...empty, meaning: null, found: false, rejected: "not-german" };
  }

  let audioPath: string | null = null;
  if (entry?.audioFilename) {
    audioPath = await downloadCommonsAudio(entry.audioFilename, audioDir);
  }
  if (!audioPath) {
    audioPath = await synthesizeTts(res.headword, audioDir);
  }

  // pickBetterExample() decides whether the freshly-resolved entry's example
  // is actually an improvement over an already-existing one -- returns the
  // pair TOGETHER from one side or the other, never mixed (a candidate's
  // translation must never end up paired with a retained old example, or
  // vice versa -- the exact bug this closes).
  const candidateExample = {
    example: entry?.example ?? null,
    exampleTranslation: cleanExampleTranslation(entry?.exampleTranslation ?? null),
  };
  let { example, exampleTranslation } = pickBetterExample(
    existingExample ?? { example: null, exampleTranslation: null },
    candidateExample,
  );
  // Prefer the sourced KaikkiEntry translation; when a real German example
  // exists but no sourced translation does, fall back to a live machine
  // translation rather than leave it blank — same free endpoint
  // translateLiteral already uses for the meaning fallback above.
  if (example && !exampleTranslation) exampleTranslation = await translateText(example);

  // Review-flag signals are intrinsic to the resolution itself (ambiguous
  // senses, or the only meaning came from the machine-translation fallback)
  // -- PONS availability/failure must never independently create, remove,
  // or alter this (see pons.ts's doc comment).
  const needsReview = res.ambiguous || res.source === "translation" || !example;
  const reviewNote = res.ambiguous
    ? "Multiple plausible meanings; verify the intended sense."
    : res.source === "translation"
      ? "Meaning came from machine translation; verify it."
      : !example
        ? "No short pedagogical example was found; add one manually."
        : null;

  // PONS: live, server-log-only diagnostic only -- printed here for whoever
  // is watching the server log, but its result plays no part in anything
  // below (curation/reviewNote/what gets published). See pons.ts's doc
  // comment and the plan's Terms-of-Use discussion. Only reachable on this
  // "a meaning was found" path, same as the Python version -- never called
  // for the unresolved/rejected branches above.
  if (ponsBudget && ponsDiagnosticEligible(needsReview, res.formNote)) {
    await runPonsDiagnostic(res.headword, ponsBudget);
  }

  return {
    meaning: res.meaning,
    ipa: entry?.ipa ?? null,
    grammar: buildGrammarNote(entry),
    form: res.formNote,
    example,
    audioPath,
    declension: entry?.declension ?? null,
    conjugation: entry?.conjugation ?? null,
    exampleTranslation,
    lesson,
    found: res.meaning !== null,
    headword: res.headword,
    typed: res.typed,
    rejected: null,
    curation: needsReview ? "review" : "generated",
    reviewNote,
  };
}

/**
 * The full lookup pipeline for one word — resolution (case variants, lemma
 * following) plus enrichment. Callers adding words in batch should wait ~1s
 * between calls (politeness to the free translation-fallback API; the
 * per-request 429 retry handles whatever slips through — the primary
 * KaikkiEntry lookup itself is a local DB read with no rate limit).
 */
export async function enrichWord(
  word: string,
  audioDir: string,
  lesson: string | null = null,
): Promise<EnrichmentResult> {
  const { res, transient } = await resolveWordSafe(word);
  return enrichResolved(res, audioDir, lesson, transient);
}

export const BATCH_DELAY_MS = 1000;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

import type { CardFields } from "../vault/format.js";
import { downloadCommonsAudio, synthesizeTts } from "./audio.js";
import {
  type Resolution,
  TransientLookupError,
  findPrimaryEntry,
  isEnglishCognate,
  resolveWord,
} from "./kaikki.js";

export { resolveWord, type Resolution, TransientLookupError } from "./kaikki.js";

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
  // set (and no card written by the caller) when the word was an English
  // loanword or confirmed not German -- null on a transient failure, which
  // still gets a placeholder card so a bad network day never looks like a
  // rejection (mirrors add_word.py's enrich_word).
  rejected: "loanword" | "not-german" | null;
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
        res: { headword: word, typed: word, formNote: null, meaning: null, source: "kaikki" },
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
): Promise<EnrichmentResult> {
  const entry = transient ? null : await findPrimaryEntry(res.headword);

  const empty = {
    ipa: null,
    grammar: null,
    form: res.formNote,
    example: null,
    audioPath: null,
    declension: null,
    conjugation: null,
    lesson,
    headword: res.headword,
    typed: res.typed,
  };
  if (!transient && res.meaning && isEnglishCognate(res.headword, res.meaning, entry?.etymology ?? null)) {
    return { ...empty, meaning: res.meaning, found: true, rejected: "loanword" };
  }
  if (!transient && !res.meaning) {
    return { ...empty, meaning: null, found: false, rejected: "not-german" };
  }

  let audioPath: string | null = null;
  if (entry?.audioFilename) {
    audioPath = await downloadCommonsAudio(entry.audioFilename, audioDir);
  }
  if (!audioPath) {
    audioPath = await synthesizeTts(res.headword, audioDir);
  }

  return {
    meaning: res.meaning,
    ipa: entry?.ipa ?? null,
    grammar: buildGrammarNote(entry),
    form: res.formNote,
    example: entry?.example ?? null,
    audioPath,
    declension: entry?.declension ?? null,
    conjugation: entry?.conjugation ?? null,
    lesson,
    found: res.meaning !== null,
    headword: res.headword,
    typed: res.typed,
    rejected: null,
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

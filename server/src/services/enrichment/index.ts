import type { CardFields } from "../vault/format.js";
import { downloadCommonsAudio, synthesizeTts } from "./audio.js";
import {
  type Resolution,
  TransientLookupError,
  buildGrammarNote,
  extractAudioFilename,
  extractExample,
  extractIpa,
  getDeWikitext,
  isEnglishCognate,
  resolveWord,
} from "./wiktionary.js";

export { resolveWord, type Resolution, TransientLookupError } from "./wiktionary.js";

export interface EnrichmentResult extends CardFields {
  found: boolean; // false = meaning lookup failed, card added with a fill-manually note
  headword: string; // resolved lemma -- may differ from what was typed ("bist" -> "sein")
  typed: string;
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
        res: { headword: word, typed: word, formNote: null, meaning: null, source: "wiktionary" },
        transient: true,
      };
    }
    throw e;
  }
}

/**
 * Enriches an already-resolved word — IPA, grammar, example, audio (Commons
 * recording, else Edge TTS), all looked up against the resolved headword.
 * Rejects (no audio/extraction done, EnrichmentResult.rejected set) an
 * English loanword or a confirmed-not-German word, unless the resolution
 * itself was transient (network hiccup, not a real "not found") -- that
 * case still gets a placeholder card, same as add_word.py's enrich_word.
 */
export async function enrichResolved(
  res: Resolution,
  audioDir: string,
  lesson: string | null = null,
  transient = false,
): Promise<EnrichmentResult> {
  let wikitext: string | null = null;
  if (!transient) {
    wikitext = await getDeWikitext(res.headword);
    if (wikitext === null && res.headword !== res.typed) {
      wikitext = await getDeWikitext(res.typed);
    }
  }

  const empty = {
    ipa: null,
    grammar: null,
    form: res.formNote,
    example: null,
    audioPath: null,
    lesson,
    headword: res.headword,
    typed: res.typed,
  };
  if (!transient && res.meaning && isEnglishCognate(res.headword, res.meaning, wikitext)) {
    return { ...empty, meaning: res.meaning, found: true, rejected: "loanword" };
  }
  if (!transient && !res.meaning) {
    return { ...empty, meaning: null, found: false, rejected: "not-german" };
  }

  let audioPath: string | null = null;
  const audioFilename = extractAudioFilename(wikitext);
  if (audioFilename) {
    audioPath = await downloadCommonsAudio(audioFilename, audioDir);
  }
  if (!audioPath) {
    audioPath = await synthesizeTts(res.headword, audioDir);
  }

  return {
    meaning: res.meaning,
    ipa: extractIpa(wikitext),
    grammar: buildGrammarNote(wikitext),
    form: res.formNote,
    example: extractExample(wikitext),
    audioPath,
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
 * between calls (politeness to the free APIs; the per-request 429 retry
 * handles whatever slips through).
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

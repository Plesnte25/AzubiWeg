import type { CardFields } from "../vault/format.js";
import { downloadCommonsAudio, synthesizeTts } from "./audio.js";
import {
  type Resolution,
  buildGrammarNote,
  extractAudioFilename,
  extractExample,
  extractIpa,
  getDeWikitext,
  resolveWord,
} from "./wiktionary.js";

export { resolveWord, type Resolution } from "./wiktionary.js";

export interface EnrichmentResult extends CardFields {
  found: boolean; // false = meaning lookup failed, card added with a fill-manually note
  headword: string; // resolved lemma -- may differ from what was typed ("bist" -> "sein")
  typed: string;
}

/**
 * Enriches an already-resolved word — IPA, grammar, example, audio (Commons
 * recording, else Edge TTS), all looked up against the resolved headword.
 */
export async function enrichResolved(
  res: Resolution,
  audioDir: string,
  lesson: string | null = null,
): Promise<EnrichmentResult> {
  let wikitext = await getDeWikitext(res.headword);
  if (wikitext === null && res.headword !== res.typed) {
    wikitext = await getDeWikitext(res.typed);
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
  return enrichResolved(await resolveWord(word), audioDir, lesson);
}

export const BATCH_DELAY_MS = 1000;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

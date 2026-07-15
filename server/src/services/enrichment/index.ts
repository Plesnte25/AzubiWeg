import type { CardFields } from "../vault/format.js";
import { downloadCommonsAudio, synthesizeTts } from "./audio.js";
import {
  buildGrammarNote,
  extractAudioFilename,
  extractExample,
  extractIpa,
  getDeWikitext,
  getMeaning,
} from "./wiktionary.js";

export interface EnrichmentResult extends CardFields {
  found: boolean; // false = meaning lookup failed, card added with a fill-manually note
}

/**
 * The full lookup pipeline for one word — meaning, IPA, grammar, example,
 * audio (Commons recording, else Edge TTS). Callers adding words in batch
 * should wait ~1s between calls (politeness to the free APIs; the per-request
 * 429 retry handles whatever slips through).
 */
export async function enrichWord(
  word: string,
  audioDir: string,
  lesson: string | null = null,
): Promise<EnrichmentResult> {
  const [meaning, wikitext] = await Promise.all([getMeaning(word), getDeWikitext(word)]);

  let audioPath: string | null = null;
  const audioFilename = extractAudioFilename(wikitext);
  if (audioFilename) {
    audioPath = await downloadCommonsAudio(audioFilename, audioDir);
  }
  if (!audioPath) {
    audioPath = await synthesizeTts(word, audioDir);
  }

  return {
    meaning,
    ipa: extractIpa(wikitext),
    grammar: buildGrammarNote(wikitext),
    example: extractExample(wikitext),
    audioPath,
    lesson,
    found: meaning !== null,
  };
}

export const BATCH_DELAY_MS = 1000;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

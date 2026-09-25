import type { Wortart } from "../api/types";

const LEADING_POS_TAG = /^\((?:Noun|Verb|Adjective|Adverb|Interjection|Pronoun|Preposition|Conjunction|Numeral|Article)\)\s*/i;

/** Display-only: strips a redundant leading "(Noun)"/"(Verb)"/etc. tag from
 * a word's meaning — the word class is already shown via the header chip
 * and doesn't need repeating inside the meaning text too. Only the
 * *leading* tag is stripped; a later tag mid-string (e.g. a second sense
 * with a genuinely different class, "(Adverb) also...; (Interjection)
 * in answering...") is real, distinguishing information and stays.
 * Doesn't touch the stored data — meaning keeps its authored form for the
 * vault round-trip, this only affects what's rendered. */
export function stripLeadingPosTag(meaning: string, ownClass?: Wortart | null): string {
  const leading = meaning.match(LEADING_POS_TAG)?.[0].trim().slice(1, -1).toLowerCase() ?? null;
  const stripped = meaning.replace(LEADING_POS_TAG, "");
  if (ownClass === undefined) return stripped;
  // Display only, with the word's class known: a later tag that just repeats it (or the leading tag) is noise too —
  // "(Noun) bench; pew; (Noun) bank" → "bench; pew; bank". Tags naming a different class stay.
  const own = ownClass ? WORTART_POS[ownClass] : null;
  return stripped.replace(INNER_POS_TAG, (tag: string, cls: string) => {
    const c = cls.toLowerCase();
    return c === own || c === leading ? "" : tag;
  });
}

const INNER_POS_TAG = /\((Noun|Verb|Adjective|Adverb|Interjection|Pronoun|Preposition|Conjunction|Numeral|Article)\)\s*/gi;
const WORTART_POS: Partial<Record<Wortart, string>> = { Nomen: "noun", Verb: "verb", Adjektiv: "adjective", Adverb: "adverb" };

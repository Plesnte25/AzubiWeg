import type { Word } from "../api/types";

/*
 * A noun in dictionary notation: article, singular and plural ending together ("der Hund, -e", "das Haus, -¨er",
 * "das Museum, Museen", "die Eltern (Pl.)"), so the article and plural are learned as one. Mirrors the format half of
 * server/src/services/vocab/noun-notation.ts, which writes the same string into the vault card's Grammar field: keep
 * the two in step.
 */

const UMLAUT: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };

/** Stem vowel umlauted: last non-schwa vowel group, au -> äu, aa -> ä (same rule as the server). */
function umlautStem(singular: string): string | null {
  const g = [...singular.matchAll(/[aeiouäöüy]+/gi)].reverse().find((m) => m[0].toLowerCase() !== "e");
  if (!g) return null;
  const vowels = g[0];
  const i = [...vowels].findIndex((c) => UMLAUT[c]);
  if (i < 0) return null;
  const umlauted = /^aa$/i.test(vowels) ? UMLAUT[vowels[0]!]! : vowels.slice(0, i) + UMLAUT[vowels[i]!]! + vowels.slice(i + 1);
  return singular.slice(0, g.index) + umlauted + singular.slice(g.index! + vowels.length);
}

function pluralEnding(singular: string, plural: string): string {
  if (plural.startsWith(singular)) return `-${plural.slice(singular.length)}`;
  const v = umlautStem(singular);
  return v && plural.startsWith(v) ? `-¨${plural.slice(v.length)}` : plural;
}

/** A Grammar note already in this notation (cards rewritten by backfill:noun-notation, or newly enriched). */
const NOTATION = /^(der|die|das) [^\s,;]+(, \S+| \(Pl\.\))?$/;

/** The noun's notation, or null for a non-noun. Prefers the stored note; else builds it from gender and declension. */
export function nounNotation(word: Pick<Word, "headword" | "grammar" | "genus" | "declension">): string | null {
  if (word.grammar && NOTATION.test(word.grammar.trim())) return word.grammar.trim();
  if (!word.genus) return null;
  const decl = word.declension ? Object.values(word.declension) : [];
  if (decl.some((c) => c?.pl) && !decl.some((c) => c?.sg)) return `die ${word.headword} (Pl.)`;
  const singular = word.declension?.nom?.sg ?? word.headword;
  const plural = word.declension?.nom?.pl;
  if (!plural) return `${word.genus} ${singular}`;
  return `${word.genus} ${singular}, ${pluralEnding(singular, plural)}`;
}

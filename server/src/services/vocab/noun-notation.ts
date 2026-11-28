/**
 * Dictionary notation for nouns: the article, the singular and the plural ending together, the way Goethe word lists
 * print them, so a card teaches all three at once:
 *
 *   der Hund, -e        (Hunde: the singular plus an ending)
 *   das Haus, -¨er      (Häuser: umlaut plus an ending)
 *   der Lehrer, -       (Lehrer: plural same as the singular)
 *   der Vater, -¨       (Väter: umlaut only)
 *   das Museum, Museen  (the plural doesn't extend the singular, so it's written out)
 *   die Eltern (Pl.)    (plural-only)
 *   die Schadenfreude   (no plural known)
 *
 * This is the vault card's Grammar field for a noun (buildGrammarNote in enrichment/index.ts). It still starts with
 * der/die/das, so deriveGenus/deriveWortart read it unchanged. client/src/lib/nounNotation.ts mirrors the format
 * half of this file: keep them in step.
 */

const UMLAUT: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
const ARTICLE = /^(?:der|die|das|den|dem|des)\s+/i;
export const PLURAL_ONLY_MARK = "(Pl.)";

function stripArticle(form: string): string {
  return form.trim().replace(ARTICLE, "");
}

/**
 * The singular with its stem vowel umlauted, as German plurals do it: the last vowel group that isn't a schwa "e"
 * (Vater -> Väter, Apfel -> Äpfel), "au" -> "äu" (Haus -> Häus), "aa" -> "ä" (Saal -> Säl). null when that group has
 * no a/o/u to umlaut. One rule for both writing "-¨e" and reading it back, so the two always agree.
 */
function umlautStem(singular: string): string | null {
  const groups = [...singular.matchAll(/[aeiouäöüy]+/gi)].reverse();
  const g = groups.find((m) => m[0].toLowerCase() !== "e");
  if (!g) return null;
  const vowels = g[0];
  const i = [...vowels].findIndex((c) => UMLAUT[c]);
  if (i < 0) return null;
  const umlauted = /^aa$/i.test(vowels) ? UMLAUT[vowels[0]!]! : vowels.slice(0, i) + UMLAUT[vowels[i]!]! + vowels.slice(i + 1);
  return singular.slice(0, g.index) + umlauted + singular.slice(g.index! + vowels.length);
}

/** "-e", "-¨er", "-" (same as the singular), "-¨" (umlaut only), or null when the plural doesn't extend the singular. */
export function pluralSuffix(singular: string, plural: string): string | null {
  if (plural.startsWith(singular)) return `-${plural.slice(singular.length)}`;
  const v = umlautStem(singular);
  return v && plural.startsWith(v) ? `-¨${plural.slice(v.length)}` : null;
}

/** The note for a noun, or null without an article. `plural` null = none known; `pluralOnly` = the word IS the plural. */
export function formatNounNotation(opts: { article: string | null; singular: string; plural: string | null; pluralOnly?: boolean }): string | null {
  const singular = stripArticle(opts.singular);
  if (opts.pluralOnly) return `die ${singular} ${PLURAL_ONLY_MARK}`;
  if (!opts.article) return null;
  const plural = opts.plural ? stripArticle(opts.plural) : null;
  if (!plural) return `${opts.article} ${singular}`;
  return `${opts.article} ${singular}, ${pluralSuffix(singular, plural) ?? plural}`;
}

/** The plural spelled out from a singular and its notation ending ("-¨e" on Bahnhof -> Bahnhöfe), or null if it can't be. */
export function expandPlural(singular: string, ending: string): string | null {
  if (!ending.startsWith("-")) return ending || null; // written out in full (Museen)
  const rest = ending.slice(1);
  if (!rest.startsWith("¨")) return singular + rest;
  const v = umlautStem(singular);
  return v ? v + rest.slice(1) : null;
}

export interface ParsedNoun {
  article: "der" | "die" | "das";
  singular: string | null; // null in the old "der; Plural: die Häuser" shape, which never named the singular
  plural: string | null;
  pluralOnly: boolean;
}

/**
 * Reads a noun Grammar note in either shape: this notation, or the one before it ("der; Plural: die Häuser",
 * "die (nur Plural)", a bare "der") that older cards still carry until `npm run backfill:noun-notation` rewrites them.
 */
export function parseNounNote(grammar: string | null): ParsedNoun | null {
  const g = grammar?.trim();
  if (!g) return null;
  const head = g.match(/^(der|die|das)\b\s*(.*)$/i);
  if (!head) return null;
  const article = head[1]!.toLowerCase() as ParsedNoun["article"];
  const rest = head[2]!;

  // old shape
  if (rest === "" || rest.startsWith(";") || rest === "(nur Plural)") {
    const plural = rest.match(/Plural:\s*(?:die\s+)?([^\s,;]+)/i)?.[1] ?? null;
    return { article, singular: null, plural, pluralOnly: rest === "(nur Plural)" };
  }
  const pluralOnly = rest.match(/^(\S+)\s+\(Pl\.\)$/);
  if (pluralOnly) return { article, singular: null, plural: pluralOnly[1]!, pluralOnly: true };
  const m = rest.match(/^([^\s,;]+)(?:,\s*(\S+))?$/);
  if (!m) return null;
  const singular = m[1]!;
  return { article, singular, plural: m[2] ? expandPlural(singular, m[2]) : null, pluralOnly: false };
}

/** An old-shape note ("der; Plural: die Hunde", "die (nur Plural)", "der") in this notation, or null if it isn't one. */
export function upgradeNounNote(grammar: string | null, headword: string): string | null {
  const g = grammar?.trim();
  if (!g || !/^(der|die|das)(;\s*Plural:\s*die\s+[^\s,;]+|\s+\(nur Plural\))?$/i.test(g)) return null;
  const parsed = parseNounNote(g);
  if (!parsed) return null;
  return formatNounNotation({ article: parsed.article, singular: headword, plural: parsed.plural, pluralOnly: parsed.pluralOnly });
}

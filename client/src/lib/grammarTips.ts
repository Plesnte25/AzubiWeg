import type { Word } from "../api/types";

/**
 * A small, well-known set of German-learner suffix/prefix rules — not a
 * generated/AI tip, a deterministic lookup. Deliberately conservative:
 * noun-ending rules only fire when they agree with the word's own real
 * stored genus, so this never contradicts a real exception (e.g. "der
 * Junge") — it's a confirming pattern-note, not a fabricated claim.
 * Verb-prefix rules are a naive prefix match (a known limitation of this
 * kind of heuristic for German separable verbs), worded as "likely" rather
 * than asserted as certain fact.
 */

const NOUN_ENDING_RULES: { suffix: string; genus: NonNullable<Word["genus"]>; note: string }[] = [
  { suffix: "ung", genus: "die", note: "Nouns ending in -ung are almost always die." },
  { suffix: "heit", genus: "die", note: "Nouns ending in -heit are always die." },
  { suffix: "keit", genus: "die", note: "Nouns ending in -keit are always die." },
  { suffix: "schaft", genus: "die", note: "Nouns ending in -schaft are always die." },
  { suffix: "tion", genus: "die", note: "Nouns ending in -tion are always die." },
  { suffix: "sion", genus: "die", note: "Nouns ending in -sion are always die." },
  { suffix: "chen", genus: "das", note: "Nouns ending in -chen are always das (diminutive)." },
  { suffix: "lein", genus: "das", note: "Nouns ending in -lein are always das (diminutive)." },
  { suffix: "ling", genus: "der", note: "Nouns ending in -ling are always der." },
];

const SEPARABLE_PREFIXES = ["ab", "an", "auf", "aus", "ein", "mit", "nach", "vor", "zu", "weg", "her", "hin", "los", "zusammen"];
const INSEPARABLE_PREFIXES = ["be", "ge", "er", "ver", "zer", "ent", "emp", "miss"];

function nounTip(word: Word): string | null {
  if (!word.genus) return null;
  const lower = word.headword.toLowerCase();
  // longest suffix first so e.g. "-tion" matches before a shorter overlap would
  const rule = [...NOUN_ENDING_RULES]
    .sort((a, b) => b.suffix.length - a.suffix.length)
    .find((r) => lower.endsWith(r.suffix));
  return rule && rule.genus === word.genus ? rule.note : null;
}

function verbTip(word: Word): string | null {
  const lower = word.headword.toLowerCase();
  const minStemLength = 3; // avoid matching the prefix against the whole word itself
  const separable = SEPARABLE_PREFIXES.find((p) => lower.startsWith(p) && lower.length >= p.length + minStemLength);
  if (separable) {
    return `Likely a separable verb — "${separable}-" typically splits off and moves to the end in a main clause (e.g. "...${separable}").`;
  }
  const inseparable = INSEPARABLE_PREFIXES.find((p) => lower.startsWith(p) && lower.length >= p.length + minStemLength);
  if (inseparable) {
    return `Likely an inseparable verb — "${inseparable}-" never splits off, and the past participle usually has no "ge-".`;
  }
  return null;
}

export function generateGrammarTip(word: Word): string | null {
  if (word.wortart === "Verb") return verbTip(word);
  if (word.genus) return nounTip(word);
  return null;
}

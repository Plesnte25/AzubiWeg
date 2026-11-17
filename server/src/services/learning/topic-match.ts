/**
 * Matches what a source lesson teaches (Nicos Weg's grammar tags, "Conjugation: present tense (2)") to the user's
 * syllabus topics ("Regular conjugation"). The two vocabularies rarely share exact words — DW says "Vowel change:
 * e to i" where the syllabus says "Stem-changing verbs" — so both sides are mapped onto shared grammar concepts, and
 * shared content words (haben, können, irregular…) break ties. Pure; recomputed on read, nothing stored.
 *
 * Deliberately conservative: a point only matches when one or two topics clearly score best. A wrong "covers X"
 * would mislead more than a missing one.
 */

export interface MatchableTopic {
  id: string;
  level: string;
  title: string;
  theme: string | null;
  description: string | null;
  category: string;
}

/** Concept → pattern, tested against lowercased text. Order doesn't matter; SUPPRESSES resolves overlaps. */
const CONCEPTS: [string, RegExp][] = [
  ["alphabet", /alphabet|phonetic|pronunciation|spell/],
  ["present", /present tense|conjugation/],
  ["stem_change", /vowel change|stem-chang/],
  ["simple_past", /simple past|präteritum|war & hatte/],
  ["perfekt", /present perfect|perfekt|participle/],
  ["plusquam", /plusquamperfekt|past perfect/],
  ["imp_formal", /formal imperative|sie-imperative|imperative: formal/],
  ["imp_informal", /informal imperative|imperative: informal|du- and ihr-imperative/],
  ["imperative", /imperative|instructions/],
  ["possessive", /possessive/],
  ["pronoun", /pronoun(?!al)/],
  ["definite", /articles: definite|definite article|gender|der \/ die/],
  ["indefinite", /articles: indefinite|indefinite article|ein \/ eine/],
  ["articles", /\barticles?\b/],
  ["plural", /plural/],
  ["negation", /negat|\bnicht\b|\bkein/],
  ["nominative", /nominative|subject/],
  ["accusative", /accusative/],
  ["dative", /dative/],
  ["genitive", /genitive/],
  ["w_question", /w-question|question words?|w-fragen/],
  ["yes_no", /yes-no|yes\/no/],
  ["word_order", /sentence construction|questions and statements|second position|word order|tekamolo/],
  ["bracket", /sentence bracket|multi-part predicate/],
  ["modal", /modal|\bkönnen|\bmüssen|\bdürfen|\bwollen|\bsollen|\bmögen|\bmöchten/],
  ["separable", /separable/],
  ["prep_time", /prepositions? of time|^time: am|time: am|von … bis/],
  ["prep_place", /prepositions? of place|place: in/],
  ["two_way", /two-case|two-way|wo\? \+|wohin\?/],
  ["preposition", /preposition/],
  ["comparison", /comparison|comparative|superlative|wie\/als|so … wie/],
  ["adj_decl", /adjective declension|adjective endings|after (in)?definite articles/],
  ["konj2", /subjunctive|konjunktiv|würde|wishes/],
  ["future", /future|futur/],
  ["passive", /passive/],
  ["relative", /relative/],
  ["reflexive", /reflexive/],
  ["infinitive", /infinitive/],
  ["subordinate", /subordinate|weil|dass|wenn-|connector|conjunction/],
  ["indirect", /indirect/],
  ["n_decl", /n-declension/],
  ["compound", /compound|word formation/],
];

/** A more specific concept hides a broader one it implies, so "Modal verbs: conjugation" isn't also "present tense". */
const SUPPRESSES: Record<string, string[]> = {
  modal: ["present"],
  imp_formal: ["imperative"],
  imp_informal: ["imperative"],
  definite: ["articles"],
  indefinite: ["articles"],
  adj_decl: ["articles", "definite", "indefinite"],
  prep_time: ["preposition"],
  prep_place: ["preposition"],
  two_way: ["preposition", "prep_place"],
  plusquam: ["perfekt"],
  possessive: ["articles", "pronoun"],
};

/** A concept that always comes with a broader one: stem-changing verbs are still present-tense conjugation. */
const IMPLIES: Record<string, string[]> = {
  stem_change: ["present"],
  definite: ["articles"],
  indefinite: ["articles"],
};

/** Words that look alike but mean the opposite; sharing a stem must not count as a match. */
const CONFLICTS: [string, string][] = [
  ["regular", "irregular"],
  ["definite", "indefinite"],
  ["formal", "informal"],
];

/** Different words for the same thing in the two vocabularies. */
const WORD_SYNONYMS: Record<string, string> = { declension: "ending", endings: "ending", determiner: "article" };

const STOPWORDS = new Set(
  "the a an of and or to in with without for on at by is are be your you how what when which who verbs verb case cases clauses clause forms form common basic simple intro using use all conjugation".split(" "),
);

export function concepts(text: string): Set<string> {
  const t = text.toLowerCase();
  const found = new Set(CONCEPTS.filter(([, re]) => re.test(t)).map(([c]) => c));
  for (const c of [...found]) for (const hidden of SUPPRESSES[c] ?? []) found.delete(hidden);
  for (const c of [...found]) for (const implied of IMPLIES[c] ?? []) found.add(implied);
  return found;
}

export function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/\(\d+\)/g, " ")
      .split(/[^a-zäöüß]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      // crude plural folding ("brackets" = "bracket"), then the shared synonym
      .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
      .map((w) => WORD_SYNONYMS[w] ?? w),
  );
}

interface Scored {
  topic: MatchableTopic;
  score: number;
}

const CONCEPT_POINTS = 3;
/** A concept a topic only has through its theme ("sein & haben" under "Verbs: present tense") counts for less. */
const THEME_CONCEPT_POINTS = 2;
/** The point's head ("Personal pronouns" in "Personal pronouns: plural") says what it's about; the rest qualifies. */
const HEAD_POINTS = 2;
const WORD_POINTS = 2;
const CONFLICT_POINTS = -4;
const LEVELS = ["a1", "a2", "b1", "b2", "c1"];

/**
 * The syllabus topics one grammar point covers: the best-scoring grammar topics, if at most two tie for best.
 * A topic needs at least one shared concept; shared words (title, theme and description), the point's head concept
 * and nearness to `preferredLevel` (the source's level) add to the score, and topics more than one level above it
 * are never matched (an A1 lesson's "Adjective declension" is a first look, not B1's full tables).
 */
export function matchGrammarPoint(point: string, topics: MatchableTopic[], preferredLevel: string | null): MatchableTopic[] {
  const pc = concepts(point);
  if (pc.size === 0) return [];
  const colon = point.indexOf(":");
  const head = colon > 0 ? concepts(point.slice(0, colon)) : pc;
  const pw = words(point);
  const pref = preferredLevel ? LEVELS.indexOf(preferredLevel) : -1;
  const scored: Scored[] = [];
  for (const topic of topics) {
    if (topic.category !== "grammar") continue;
    const lvl = LEVELS.indexOf(topic.level);
    if (pref >= 0 && lvl > pref + 1) continue;
    const titleConcepts = concepts(topic.title);
    const fromTheme = titleConcepts.size === 0;
    const tc = fromTheme ? concepts(topic.theme ?? "") : titleConcepts;
    const shared = [...pc].filter((c) => tc.has(c));
    if (shared.length === 0) continue;
    const tw = words(`${topic.theme ?? ""} ${topic.title} ${topic.description ?? ""}`);
    const sharedWords = [...pw].filter((w) => tw.has(w)).length;
    const conflicts = CONFLICTS.filter(([a, b]) => (pw.has(a) && tw.has(b) && !tw.has(a)) || (pw.has(b) && tw.has(a) && !tw.has(b))).length;
    // a topic that is about more than the point (extra concepts) is a worse fit than one that's exactly it
    const extra = [...tc].filter((c) => !pc.has(c)).length;
    const nearness = pref < 0 ? 0 : lvl === pref ? 2 : Math.abs(lvl - pref) === 1 ? 1 : 0;
    scored.push({
      topic,
      score:
        shared.length * (fromTheme ? THEME_CONCEPT_POINTS : CONCEPT_POINTS) +
        shared.filter((c) => head.has(c)).length * HEAD_POINTS +
        sharedWords * WORD_POINTS +
        conflicts * CONFLICT_POINTS +
        nearness -
        extra,
    });
  }
  if (scored.length === 0) return [];
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  return top.length <= 2 ? top.map((s) => s.topic) : [];
}

export interface LessonTeaches {
  grammar: { point: string; topicIds: string[] }[];
  culture: string[];
  vocabCount: number | null;
  /** Every matched topic, de-duplicated, in first-mention order. */
  topicIds: string[];
}

export function lessonTeaches(
  unit: { grammarPoints: string[]; culturePoints: string[]; vocabCount: number | null },
  topics: MatchableTopic[],
  preferredLevel: string | null,
): LessonTeaches {
  const grammar = unit.grammarPoints.map((point) => ({
    point: point.replace(/\s*\(\d+\)\s*$/, ""),
    topicIds: matchGrammarPoint(point, topics, preferredLevel).map((t) => t.id),
  }));
  const topicIds = [...new Set(grammar.flatMap((g) => g.topicIds))];
  return { grammar, culture: unit.culturePoints, vocabCount: unit.vocabCount, topicIds };
}

import type { KaikkiEntry } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  SUPPORTED_POS,
  candidateTitles,
  combineMeaning,
  extractConjugation,
  extractDeclension,
  extractGender,
  firstExample,
  firstMeaning,
  isSpellingCognate,
  looksLikeEnglishLoanword,
  isPedagogicalExample,
  pickBetterExample,
  prioritizeEntry,
  resolutionTitles,
  selectExactCaseEntries,
  type KaikkiFormRaw,
  type KaikkiSenseRaw,
} from "../src/services/enrichment/kaikki.js";

/** Minimal KaikkiEntry fixture -- only combineMeaning's inputs (pos, meaning)
 * matter for these tests, everything else is a placeholder. */
function entry(overrides: Partial<KaikkiEntry>): KaikkiEntry {
  return {
    id: "x",
    headword: "x",
    headwordLower: "x",
    pos: "noun",
    gender: null,
    meaning: null,
    example: null,
    exampleTranslation: null,
    ipa: null,
    audioFilename: null,
    declension: null,
    conjugation: null,
    etymology: null,
    importedAt: new Date(),
    ...overrides,
  };
}

describe("SUPPORTED_POS", () => {
  it("includes interjection and name -- excluding them was the root cause of the 2026-09-18 'danke'/proper-noun incident", () => {
    expect(SUPPORTED_POS.has("interjection")).toBe(true);
    expect(SUPPORTED_POS.has("name")).toBe(true);
  });

  it("still includes the original 4 core word classes", () => {
    for (const pos of ["noun", "verb", "adj", "adv"]) expect(SUPPORTED_POS.has(pos)).toBe(true);
  });
});

describe("candidateTitles", () => {
  it("tries case variants and punctuation-stripped forms", () => {
    expect(candidateTitles("Bist")).toEqual(["Bist", "bist"]);
    expect(candidateTitles("Hallo!")).toEqual(["Hallo!", "hallo!", "Hallo", "hallo"]);
    expect(candidateTitles("Auf Wiedersehen")).toContain("auf Wiedersehen");
  });

  describe("resolutionTitles", () => {
    it("prefers lowercase lexical entries for capitalized input, then falls back to the original case", () => {
      expect(resolutionTitles("Prima")).toEqual(["prima", "Prima"]);
      expect(resolutionTitles("Belgien")).toEqual(["belgien", "Belgien"]);
    });

    it("does not change already-lowercase input ordering", () => {
      expect(resolutionTitles("prima")).toEqual(["prima", "Prima"]);
    });
  });
});

// Real declension/conjugation forms captured live from kaikki.org's German
// dictionary JSONL (kaikki.org-dictionary-German.jsonl, dump dated
// 2026-08-28), trimmed to the entries the extraction logic keys on -- see
// [[german-vocab-engine]]/deutschland-companion-project memory for the
// full research trail.
const HAUS_FORMS: KaikkiFormRaw[] = [
  { form: "Hauses", tags: ["genitive"] },
  { form: "Häuser", tags: ["plural"] },
  { form: "Häuschen", tags: ["diminutive", "neuter"] },
  { form: "strong", tags: ["table-tags"], source: "declension" },
  { form: "Haus", tags: ["nominative", "singular"], source: "declension" },
  { form: "Häuser", tags: ["definite", "nominative", "plural"], source: "declension" },
  { form: "Hauses", tags: ["genitive", "singular"], source: "declension" },
  { form: "Häuser", tags: ["definite", "genitive", "plural"], source: "declension" },
  { form: "Haus", tags: ["dative", "singular"], source: "declension" },
  { form: "Hause", tags: ["dative", "singular"], source: "declension" },
  { form: "Häusern", tags: ["dative", "definite", "plural"], source: "declension" },
  { form: "Haus", tags: ["accusative", "singular"], source: "declension" },
  { form: "Häuser", tags: ["accusative", "definite", "plural"], source: "declension" },
];

const GEHEN_FORMS: KaikkiFormRaw[] = [
  { form: "geht", tags: ["present", "singular", "third-person"] },
  { form: "gehend", tags: ["participle", "present"], source: "conjugation" },
  { form: "gehe", tags: ["first-person", "indicative", "present", "singular"], source: "conjugation" },
  { form: "gehen", tags: ["first-person", "indicative", "plural", "present"], source: "conjugation" },
  { form: "gehst", tags: ["indicative", "present", "second-person", "singular"], source: "conjugation" },
  { form: "geht", tags: ["indicative", "plural", "present", "second-person"], source: "conjugation" },
  { form: "geht", tags: ["indicative", "present", "singular", "third-person"], source: "conjugation" },
  { form: "gehen", tags: ["indicative", "plural", "present", "third-person"], source: "conjugation" },
];

describe("extractGender", () => {
  it("reads the de-noun head template's leading gender code", () => {
    expect(
      extractGender({
        word: "Haus",
        pos: "noun",
        head_templates: [{ name: "de-noun", args: { "1": "n,,^er" } }],
      }),
    ).toBe("das");
  });

  it("returns null when there is no de-noun template", () => {
    expect(extractGender({ word: "gehen", pos: "verb" })).toBeNull();
  });
});

describe("extractDeclension", () => {
  it("builds a full Nom/Akk/Dat/Gen x Sg/Pl table from declension-sourced forms", () => {
    expect(extractDeclension(HAUS_FORMS)).toEqual({
      nom: { sg: "Haus", pl: "Häuser" },
      gen: { sg: "Hauses", pl: "Häuser" },
      dat: { sg: "Haus", pl: "Häusern" },
      akk: { sg: "Haus", pl: "Häuser" },
    });
  });

  it("keeps the first form seen when a cell has more than one candidate", () => {
    // dative singular has both "Haus" and "Hause" in HAUS_FORMS, in that order
    expect(extractDeclension(HAUS_FORMS)?.dat?.sg).toBe("Haus");
  });

  it("ignores non-declension-sourced forms (diminutives, plain plural note)", () => {
    const table = extractDeclension(HAUS_FORMS);
    expect(JSON.stringify(table)).not.toContain("Häuschen");
  });

  it("returns null when there are no declension-sourced forms at all", () => {
    expect(extractDeclension(GEHEN_FORMS)).toBeNull();
  });
});

describe("extractConjugation", () => {
  it("builds the full present-tense 6-person grid from conjugation-sourced forms", () => {
    expect(extractConjugation(GEHEN_FORMS)?.present).toEqual({
      ich: "gehe",
      du: "gehst",
      er: "geht",
      wir: "gehen",
      ihr: "geht",
      sie: "gehen",
    });
  });

  it("ignores the plain present-tense form with no source tag", () => {
    // GEHEN_FORMS[0] ("geht", third-person singular present) has no
    // source: "conjugation" -- must not be double-counted or override the
    // properly-sourced third-person form
    expect(extractConjugation(GEHEN_FORMS)?.present?.er).toBe("geht");
  });

  it("returns null when there are no conjugation-sourced forms at all", () => {
    expect(extractConjugation(HAUS_FORMS)).toBeNull();
  });
});

describe("combineMeaning", () => {
  it("joins up to 2 entries' meanings with a (Pos) label", () => {
    const result = combineMeaning([
      entry({ pos: "noun", meaning: "existence, being" }),
      entry({ pos: "verb", meaning: "to be" }),
    ]);
    expect(result.meaning).toBe("(Noun) existence, being; (Verb) to be");
    expect(result.ambiguous).toBe(true);
  });

  it("drops an obscure long second sense (real hit: 'Buch' also has an unrelated anatomical noun entry)", () => {
    // real kaikki.org data, 2026-08-30 cutover
    const result = combineMeaning([
      entry({ pos: "noun", meaning: "book (collection of sheets of paper bound together...)" }),
      entry({ pos: "noun", meaning: "omasum, the third compartment of the stomach of a ruminant" }),
    ]);
    expect(result.meaning).toBe("(Noun) book (collection of sheets of paper bound together...)");
    // Only one sense actually got published -- the second was dropped for
    // being noise, so this isn't genuine ambiguity for a reader to resolve.
    expect(result.ambiguous).toBe(false);
  });

  it("keeps a short, genuinely useful second sense", () => {
    const result = combineMeaning([entry({ meaning: "house" }), entry({ pos: "verb", meaning: "to house" })]);
    expect(result.meaning).toBe("(Noun) house; (Verb) to house");
    expect(result.ambiguous).toBe(true);
  });

  it("returns null when no entry has a meaning", () => {
    const result = combineMeaning([entry({ meaning: null })]);
    expect(result.meaning).toBeNull();
    expect(result.ambiguous).toBe(false);
  });

  it("labels the new interjection/name POS classes (added after the 2026-09-18 incident)", () => {
    expect(combineMeaning([entry({ pos: "interjection", meaning: "thanks, thank you" })]).meaning).toBe(
      "(Interjection) thanks, thank you",
    );
    expect(combineMeaning([entry({ pos: "name", meaning: "Belgium" })]).meaning).toBe("(Proper noun) Belgium");
  });

  it("reproduces the real 'danke' shape end-to-end: a bare-fragment verb gloss is filtered out of contention entirely, leaving only the real interjection sense -- unambiguous, no spurious appended clause", () => {
    // Before the fix (SUPPORTED_POS excluded "interjection", and
    // FORM_OF_GLOSS_RE only matched a trailing "of X" clause): the verb
    // entry's bare-fragment gloss was the SOLE surviving candidate,
    // published silently as "(Verb) first-person singular present" with no
    // review flag. With both fixes, firstMeaning() nulls the verb's gloss
    // (see the firstMeaning bare-fragment tests below) before this entry
    // ever reaches combineMeaning, and the real interjection entry (now
    // importable) is the only one left.
    const interjection = entry({ pos: "interjection", meaning: "thanks, thank you" });
    const result = combineMeaning([interjection]);
    expect(result.meaning).toBe("(Interjection) thanks, thank you");
    expect(result.ambiguous).toBe(false);
    expect(result.meaning).not.toContain("first-person");
  });

  it("is not ambiguous when the combined string is truncated to just the first sense (140-char guard, distinct from the per-entry 40-char guard)", () => {
    // First entry alone is long but under no per-entry limit (only the
    // SECOND entry has the >40-char drop check) -- short enough second
    // entry that the 40-char guard doesn't fire, but the combined joined
    // string still exceeds 140 chars.
    const longFirst = "a".repeat(130);
    const result = combineMeaning([
      entry({ pos: "noun", meaning: longFirst }),
      entry({ pos: "verb", meaning: "to be" }),
    ]);
    expect(result.meaning).toBe(`(Noun) ${longFirst}`);
    expect(result.ambiguous).toBe(false);
  });
});

describe("prioritizeEntry", () => {
  it("moves the preferred entry to the front, preserving the rest's relative order", () => {
    const noun = entry({ id: "sein-noun", pos: "noun", meaning: "existence, being" });
    const verb = entry({ id: "sein-verb", pos: "verb", meaning: "to be" });
    const adj = entry({ id: "sein-adj", pos: "adj", meaning: "his" });
    // Real-world motivating case: "bist" is a form of the verb "sein", but a
    // bare headword lookup's POS_PRIORITY would sort the unrelated noun
    // "Sein" (existence/being) first -- prioritizeEntry corrects that once
    // resolveViaKaikki already knows which entry the form belongs to.
    expect(prioritizeEntry([noun, verb, adj], "sein-verb")).toEqual([verb, noun, adj]);
  });

  it("is a no-op when the preferred entry is already first", () => {
    const first = entry({ id: "a" });
    const second = entry({ id: "b" });
    expect(prioritizeEntry([first, second], "a")).toEqual([first, second]);
  });

  it("is a no-op when the preferred id isn't present", () => {
    const list = [entry({ id: "a" }), entry({ id: "b" })];
    expect(prioritizeEntry(list, "nonexistent")).toEqual(list);
  });

  it("handles a single-element list", () => {
    const only = entry({ id: "a" });
    expect(prioritizeEntry([only], "a")).toEqual([only]);
  });

  it("composes with combineMeaning to put the form-owning entry's sense first (the real 'bist'/'sein' case)", () => {
    const noun = entry({ id: "sein-noun", pos: "noun", meaning: "existence, being, essence" });
    const verb = entry({ id: "sein-verb", pos: "verb", meaning: "to be" });
    // Before the fix: resolveViaKaikki's form-lookup branch fed
    // combineMeaning() the POS_PRIORITY-sorted group as-is (noun first),
    // publishing "(Noun) existence...; (Verb) to be" for a word the user
    // reached by typing a VERB form ("bist"). prioritizeEntry() closes that.
    const unprioritized = combineMeaning([noun, verb]);
    expect(unprioritized.meaning).toBe("(Noun) existence, being, essence; (Verb) to be");

    const prioritized = combineMeaning(prioritizeEntry([noun, verb], "sein-verb"));
    expect(prioritized.meaning).toBe("(Verb) to be; (Noun) existence, being, essence");
  });
});

describe("selectExactCaseEntries", () => {
  it("restricts to exact-case matches, dropping cross-case homographs entirely", () => {
    const adj = entry({ id: "bar-adj", headword: "bar", pos: "adj", meaning: "bare, in cash" });
    const noun = entry({ id: "bar-noun", headword: "Bar", pos: "noun", meaning: "bar, nightclub" });
    expect(selectExactCaseEntries([noun, adj], "bar")).toEqual([adj]);
    expect(selectExactCaseEntries([noun, adj], "Bar")).toEqual([noun]);
  });

  it("is a no-op when no entry's headword matches the candidate exactly", () => {
    const list = [entry({ headword: "Bar", pos: "noun" })];
    expect(selectExactCaseEntries(list, "somethingelse")).toEqual(list);
  });

  it("is a no-op when the exact match is already the only entry", () => {
    const list = [entry({ headword: "bar" })];
    expect(selectExactCaseEntries(list, "bar")).toEqual(list);
  });

  it("keeps multiple entries when they're ALL exact-case matches (genuine same-casing ambiguity is preserved)", () => {
    const a = entry({ id: "a", headword: "bar", pos: "adj" });
    const b = entry({ id: "b", headword: "bar", pos: "adv" });
    expect(selectExactCaseEntries([a, b], "bar")).toEqual([a, b]);
  });

  it("real regression: the final combined meaning for 'bar' contains no 'Bar'/nightclub text, and isSpellingCognate on it is false -- reordering alone (the original fix attempt) wasn't enough, since combineMeaning still combines up to 2 entries", () => {
    const noun = entry({ id: "bar-noun", headword: "Bar", pos: "noun", meaning: "bar, nightclub" });
    const adj = entry({ id: "bar-adj", headword: "bar", pos: "adj", meaning: "bare, in cash" });
    // Merely reordering (moving adj first) still leaves noun combinable:
    const reorderedOnly = combineMeaning([adj, noun]);
    expect(reorderedOnly.meaning).toContain("nightclub");
    // Filtering to exact-case entries removes the cross-case homograph
    // from consideration entirely, not just from the front of the list:
    const filtered = combineMeaning(selectExactCaseEntries([noun, adj], "bar"));
    expect(filtered.meaning).toBe("(Adjective) bare, in cash");
    expect(filtered.meaning).not.toContain("nightclub");
    expect(isSpellingCognate("bar", filtered.meaning)).toBe(false);
  });
});

describe("firstMeaning / firstExample", () => {
  const HAUS_SENSES: KaikkiSenseRaw[] = [
    {
      glosses: ["house, building"],
      examples: [
        {
          text: "In dem Haus haben wir mal gewohnt.",
          translation: "We used to live in that house.",
        },
      ],
    },
  ];

  it("picks the first sense's real gloss", () => {
    expect(firstMeaning(HAUS_SENSES)).toBe("house, building");
    expect(firstMeaning([{ glosses: ["a"] }, { glosses: ["b"] }, { glosses: ["c"] }])).toBe("a");
  });

  it("returns null when no sense has a gloss", () => {
    expect(firstMeaning([{}])).toBeNull();
  });

  it("drops a gloss that's purely a grammatical cross-reference to another word", () => {
    // real kaikki.org data: "Haus" also has a verb entry ("singular
    // imperative of hausen"), and "gehen" has a noun entry that's entirely
    // "gerund of gehen" -- neither is a real independent sense
    expect(firstMeaning([{ glosses: ['gerund of gehen: "going"'] }])).toBeNull();
    expect(firstMeaning([{ glosses: ["singular imperative of hausen"] }])).toBeNull();
    expect(firstMeaning([{ glosses: ["first-person singular present of hausen"] }])).toBeNull();
  });

  it("drops a slash-separated case-list cross-reference gloss", () => {
    // real kaikki.org data: "Bücher" has its own entry whose only sense is
    // this -- a comma-free list of cases joined by "/", not a single case
    // name, which an earlier version of the filter regex missed entirely
    expect(firstMeaning([{ glosses: ["nominative/accusative/genitive plural of Buch"] }])).toBeNull();
  });

  it("drops a BARE grammatical fragment with no trailing 'of X' clause (the real 'danke' incident, 2026-09-18)", () => {
    // Real production hit: this was "danke"'s only locally-imported entry's
    // gloss (before "interjection" was added to SUPPORTED_POS) -- since the
    // old FORM_OF_GLOSS_RE only matched a trailing "of X", this bare
    // fragment slipped through as if it were a real meaning, and because it
    // was the sole surviving candidate, combineMeaning() published it
    // silently, unambiguous, no review flag: "(Verb) first-person singular
    // present" instead of "thanks, thank you".
    expect(firstMeaning([{ glosses: ["first-person singular present"] }])).toBeNull();
    // Also real: "Polen" hit the same shape with a case-list fragment.
    expect(firstMeaning([{ glosses: ["genitive/dative/accusative singular"] }])).toBeNull();
  });

  it("does NOT drop a real single-term short definition ('form'/'plural' as a legitimate gloss, not a cross-reference)", () => {
    expect(firstMeaning([{ glosses: ["form"] }])).toBe("form");
    expect(firstMeaning([{ glosses: ["plural"] }])).toBe("plural");
  });

  it("does not drop real content that merely contains one grammatical term amid other words", () => {
    expect(firstMeaning([{ glosses: ["past due"] }])).toBe("past due");
  });

  it("skips a cross-reference sense in favor of a real sense elsewhere in the same record", () => {
    expect(
      firstMeaning([{ glosses: ["gerund of gehen: going"] }, { glosses: ["house, building"] }]),
    ).toBe("house, building");
  });

  it("takes the LAST element of a multi-element gloss array (preamble + real definition)", () => {
    // real kaikki.org data: "sein"'s copulative sense is literally
    // `["As a copulative verb:", "to be"]` -- the first element is a
    // category preamble, not part of the definition
    expect(firstMeaning([{ glosses: ["As a copulative verb:", "to be"] }])).toBe("to be");
  });

  it("deprioritizes a sense tagged 'auxiliary' in favor of a real sense elsewhere", () => {
    // real kaikki.org data: "sein"'s first sense is the auxiliary note
    // ("forms the present perfect...") -- picking it over "to be" was the
    // exact historical bug the old wikitext pipeline's meaningFromEntries()
    // existed to avoid, recurring here in the new source
    expect(
      firstMeaning([
        { glosses: ["forms the present perfect and past perfect tenses of certain verbs"], tags: ["auxiliary", "irregular"] },
        { glosses: ["As a copulative verb:", "to be"], tags: ["copulative", "irregular"] },
      ]),
    ).toBe("to be");
  });

  it("finds the first sense with an example sentence", () => {
    expect(firstExample(HAUS_SENSES)).toEqual({
      text: "In dem Haus haben wir mal gewohnt.",
      translation: "We used to live in that house.",
    });
  });

  it("returns nulls when no sense has an example", () => {
    expect(firstExample([{ glosses: ["x"] }])).toEqual({ text: null, translation: null });
  });

  it("prefers a plain, non-quotation example over a quotation-tagged one, even when it appears in a LATER sense (real incident: short pedagogical examples replaced by long archaic quotations)", () => {
    const senses: KaikkiSenseRaw[] = [
      {
        glosses: ["answer"],
        examples: [
          {
            text: "Und die Antwort des Herrn ergehet über sie also, aus einer langen archaischen Quelle des neunzehnten Jahrhunderts.",
            type: "quotation",
            ref: "1850, Some Old Text",
          },
        ],
      },
      { glosses: ["reply"], examples: [{ text: "Ich erwarte eine Antwort auf meine Frage!" }] },
    ];
    expect(firstExample(senses).text).toBe("Ich erwarte eine Antwort auf meine Frage!");
  });

  it("prefers a plain example over one shaped like a bibliographic citation, even without explicit type/ref tags", () => {
    const senses: KaikkiSenseRaw[] = [
      { glosses: ["a"], examples: [{ text: "2006, Kai Steiner, Schmetterlinge im Bauch, p.103" }] },
      { glosses: ["b"], examples: [{ text: "Ein Buch liegt auf dem Tisch." }] },
    ];
    expect(firstExample(senses).text).toBe("Ein Buch liegt auf dem Tisch.");
  });

  it("prefers a real short sentence over a bare single-token fragment", () => {
    const senses: KaikkiSenseRaw[] = [
      { glosses: ["a"], examples: [{ text: "verdeutlichen" }] },
      { glosses: ["b"], examples: [{ text: "Zeig mir ein Beispiel." }] },
    ];
    expect(firstExample(senses).text).toBe("Zeig mir ein Beispiel.");
  });

  it("rejects quotation-only senses instead of publishing literary source text", () => {
    const senses: KaikkiSenseRaw[] = [
      { glosses: ["a"], examples: [{ text: "A very long archaic quotation indeed.", type: "quotation" }] },
      { glosses: ["b"], examples: [{ text: "Short quote.", type: "quotation" }] },
    ];
    expect(firstExample(senses)).toEqual({ text: null, translation: null });
  });

  it("drops an overlong quotation instead of publishing it as a card example", () => {
    expect(
      firstExample([
        {
          glosses: ["a"],
          examples: [{
            text: `This is an intentionally long literary quotation ${"that ".repeat(30)}should not be published.`,
            type: "quotation",
          }],
        },
      ]),
    ).toEqual({ text: null, translation: null });
  });

  it("picks the shortest candidate within the best tier when multiple are equally good", () => {
    const senses: KaikkiSenseRaw[] = [
      { glosses: ["a"], examples: [{ text: "Das ist ein längerer aber immer noch normaler Beispielsatz." }] },
      { glosses: ["b"], examples: [{ text: "Kurzer Satz." }] },
    ];
    expect(firstExample(senses).text).toBe("Kurzer Satz.");
  });

  it("normalizes embedded whitespace before measuring length", () => {
    const senses: KaikkiSenseRaw[] = [{ glosses: ["a"], examples: [{ text: "Ein   Satz\nmit  komischen Leerzeichen." }] }];
    expect(firstExample(senses).text).toBe("Ein Satz mit komischen Leerzeichen.");
  });
});

describe("pickBetterExample", () => {
  it("never replaces a non-empty existing example with null", () => {
    const existing = { example: "Der Hund bellt.", exampleTranslation: "The dog barks." };
    expect(pickBetterExample(existing, { example: null, exampleTranslation: null })).toEqual(existing);
  });

  it("rejects a candidate over 100 characters outright, even with no existing example at all", () => {
    const long = "a".repeat(101);
    const existing = { example: null, exampleTranslation: null };
    expect(pickBetterExample(existing, { example: long, exampleTranslation: "x" })).toEqual(existing);
  });

  it("accepts any candidate under the length cap when there's no existing example", () => {
    const candidate = { example: "Kurzer Satz.", exampleTranslation: "Short sentence." };
    expect(pickBetterExample({ example: null, exampleTranslation: null }, candidate)).toEqual(candidate);
  });

  it("a short existing example beats a much longer candidate (materially-longer guard)", () => {
    const existing = { example: "Kurzer Satz.", exampleTranslation: "Short sentence." };
    const candidate = { example: "a".repeat(50), exampleTranslation: "y" }; // >1.5x existing's length, under the 160 cap
    expect(pickBetterExample(existing, candidate)).toEqual(existing);
  });

  it("a poor (long, citation-like) existing example correctly loses to a good, clearly shorter candidate -- the materially-longer guard only blocks REPLACING with something longer, it doesn't protect a bad existing value from improvement", () => {
    const existing = {
      example: "2006, Kai Steiner, Schmetterlinge im Bauch (Junge Liebe, Band 8), Himmelstürmer Verlag, p.103",
      exampleTranslation: null,
    };
    const candidate = { example: "Ich erwarte eine Antwort auf meine Frage!", exampleTranslation: "I expect an answer to my question!" };
    expect(pickBetterExample(existing, candidate)).toEqual(candidate);
  });

  it("an existing example WITH its own translation beats a candidate carrying a DIFFERENT translation -- the pair is never split", () => {
    const existing = { example: "Kurzer Satz.", exampleTranslation: "Short sentence." };
    const candidate = { example: "a".repeat(50), exampleTranslation: "A completely different translation." };
    const result = pickBetterExample(existing, candidate);
    expect(result.example).toBe(existing.example);
    expect(result.exampleTranslation).toBe(existing.exampleTranslation);
    expect(result.exampleTranslation).not.toBe(candidate.exampleTranslation);
  });

  it("accepts a genuinely shorter improvement over the existing value", () => {
    const existing = { example: "Ein etwas längerer Beispielsatz als nötig.", exampleTranslation: "old" };
    const candidate = { example: "Das ist kurz.", exampleTranslation: "That is short." };
    expect(pickBetterExample(existing, candidate)).toEqual(candidate);
  });

  it("replaces a stale overlong example with a short pedagogical candidate", () => {
    const existing = { example: "Das ".padEnd(141, "x"), exampleTranslation: "old" };
    const candidate = { example: "Wir sprechen Deutsch.", exampleTranslation: "We speak German." };
    expect(pickBetterExample(existing, candidate)).toEqual(candidate);
  });

  it("rejects citation-shaped and quoted examples as learner content", () => {
    expect(isPedagogicalExample("2006, Some Author, Title, p. 103")).toBe(false);
    expect(isPedagogicalExample("„Das ist gut.“")).toBe(false);
    expect(isPedagogicalExample("Das ist gut.")).toBe(true);
  });
});

// Real etymology_text values captured live from kaikki.org, 2026-08-30 --
// the same word set the old wikitext-based looksLikeEnglishLoanword was
// tuned against (see the deleted wiktionary-resolution.test.ts / project
// memory), re-verified against this new English-prose source.
describe("looksLikeEnglishLoanword", () => {
  it("flags genuine English loanwords", () => {
    expect(looksLikeEnglishLoanword("Borrowed from English computer.")).toBe(true);
    expect(
      looksLikeEnglishLoanword(
        "Borrowed from English e-mail. The feminine gender probably after Post (“mail”), perhaps also Nachricht (“message”).",
      ),
    ).toBe(true);
    expect(looksLikeEnglishLoanword("Unadapted borrowing from English hobby.")).toBe(true);
    expect(looksLikeEnglishLoanword("Borrowed from English okay.")).toBe(true);
  });

  it("flags a short direct 'from English' origin with no native ancestry chain", () => {
    expect(looksLikeEnglishLoanword("19th century, from English sport.")).toBe(true);
  });

  it("does not flag a loanword borrowed from a different language", () => {
    expect(looksLikeEnglishLoanword("Borrowed from French restaurant.")).toBe(false);
    expect(looksLikeEnglishLoanword("20th century, from French taxi.")).toBe(false);
    expect(looksLikeEnglishLoanword("Borrowed from Latin informatio.")).toBe(false);
  });

  it("does not flag a native word whose etymology only lists English as a cognate", () => {
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German hant, from Old High German hant, from Proto-West Germanic *handu, from Proto-Germanic *handuz.\nCompare Dutch hand, English hand, West Frisian hân, Danish hånd.",
      ),
    ).toBe(false);
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German name, from Old High German namo, from Proto-West Germanic *namō. Cognate with Dutch naam, ... English name, West Frisian namme.",
      ),
    ).toBe(false);
    expect(
      looksLikeEnglishLoanword(
        "Inherited from Middle High German katze, Old High German kazza, from Proto-West Germanic *kattā. Akin to Old English catt (“cat”).",
      ),
    ).toBe(false);
  });

  it("does not flag a native Germanic word with no English mention at all", () => {
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German winder, winter, from Old High German wintar, from Proto-West Germanic *wintru, from Proto-Germanic *wintruz. Compare Dutch winter, English winter, Danish vinter.",
      ),
    ).toBe(false);
  });

  it("does not flag a cross-language cognate list ('Cognate with ... English')", () => {
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German ëȥȥen, from Old High German ëȥȥan, from Proto-West Germanic *etan.\nCognate with Low German eten, Alemannic German ässe, Dutch eten, English eat, Danish æde.",
      ),
    ).toBe(false);
  });

  it("does not flag a calque ('a calque of French X' -- the German word is native-formed)", () => {
    expect(looksLikeEnglishLoanword("From fern + sehen (“far-see”), a calque of French télévision.")).toBe(false);
  });

  it("does not flag a 'Compare ... English' cognate comparison", () => {
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German vliegen, Old High German fliogan, from Proto-West Germanic *fleugan. Compare Bavarian fliagn, Dutch vliegen, Low German flegen, English fly, Danish flyve.",
      ),
    ).toBe(false);
  });

  it("does not flag a 'Cognate with ... Doublet of' descendant/doublet note", () => {
    expect(
      looksLikeEnglishLoanword(
        "Inherited from Middle High German klein, kleine, from Old High German kleini, from Proto-West Germanic *klainī.\nCognate with Dutch klein and English clean. Doublet of clean.",
      ),
    ).toBe(false);
  });

  it("does not flag 'Compare ... English' even when English appears mid-list", () => {
    expect(
      looksLikeEnglishLoanword(
        "From Middle High German unde, from Old High German unti, from Proto-Germanic *andi. Compare Dutch en, English and, Danish end.",
      ),
    ).toBe(false);
  });

  it("returns false for missing etymology text", () => {
    expect(looksLikeEnglishLoanword(null)).toBe(false);
  });
});

describe("isSpellingCognate", () => {
  it("flags international words spelled/meaning the same as English, regardless of true origin", () => {
    expect(isSpellingCognate("Museum", "(Noun) museum")).toBe(true);
    expect(isSpellingCognate("Pilot", "(Noun) pilot")).toBe(true);
    expect(isSpellingCognate("Theater", "(Noun) theater")).toBe(true);
    expect(isSpellingCognate("Information", "(Noun) information")).toBe(true);
  });

  it("flags native Germanic cognates too -- confirmed 2026-08-08 as the intended wider rule", () => {
    expect(isSpellingCognate("Winter", "(Noun) winter")).toBe(true);
    expect(isSpellingCognate("Name", "(Noun) name")).toBe(true);
    expect(isSpellingCognate("Hand", "(Noun) hand")).toBe(true);
    expect(isSpellingCognate("Wind", "(Noun) wind")).toBe(true);
    expect(isSpellingCognate("Sport", "(Noun) sport, sports")).toBe(true);
  });

  it("does not flag a word whose gloss isn't spelling-close (Telefon/telephone)", () => {
    expect(isSpellingCognate("Telefon", "(Noun) telephone")).toBe(false);
  });

  it("does not flag 'Hallo'/'Hello' -- exact match only, no edit-distance tolerance", () => {
    expect(isSpellingCognate("Hallo!", "Hello!")).toBe(false);
  });

  it("is safe against false friends -- compares against the word's own resolved meaning, not a wordlist", () => {
    expect(isSpellingCognate("Gift", "(Noun) poison")).toBe(false);
    expect(isSpellingCognate("Rat", "(Noun) advice, counsel")).toBe(false);
  });

  it("does not flag an unrelated word with a different meaning entirely", () => {
    expect(isSpellingCognate("Zentrum", "(Noun) center, centre")).toBe(false);
    expect(isSpellingCognate("Katze", "(Noun) house cat, Felis silvestris catus")).toBe(false);
  });

  it("does not flag a word whose gloss is a self-referential grammatical cross-reference", () => {
    expect(isSpellingCognate("Sprechen", '(Noun) gerund of sprechen: "speaking"')).toBe(false);
    expect(
      isSpellingCognate("Wiederholen", "(Noun) gerund of wiederholen; (Noun) gerund of wiederholen"),
    ).toBe(false);
    expect(isSpellingCognate("Zahlen", "(Noun) gerund of zahlen; (Noun) plural of Zahl")).toBe(false);
  });

  it("only checks the first (primary) sense, not secondary senses", () => {
    expect(isSpellingCognate("Guten Tag.", "Hello.; Good day.")).toBe(false);
  });

  it("returns false for a null meaning", () => {
    expect(isSpellingCognate("Museum", null)).toBe(false);
  });
});

import type { KaikkiEntry } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  candidateTitles,
  combineMeaning,
  extractConjugation,
  extractDeclension,
  extractGender,
  firstExample,
  firstMeaning,
  isSpellingCognate,
  looksLikeEnglishLoanword,
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

describe("candidateTitles", () => {
  it("tries case variants and punctuation-stripped forms", () => {
    expect(candidateTitles("Bist")).toEqual(["Bist", "bist"]);
    expect(candidateTitles("Hallo!")).toEqual(["Hallo!", "hallo!", "Hallo", "hallo"]);
    expect(candidateTitles("Auf Wiedersehen")).toContain("auf Wiedersehen");
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
    expect(
      combineMeaning([entry({ pos: "noun", meaning: "existence, being" }), entry({ pos: "verb", meaning: "to be" })]),
    ).toBe("(Noun) existence, being; (Verb) to be");
  });

  it("drops an obscure long second sense (real hit: 'Buch' also has an unrelated anatomical noun entry)", () => {
    // real kaikki.org data, 2026-08-30 cutover
    expect(
      combineMeaning([
        entry({ pos: "noun", meaning: "book (collection of sheets of paper bound together...)" }),
        entry({ pos: "noun", meaning: "omasum, the third compartment of the stomach of a ruminant" }),
      ]),
    ).toBe(
      "(Noun) book (collection of sheets of paper bound together...)",
    );
  });

  it("keeps a short, genuinely useful second sense", () => {
    expect(combineMeaning([entry({ meaning: "house" }), entry({ pos: "verb", meaning: "to house" })])).toBe(
      "(Noun) house; (Verb) to house",
    );
  });

  it("returns null when no entry has a meaning", () => {
    expect(combineMeaning([entry({ meaning: null })])).toBeNull();
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

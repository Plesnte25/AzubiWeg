import { describe, expect, it } from "vitest";
import {
  candidateTitles,
  cleanDefinition,
  extractLemma,
  meaningFromEntries,
} from "../src/services/enrichment/wiktionary.js";

// Fixture HTML captured from the live en.wiktionary REST API (2026-07-17),
// trimmed to the attributes the extraction logic keys on.

const BIST_FORM_OF =
  '<span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#second_person">second-person</a> <a href="/wiki/Appendix:Glossary#singular_number">singular</a> <a href="/wiki/Appendix:Glossary#present_tense">present</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a rel="mw:WikiLink" href="/wiki/sein#German" title="sein">sein</a></i></span></span>';

const WOHNE_SUBSENSE =
  '<span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#first_person">first-person</a> singular present</span>';

const LEHRER_AGENT_NOUN =
  '<span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#agent_noun" title="Appendix:Glossary">agent noun</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a href="/wiki/lehren#German" title="lehren">lehren</a></i></span></span>';

const BUCH_BOOK =
  '<a rel="mw:WikiLink" href="/wiki/book" title="book">book</a> <span class="mention-gloss-paren">(</span><span class="mention-gloss">collection of sheets of paper bound together to hinge at one edge<span typeof="mw:Entity">;</span> long work fit for publication</span><span class="mention-gloss-paren">)</span>';

const BUCH_OMASUM =
  '<span class="usage-label-sense"></span> <a href="/wiki/omasum" title="omasum">omasum</a>, the third compartment of the stomach of a <a href="/wiki/ruminant" title="ruminant">ruminant</a>';

const APFEL_SURNAME =
  '<span class="use-with-mention">a <a href="/wiki/surname" title="surname">surname</a></span>';

const ZENTRUM_NESTED_LIST =
  '<a href="/wiki/center" title="center">center</a>, <a href="/wiki/centre" title="centre">centre</a>\n<ol><li><span class="usage-label-sense"></span> <a href="/wiki/central">central</a> point, the middle</li></ol>';

const SEIN_AUX =
  '<span class="usage-label-sense"></span> <span class="use-with-mention">forms the present perfect and past perfect tenses of certain verbs</span>';

const SEIN_COPULA =
  '<span class="use-with-mention">As a <a href="/wiki/copulative">copulative</a> <a href="/wiki/verb">verb</a><span typeof="mw:Entity">:</span></span>\n<ol><li><span class="usage-label-sense"></span> to <a href="/wiki/be">be</a></li></ol>';

describe("extractLemma", () => {
  it("follows inflections to the lemma with a description", () => {
    expect(extractLemma(BIST_FORM_OF)).toEqual([
      "sein",
      "second-person singular present of sein",
    ]);
  });

  it("does not follow derivational relations (agent nouns keep their own card)", () => {
    expect(extractLemma(LEHRER_AGENT_NOUN)).toBeNull();
  });

  it("returns null for linkless sub-sense fragments and regular senses", () => {
    expect(extractLemma(WOHNE_SUBSENSE)).toBeNull();
    expect(extractLemma(BUCH_BOOK)).toBeNull();
  });
});

describe("cleanDefinition", () => {
  it("drops parenthetical glosses", () => {
    expect(cleanDefinition(BUCH_BOOK)).toBe("book");
  });

  it("keeps only the gloss before an embedded sub-sense list", () => {
    expect(cleanDefinition(ZENTRUM_NESTED_LIST)).toBe("center, centre");
  });

  it("recovers the first sub-sense when the pre-list part is only a preamble", () => {
    expect(cleanDefinition(SEIN_COPULA)).toBe("to be");
  });
});

describe("meaningFromEntries", () => {
  it("prefers unlabeled senses over usage-labeled ones", () => {
    const meaning = meaningFromEntries([
      { partOfSpeech: "Verb", definitions: [{ definition: SEIN_AUX }, { definition: SEIN_COPULA }] },
    ]);
    expect(meaning).toBe("(Verb) to be");
  });

  it("drops surname senses and obscure long second senses", () => {
    expect(
      meaningFromEntries([
        { partOfSpeech: "Noun", definitions: [{ definition: BUCH_BOOK }] },
        { partOfSpeech: "Noun", definitions: [{ definition: BUCH_OMASUM }] },
        { partOfSpeech: "Proper noun", definitions: [{ definition: APFEL_SURNAME }] },
      ]),
    ).toBe("(Noun) book");
  });

  it("returns null when every sense is a followable inflection", () => {
    expect(
      meaningFromEntries([{ partOfSpeech: "Verb", definitions: [{ definition: BIST_FORM_OF }] }]),
    ).toBeNull();
  });
});

describe("candidateTitles", () => {
  it("tries case variants and punctuation-stripped forms", () => {
    expect(candidateTitles("Bist")).toEqual(["Bist", "bist"]);
    expect(candidateTitles("Hallo!")).toEqual(["Hallo!", "hallo!", "Hallo", "hallo"]);
    expect(candidateTitles("Auf Wiedersehen")).toContain("auf Wiedersehen");
  });
});

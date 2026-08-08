import { describe, expect, it } from "vitest";
import {
  candidateTitles,
  cleanDefinition,
  extractLemma,
  looksLikeEnglishLoanword,
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

// Herkunft (etymology) section text captured from live de.wiktionary.org
// lookups during the Python port (2026-08-08), trimmed to what the
// borrowing-marker regex keys on.
const COMPUTER_HERKUNFT =
  "{{Herkunft}}\n:in der zweiten Hälfte des zwanzigsten Jahrhunderts übernommen vom gleichbedeutenden [[englisch]]en Wort ''{{Ü|en|computer}},'' welches auf ''to {{Ü|en|compute}}'' „[[rechnen]]“ zurückgeht.\n{{Synonyme}}";
const EMAIL_HERKUNFT =
  "{{Herkunft}}\n:von gleichbedeutend {{en.}} ''[[e-mail]],'' Abkürzung für ''electronic mail'' „elektronische Post“, ins Deutsche übernommen in der zweiten Hälfte des 20. Jahrhunderts.\n{{Synonyme}}";
const RESTAURANT_HERKUNFT =
  "{{Herkunft}}\n:im 19. Jahrhundert von französisch ''{{Ü|fr|restaurant}}'' entlehnt\n{{Synonyme}}";
// "altenglisch" (Old English) is a cognate-language mention, not a
// borrowing claim -- this is the exact false positive the (?<!\w) word
// boundary in looksLikeEnglishLoanword exists to avoid (found live against
// "Name"'s real Herkunft section during the Python port).
const NAME_HERKUNFT =
  "{{Herkunft}}\n:verwandte [[germanische]] Wörter: [[altfriesisch]] ''{{Ü|ofs|noma}}'', [[altenglisch]] ''{{Ü|ang|nama}}'', [[altnordisch]] ''{{Ü|non|nafn}}''.\n{{Synonyme}}";
const WINTER_HERKUNFT =
  "{{Herkunft}}\n:von mittelhochdeutsch ''winter, winder'', althochdeutsch ''wintar'', germanisch *''went-r-'' „Winter“.\n{{Synonyme}}";
// Found live against these exact words while tuning the heuristic
// (2026-08-08) -- a bare mention of "englisch" in a cognate-comparison list
// or calque note is not a borrowing claim; see the block comment above
// BORROW_VERB_RE in wiktionary.ts for the full reasoning.
const ESSEN_HERKUNFT =
  "{{Herkunft}}\n:von mittelhochdeutsch ''eʒʒen''; etymologisch verwandt mit altfriesisch ''īta,'' altnordisch ''eta,'' englisch ''eat,'' niederländisch ''eten.''\n{{Synonyme}}";
const FERNSEHEN_HERKUNFT =
  "{{Herkunft}}\n:Anfang des 20. Jahrhunderts als Übersetzung von englisch ''television'' gebildet.\n{{Synonyme}}";
const FLIEGEN_HERKUNFT =
  "{{Herkunft}}\n:von althochdeutsch ''fliogan'', zu urgermanisch *''fleug-a-'', vergleiche englisch ''fly''.\n{{Synonyme}}";
const KATZE_HERKUNFT =
  "{{Herkunft}}\n:von althochdeutsch ''kazza'', von westgermanisch ''kattōn-'' (vergleiche englisch ''cat'').\n{{Synonyme}}";
const KLEIN_HERKUNFT =
  "{{Herkunft}}\n:auf westgermanisch *klaini– zurück, welches sich auch in altenglisch ''clæne'' 'rein' (daraus englisch ''clean'' 'sauber') bezeugen lässt.\n{{Synonyme}}";
const UND_HERKUNFT =
  "{{Herkunft}}\n:aus protogermanisch *unda; vergleiche niederländisch ''en,'' englisch ''and'' - möglicherweise verwandt mit altindisch ''atha''.\n{{Synonyme}}";
const HOBBY_HERKUNFT = "{{Herkunft}}\n:im 20. Jahrhundert entlehnt aus englisch ''hobby''.\n{{Synonyme}}";
const HEY_HERKUNFT = "{{Herkunft}}\n:englisch ''hey''\n{{Synonyme}}";

describe("looksLikeEnglishLoanword", () => {
  it("flags genuine English loanwords via their Herkunft section", () => {
    expect(looksLikeEnglishLoanword(COMPUTER_HERKUNFT)).toBe(true);
  });

  it("catches the {{en.}} abbreviation template, not just the spelled-out word", () => {
    expect(looksLikeEnglishLoanword(EMAIL_HERKUNFT)).toBe(true);
  });

  it("does not flag a loanword borrowed from a different language", () => {
    expect(looksLikeEnglishLoanword(RESTAURANT_HERKUNFT)).toBe(false);
  });

  it("does not flag a native word whose Herkunft only mentions Old English as a cognate", () => {
    expect(looksLikeEnglishLoanword(NAME_HERKUNFT)).toBe(false);
  });

  it("does not flag a native Germanic word with no English mention at all", () => {
    expect(looksLikeEnglishLoanword(WINTER_HERKUNFT)).toBe(false);
  });

  it("does not flag a cross-language cognate list ('verwandt mit ... englisch')", () => {
    expect(looksLikeEnglishLoanword(ESSEN_HERKUNFT)).toBe(false);
  });

  it("does not flag a calque ('Übersetzung von englisch X' -- the German word is native-formed)", () => {
    expect(looksLikeEnglishLoanword(FERNSEHEN_HERKUNFT)).toBe(false);
  });

  it("does not flag a 'vergleiche englisch' cognate comparison", () => {
    expect(looksLikeEnglishLoanword(FLIEGEN_HERKUNFT)).toBe(false);
    expect(looksLikeEnglishLoanword(KATZE_HERKUNFT)).toBe(false);
  });

  it("does not flag a 'daraus englisch' descendant note", () => {
    expect(looksLikeEnglishLoanword(KLEIN_HERKUNFT)).toBe(false);
  });

  it("does not flag 'vergleiche ... verwandt mit' even when englisch appears mid-list", () => {
    expect(looksLikeEnglishLoanword(UND_HERKUNFT)).toBe(false);
  });

  it("flags a real borrowing verb ('entlehnt aus englisch')", () => {
    expect(looksLikeEnglishLoanword(HOBBY_HERKUNFT)).toBe(true);
  });

  it("flags terse-style entries with no linking verb ('englisch hey' as the whole etymology)", () => {
    expect(looksLikeEnglishLoanword(HEY_HERKUNFT)).toBe(true);
  });

  it("returns false for missing wikitext", () => {
    expect(looksLikeEnglishLoanword(null)).toBe(false);
  });
});

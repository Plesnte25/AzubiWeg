import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMasterFile, parseInboxFile } from "../src/services/vault/parser.js";
import { renderBody, serializeMasterFile } from "../src/services/vault/writer.js";
import {
  formatCardLine,
  formatSrLine,
  parseCardFields,
  parseSrLine,
  cardFront,
  shouldProtectCard,
  firstProtected,
  stripIpaSlashes,
  type CardCuration,
} from "../src/services/vault/format.js";

const fixture = readFileSync(path.join(import.meta.dirname, "fixtures", "master.md"), "utf-8");

describe("master.md round-trip", () => {
  it("serializes back byte-identically", () => {
    const parsed = parseMasterFile(fixture);
    expect(serializeMasterFile(parsed.headerLines, parsed.cards)).toBe(fixture);
  });

  it("finds every card", () => {
    const parsed = parseMasterFile(fixture);
    const cardLineCount = fixture.split("\n").filter((l) => l.includes("::")).length;
    expect(parsed.cards.length).toBe(cardLineCount);
  });

  it("keeps SR metadata attached to the right cards", () => {
    const { cards } = parseMasterFile(fixture);
    const apfel = cards.find((c) => c.front === "Apfel");
    expect(apfel?.sr).toEqual({ due: "2026-07-15", interval: 4, ease: 270 });
    const auch = cards.find((c) => c.front === "auch");
    expect(auch?.sr).toBeNull();
  });

  it("adding a card keeps existing SR history and sorts alphabetically", () => {
    const parsed = parseMasterFile(fixture);
    const before = parsed.cards.length;
    const line = formatCardLine({
      front: "Zug",
      meaning: "(Noun) train",
      ipa: "t͡suːk",
      grammar: "der; Plural: die Züge",
      example: "Der Zug ist pünktlich.",
      audioPath: "audio/De-Zug.mp3",
      lesson: null,
      curation: "generated",
      reviewNote: null,
    });
    parsed.cards.push({
      front: "Zug",
      sortKey: "zug",
      cardLine: line,
      srLines: [],
      fields: parseCardFields(line),
      sr: null,
    });
    const output = serializeMasterFile(parsed.headerLines, parsed.cards);
    expect(output.indexOf("- **Zug** ::")).toBeGreaterThan(output.indexOf("**Zimmer**"));
    // every SR comment from the original survives
    const srBefore = fixture.match(/<!--SR:[^\n]*/g) ?? [];
    for (const sr of srBefore) expect(output).toContain(sr);
    expect(parseMasterFile(output).cards.length).toBe(before + 1);
  });
});

describe("field extraction", () => {
  const { cards } = parseMasterFile(fixture);

  it("parses a fully-populated noun card", () => {
    const apfel = cards.find((c) => c.front === "Apfel")!;
    expect(apfel.fields).toEqual({
      meaning: "(Noun) apple (fruit); (Proper noun) a surname",
      ipa: "ˈap͡fl̩",
      grammar: "der; Plural: die Äpfel",
      form: null,
      example: "Der Apfel ist eine Obstart.",
      audioPath: "audio/De-Apfel.mp3",
      lesson: null,
      curation: "generated",
      reviewNote: null,
    });
  });

  it("parses lesson tags", () => {
    const auch = cards.find((c) => c.front === "auch")!;
    expect(auch.fields.lesson).toBe("hallo");
  });

  it("parses phrase cards without IPA/grammar", () => {
    const phrase = cards.find((c) => c.front === "Es geht mir gut.")!;
    expect(phrase.fields.ipa).toBeNull();
    expect(phrase.fields.grammar).toBeNull();
    expect(phrase.fields.audioPath).toBe("audio/Es_geht_mir_gut.-tts.mp3");
    expect(phrase.fields.lesson).toBe("hallo");
  });
});

describe("stripIpaSlashes", () => {
  it("strips a single outer-wrapped pair", () => {
    expect(stripIpaSlashes("/hʊnt/")).toBe("hʊnt");
  });

  it("strips a double-wrapped value in one pass (the real 2026-09-18 incident's corruption pattern)", () => {
    expect(stripIpaSlashes("//ˈantvɔʁt//")).toBe("ˈantvɔʁt");
  });

  it("is a no-op on an already-bare value", () => {
    expect(stripIpaSlashes("hʊnt")).toBe("hʊnt");
  });

  it("leaves an internal slash untouched when there's no outer wrap", () => {
    expect(stripIpaSlashes("ˈanta/ˈantɐ")).toBe("ˈanta/ˈantɐ");
  });
});

describe("format helpers", () => {
  it("formatCardLine matches the Python format_row output shape", () => {
    const line = formatCardLine({
      front: "Hund",
      meaning: "(Noun) dog, hound",
      ipa: "hʊnt",
      grammar: "der; Plural: die Hunde",
      example: "Der Hund bellt.",
      audioPath: "audio/De-Hund.mp3",
      lesson: null,
      curation: "generated",
      reviewNote: null,
    });
    expect(line).toBe(
      "- **Hund** :: **Meaning:** (Noun) dog, hound<br>**IPA:** /hʊnt/<br>**Grammar:** der; Plural: die Hunde<br>**Example:** *Der Hund bellt.*<br>![[audio/De-Hund.mp3]]\n",
    );
  });

  it("does not double-wrap an already-slash-delimited IPA value (Kaikki's raw dump often already has slashes)", () => {
    const line = formatCardLine({
      front: "Hund", meaning: "dog", ipa: "/hʊnt/", grammar: null, form: null,
      example: null, audioPath: null, lesson: null, curation: "generated", reviewNote: null,
    });
    expect(line).toContain("**IPA:** /hʊnt/");
    expect(line).not.toContain("//hʊnt//");
  });

  it("parseCardFields fully un-wraps a double-wrapped IPA field in one pass, not just one layer", () => {
    const line = "- **Antwort** :: **Meaning:** answer<br>**IPA:** //ˈantvɔʁt//<br>\n";
    expect(parseCardFields(line).ipa).toBe("ˈantvɔʁt");
  });

  it("formatCardLine(parseCardFields(x)) is idempotent -- no slash growth on repeated round-trips", () => {
    const once = formatCardLine({
      front: "Hund", meaning: "dog", ipa: "hʊnt", grammar: null, form: null,
      example: null, audioPath: null, lesson: null, curation: "generated", reviewNote: null,
    });
    const twice = formatCardLine({ front: "Hund", ...parseCardFields(once) });
    expect(twice).toBe(once);
  });

  it("never emits a <!--curated:generated--> marker", () => {
    const line = formatCardLine({
      front: "Hund", meaning: "dog", ipa: null, grammar: null, form: null,
      example: null, audioPath: null, lesson: null, curation: "generated", reviewNote: null,
    });
    expect(line).not.toContain("curated:generated");
    expect(line).not.toContain("<!--curated:");
  });

  // Full matrix from the plan: no lesson/no marker, lesson only, each of the
  // three marker kinds alone, and each marker kind combined with a lesson --
  // covers the exact bug that was fixed (the curation marker must be
  // stripped BEFORE the $-anchored lesson-tag regex runs, or a trailing
  // marker after the lesson tag stops it from matching at all).
  const baseFields = {
    meaning: "dog", ipa: "hʊnt", grammar: "der", form: null,
    example: "Ein Hund.", audioPath: "audio/Hund.mp3",
  };
  const matrix: { lesson: string | null; curation: "generated" | "review" | "manual" | "mt" }[] = [
    { lesson: null, curation: "generated" },
    { lesson: "hallo", curation: "generated" },
    { lesson: null, curation: "review" },
    { lesson: "hallo", curation: "review" },
    { lesson: null, curation: "manual" },
    { lesson: "hallo", curation: "manual" },
    { lesson: null, curation: "mt" },
    { lesson: "hallo", curation: "mt" },
  ];
  for (const { lesson, curation } of matrix) {
    it(`round-trips lesson=${lesson ?? "none"} curation=${curation}`, () => {
      const reviewNote = curation === "review" ? "Multiple plausible meanings; verify the intended sense." : null;
      const line = formatCardLine({ front: "Hund", ...baseFields, lesson, curation, reviewNote });
      const parsed = parseCardFields(line);
      expect(parsed.lesson).toBe(lesson);
      expect(parsed.curation).toBe(curation);
      expect(parsed.reviewNote).toBe(reviewNote);
      expect(parsed.meaning).toBe(baseFields.meaning);
    });
  }

  it("parses an existing Python-generated <!--curated:mt--> card as curation mt, not generated", () => {
    const line =
      "- **am Main** :: **Meaning:** on the Main river<br>![[audio/am_Main-tts.mp3]] <!--curated:mt-->\n";
    const parsed = parseCardFields(line);
    expect(parsed.curation).toBe("mt");
    expect(parsed.meaning).toBe("on the Main river");
  });

  it("reviewNote only normalizes whitespace -- it is not a sanitizer (see format.ts's oneLine comment)", () => {
    const line = formatCardLine({
      front: "Hund", ...baseFields, lesson: null, curation: "review",
      reviewNote: "line one\nline   two",
    });
    const parsed = parseCardFields(line);
    expect(parsed.reviewNote).toBe("line one line two");
  });

  it("SR line round-trips", () => {
    const sr = parseSrLine("<!--SR:!2026-07-15,4,270-->")!;
    expect(formatSrLine(sr)).toBe("<!--SR:!2026-07-15,4,270-->\n");
  });

  it("cardFront strips bullet and bold markers", () => {
    expect(cardFront("- **Guten Tag.** :: whatever")).toBe("Guten Tag.");
  });

  it("umlauts sort by code point like Python (Büro after Bus)", () => {
    const { cards } = parseMasterFile(fixture);
    const body = renderBody(cards);
    expect(body.indexOf("**Büro**")).toBeGreaterThan(body.indexOf("**Bus**"));
  });
});

describe("inbox parsing", () => {
  it("skips comment placeholder and blank lines once the GO marker is present", () => {
    const content =
      "Zug\nGO\n\n<!-- type one German word per line above, then run: vocab enrich-inbox -->\n";
    expect(parseInboxFile(content)).toEqual(["Zug"]);
  });

  it("is a no-op with no GO marker, no matter how the sync lands mid-typing", () => {
    const content =
      "Zug\n\n<!-- type one German word per line above, then run: vocab enrich-inbox -->\n";
    expect(parseInboxFile(content)).toEqual([]);
  });

  it("treats a comment torn across two physical lines as no words, not garbage cards", () => {
    // mirrors the 2026-08-08 corruption: a status comment split mid-word
    const content =
      "GO\n<!-- last processed 2026-08-08 19:12 -- 1 added: die Eltern\\\n-- 1 need review: die Eltern\\ -->\n";
    expect(parseInboxFile(content)).toEqual([]);
  });
});

describe("shouldProtectCard", () => {
  const cases: [CardCuration, boolean][] = [
    ["generated", false],
    ["review", true],
    ["manual", true],
    ["mt", true],
  ];
  for (const [curation, expected] of cases) {
    it(`${curation} -> ${expected}`, () => {
      expect(shouldProtectCard(curation)).toBe(expected);
    });
  }
});

// Regression matrix for the Phase 1.1 hotfix: a typed word and its resolved
// headword can be TWO DIFFERENT existing rows/cards (e.g. typed "bist",
// resolved lemma "sein"). A naive findFirst()/find() over both keys has no
// ordering guarantee -- these tests pin down that firstProtected() always
// finds a protected candidate regardless of which key it sits at or what
// order the candidate list happens to come in.
describe("firstProtected (Phase 1.1 hotfix)", () => {
  type Candidate = { sortKey: string; curation: CardCuration };
  const getCuration = (c: Candidate) => c.curation;

  it("finds a protected candidate at the typed-key position", () => {
    const candidates: Candidate[] = [
      { sortKey: "bist", curation: "generated" },
      { sortKey: "sein", curation: "manual" },
    ];
    expect(firstProtected(candidates, getCuration)?.sortKey).toBe("sein");
  });

  it("finds a protected candidate at the resolved-lemma-key position, regardless of array order", () => {
    // Order flipped from the case above -- must not depend on which key
    // happens to come first in the candidate list.
    const candidates: Candidate[] = [
      { sortKey: "sein", curation: "generated" },
      { sortKey: "bist", curation: "manual" },
    ];
    expect(firstProtected(candidates, getCuration)?.sortKey).toBe("bist");
  });

  for (const curation of ["review", "manual", "mt"] as const) {
    it(`finds a lone ${curation} candidate when the other key is absent`, () => {
      expect(firstProtected([{ sortKey: "sein", curation }], getCuration)?.sortKey).toBe("sein");
    });
  }

  it("returns null when both candidates are generated (normal enrichment proceeds)", () => {
    const candidates: Candidate[] = [
      { sortKey: "bist", curation: "generated" },
      { sortKey: "sein", curation: "generated" },
    ];
    expect(firstProtected(candidates, getCuration)).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(firstProtected([], getCuration)).toBeNull();
  });
});

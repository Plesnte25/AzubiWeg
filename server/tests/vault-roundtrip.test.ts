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
      example: "Der Apfel ist eine Obstart.",
      audioPath: "audio/De-Apfel.mp3",
      lesson: null,
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
    });
    expect(line).toBe(
      "- **Hund** :: **Meaning:** (Noun) dog, hound<br>**IPA:** /hʊnt/<br>**Grammar:** der; Plural: die Hunde<br>**Example:** *Der Hund bellt.*<br>![[audio/De-Hund.mp3]]\n",
    );
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
  it("skips comment placeholder and blank lines", () => {
    const content =
      "Zug\n\n<!-- type one German word per line above, then run: vocab enrich-inbox -->\n";
    expect(parseInboxFile(content)).toEqual(["Zug"]);
  });
});

import { describe, expect, it } from "vitest";
import { deriveGenus, deriveWortart } from "../src/services/vocab/classify.js";
import { expandPlural, formatNounNotation, parseNounNote, pluralSuffix, upgradeNounNote } from "../src/services/vocab/noun-notation.js";

describe("pluralSuffix", () => {
  it.each([
    ["Hund", "Hunde", "-e"],
    ["Katze", "Katzen", "-n"],
    ["Kind", "Kinder", "-er"],
    ["Handy", "Handys", "-s"],
    ["Lehrer", "Lehrer", "-"],
    ["Haus", "Häuser", "-¨er"],
    ["Bahnhof", "Bahnhöfe", "-¨e"],
    ["Vater", "Väter", "-¨"],
    ["Apfel", "Äpfel", "-¨"],
    ["Stadt", "Städte", "-¨e"],
    ["Saal", "Säle", "-¨e"],
    ["Mutter", "Mütter", "-¨"],
  ])("%s / %s -> %s", (sg, pl, suffix) => {
    expect(pluralSuffix(sg, pl)).toBe(suffix);
  });

  it("is null for a plural that doesn't extend the singular", () => {
    expect(pluralSuffix("Museum", "Museen")).toBeNull();
    expect(pluralSuffix("Thema", "Themen")).toBeNull();
  });
});

describe("formatNounNotation", () => {
  it("writes out a plural that has no ending form", () => {
    expect(formatNounNotation({ article: "das", singular: "Museum", plural: "Museen" })).toBe("das Museum, Museen");
  });

  it("strips an article a declension cell might carry", () => {
    expect(formatNounNotation({ article: "der", singular: "der Hund", plural: "die Hunde" })).toBe("der Hund, -e");
  });

  it("marks plural-only nouns and needs an article otherwise", () => {
    expect(formatNounNotation({ article: null, singular: "Eltern", plural: null, pluralOnly: true })).toBe("die Eltern (Pl.)");
    expect(formatNounNotation({ article: null, singular: "Hund", plural: "Hunde" })).toBeNull();
  });
});

describe("expandPlural", () => {
  it.each([
    ["Hund", "-e", "Hunde"],
    ["Lehrer", "-", "Lehrer"],
    ["Bahnhof", "-¨e", "Bahnhöfe"],
    ["Haus", "-¨er", "Häuser"],
    ["Vater", "-¨", "Väter"],
    ["Museum", "Museen", "Museen"],
  ])("%s %s -> %s", (sg, ending, pl) => {
    expect(expandPlural(sg, ending)).toBe(pl);
  });
});

describe("parseNounNote", () => {
  it("reads the notation back", () => {
    expect(parseNounNote("das Haus, -¨er")).toEqual({ article: "das", singular: "Haus", plural: "Häuser", pluralOnly: false });
    expect(parseNounNote("die Schadenfreude")).toEqual({ article: "die", singular: "Schadenfreude", plural: null, pluralOnly: false });
    expect(parseNounNote("die Eltern (Pl.)")).toEqual({ article: "die", singular: null, plural: "Eltern", pluralOnly: true });
  });

  it("still reads the old shape", () => {
    expect(parseNounNote("der; Plural: die Hunde")).toEqual({ article: "der", singular: null, plural: "Hunde", pluralOnly: false });
    expect(parseNounNote("die (nur Plural)")?.pluralOnly).toBe(true);
  });

  it("ignores verbs and free text", () => {
    expect(parseNounNote("geht, ging, ist gegangen")).toBeNull();
    expect(parseNounNote(null)).toBeNull();
  });
});

describe("upgradeNounNote", () => {
  it("rewrites only the old generated shapes", () => {
    expect(upgradeNounNote("der; Plural: die Hunde", "Hund")).toBe("der Hund, -e");
    expect(upgradeNounNote("das; Plural: die Häuser", "Haus")).toBe("das Haus, -¨er");
    expect(upgradeNounNote("die (nur Plural)", "Eltern")).toBe("die Eltern (Pl.)");
    expect(upgradeNounNote("der", "Kollege")).toBe("der Kollege");
    expect(upgradeNounNote("der Hund, -e", "Hund")).toBeNull();
    expect(upgradeNounNote("der, aber umgangssprachlich auch das", "Joghurt")).toBeNull();
  });
});

describe("the notation keeps word class and gender derivable", () => {
  it("reads der/die/das and Nomen from the new note", () => {
    expect(deriveGenus("das Haus, -¨er")).toBe("das");
    expect(deriveGenus("die Eltern (Pl.)")).toBe("die");
    expect(deriveWortart(null, "der Hund, -e")).toBe("Nomen");
  });
});

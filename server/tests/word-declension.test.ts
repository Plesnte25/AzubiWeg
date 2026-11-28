import { describe, expect, it } from "vitest";
import { buildGrammarNote } from "../src/services/enrichment/index.js";

// buildGrammarNote turns a KaikkiEntry's structured declension/conjugation
// JSON into the vault card's free-text Grammar field (see the doc comment
// on buildGrammarNote itself) -- this was the one piece of Phase 5a's
// kaikki.org pipeline swap with no test coverage at all (kaikki-resolution
// .test.ts covers extractDeclension/extractConjugation, the layer below
// this one, not this formatting step).

describe("buildGrammarNote", () => {
  it("returns null for a null entry", () => {
    expect(buildGrammarNote(null, "Haus")).toBeNull();
  });

  it("gives a plural-only noun (no gender, plural cells only) the article die", () => {
    const declension = { nom: { pl: "Eltern" }, akk: { pl: "Eltern" }, dat: { pl: "Eltern" }, gen: { pl: "Eltern" } };
    expect(buildGrammarNote({ gender: null, declension, conjugation: null }, "Eltern")).toBe("die Eltern (Pl.)");
    expect(buildGrammarNote({ gender: null, declension: { nom: { sg: "X", pl: "Xe" } }, conjugation: null }, "X")).toBeNull();
  });

  it("joins present/past/perfect for a verb entry", () => {
    const note = buildGrammarNote(
      { gender: null, declension: null, conjugation: { present: { er: "geht" }, past: "ging", perfect: "ist gegangen" } },
      "gehen",
    );
    expect(note).toBe("geht, ging, ist gegangen");
  });

  it("drops missing conjugation parts instead of leaving empty slots", () => {
    const note = buildGrammarNote({ gender: null, declension: null, conjugation: { present: { er: "geht" } } }, "gehen");
    expect(note).toBe("geht");
  });

  it("writes a noun as article, singular and plural ending", () => {
    expect(buildGrammarNote({ gender: "das", declension: { nom: { sg: "Haus", pl: "Häuser" } }, conjugation: null }, "Haus")).toBe(
      "das Haus, -¨er",
    );
    expect(buildGrammarNote({ gender: "der", declension: { nom: { pl: "Hunde" } }, conjugation: null }, "Hund")).toBe("der Hund, -e");
  });

  it("takes the singular from the declension table over the headword", () => {
    expect(buildGrammarNote({ gender: "die", declension: { nom: { sg: "Katze", pl: "Katzen" } }, conjugation: null }, "katze")).toBe(
      "die Katze, -n",
    );
  });

  it("falls back to article and singular when the declension table has no plural", () => {
    expect(buildGrammarNote({ gender: "die", declension: null, conjugation: null }, "Schadenfreude")).toBe("die Schadenfreude");
  });

  it("returns null when the entry has neither conjugation nor gender", () => {
    expect(buildGrammarNote({ gender: null, declension: null, conjugation: null }, "Haus")).toBeNull();
  });

  it("prefers conjugation over gender when an entry somehow has both", () => {
    const note = buildGrammarNote(
      { gender: "der", declension: { nom: { pl: "x" } }, conjugation: { present: { er: "isst" }, past: "aß", perfect: "hat gegessen" } },
      "Essen",
    );
    expect(note).toBe("isst, aß, hat gegessen");
  });
});

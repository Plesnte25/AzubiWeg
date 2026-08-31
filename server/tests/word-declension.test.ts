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
    expect(buildGrammarNote(null)).toBeNull();
  });

  it("joins present/past/perfect for a verb entry", () => {
    const note = buildGrammarNote({
      gender: null,
      declension: null,
      conjugation: { present: { er: "geht" }, past: "ging", perfect: "ist gegangen" },
    });
    expect(note).toBe("geht, ging, ist gegangen");
  });

  it("drops missing conjugation parts instead of leaving empty slots", () => {
    const note = buildGrammarNote({
      gender: null,
      declension: null,
      conjugation: { present: { er: "geht" } },
    });
    expect(note).toBe("geht");
  });

  it("falls back to gender + plural for a noun entry with no conjugation", () => {
    const note = buildGrammarNote({
      gender: "der",
      declension: { nom: { pl: "Häuser" } },
      conjugation: null,
    });
    expect(note).toBe("der; Plural: die Häuser");
  });

  it("falls back to gender alone when the declension table has no plural", () => {
    const note = buildGrammarNote({ gender: "die", declension: null, conjugation: null });
    expect(note).toBe("die");
  });

  it("returns null when the entry has neither conjugation nor gender", () => {
    const note = buildGrammarNote({ gender: null, declension: null, conjugation: null });
    expect(note).toBeNull();
  });

  it("prefers conjugation over gender when an entry somehow has both", () => {
    const note = buildGrammarNote({
      gender: "der",
      declension: { nom: { pl: "x" } },
      conjugation: { present: { er: "isst" }, past: "aß", perfect: "hat gegessen" },
    });
    expect(note).toBe("isst, aß, hat gegessen");
  });
});

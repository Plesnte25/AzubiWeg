import { describe, expect, it } from "vitest";
import { formOfTargets, isFormOfMeaning } from "../src/services/enrichment/kaikki.js";

describe("isFormOfMeaning", () => {
  it("spots cross-reference meanings, with or without a leading word-class tag", () => {
    expect(isFormOfMeaning("(Noun) plural of Begrüßung")).toBe(true);
    expect(isFormOfMeaning("plural of Buch")).toBe(true);
    expect(isFormOfMeaning("nominative/accusative/genitive plural of Buch")).toBe(true);
    expect(isFormOfMeaning("(Verb) second-person singular present of sein")).toBe(true);
    expect(isFormOfMeaning("(Noun) gerund of zahlen; (Noun) plural of Zahl")).toBe(true);
  });

  it("keeps meanings that explain themselves after the cross-reference", () => {
    expect(isFormOfMeaning("(Noun) agent noun of lehren: one who teaches, teacher")).toBe(false);
    expect(isFormOfMeaning("(Noun) female equivalent of Pilot (“pilot”): female pilot")).toBe(false);
    expect(isFormOfMeaning("(Noun) plural of Zahl; (Noun) number")).toBe(false);
  });

  it("spots bare label meanings whose base word was dropped (werde)", () => {
    expect(isFormOfMeaning("(Verb) first-person singular present")).toBe(true);
    expect(isFormOfMeaning("first/third-person singular subjunctive I")).toBe(true);
    expect(isFormOfMeaning("(Verb) singular imperative; (Verb) first-person singular present")).toBe(true);
    expect(formOfTargets("(Verb) first-person singular present")).toEqual([]);
  });

  it("names the base words", () => {
    expect(formOfTargets("(Noun) plural of Begrüßung")).toEqual(["Begrüßung"]);
    expect(formOfTargets("(Noun) gerund of zahlen; (Noun) plural of Zahl")).toEqual(["zahlen", "Zahl"]);
  });

  it("leaves real meanings alone", () => {
    expect(isFormOfMeaning("(Noun) greeting")).toBe(false);
    expect(isFormOfMeaning("form")).toBe(false);
    expect(isFormOfMeaning("the plural form of a noun")).toBe(false);
    expect(isFormOfMeaning(null)).toBe(false);
  });
});

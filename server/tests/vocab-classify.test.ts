import { describe, expect, it } from "vitest";
import { classifyTheme, classifyThemeHeuristic } from "../src/services/vocab/classify.js";

describe("classifyThemeHeuristic", () => {
  it("classifies from the meaning text", () => {
    expect(classifyThemeHeuristic("Krankenhaus", "(Noun) hospital")).toEqual(["gesundheit"]);
  });

  it("classifies from the example sentence when headword/meaning alone give no signal", () => {
    // a generic-sounding word whose only theme signal is in the example
    expect(
      classifyThemeHeuristic("bringen", "(Verb) to bring", "Ich bringe das Formular zum Amt."),
    ).toEqual(["amt_buerokratie"]);
  });

  it("ranks by keyword-hit count, not by list order, and caps at 2", () => {
    // heavy on gesundheit signal (4 hits), one incidental geld hit — gesundheit
    // must win even though geld is listed earlier in KEYWORDS
    const meaning =
      "(Noun) the doctor treats the sick patient's illness at the hospital, price of medicine";
    const result = classifyThemeHeuristic("Behandlung", meaning);
    expect(result[0]).toBe("gesundheit");
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns an empty array rather than guessing when nothing matches", () => {
    expect(classifyThemeHeuristic("äh", "(Interjection) uh, um")).toEqual([]);
  });
});

describe("classifyTheme", () => {
  it("prefers the lesson-week mapping over the heuristic when the lesson has an extractable week number", () => {
    const result = classifyTheme({ lesson: "week-5", headword: "irrelevant", meaning: "(Noun) something else entirely" });
    expect(result.level).toBe("a1");
    expect(result.themenfeld).toEqual(["reise_verkehr"]);
  });

  it("falls through to the heuristic when the lesson has no week number", () => {
    const result = classifyTheme({ lesson: "kein-problem", headword: "Apotheke", meaning: "(Noun) pharmacy" });
    expect(result.level).toBeNull();
    expect(result.themenfeld).toEqual(["gesundheit"]);
  });

  it("uses the heuristic (and leaves level null) when there's no lesson at all", () => {
    const result = classifyTheme({ lesson: null, headword: "Bahnhof", meaning: "(Noun) train station" });
    expect(result.level).toBeNull();
    expect(result.themenfeld).toEqual(["reise_verkehr"]);
  });

  it("threads the example field through from classifyTheme into the heuristic", () => {
    const result = classifyTheme({
      lesson: null,
      headword: "bringen",
      meaning: "(Verb) to bring",
      example: "Ich bringe das Formular zum Amt.",
    });
    expect(result.themenfeld).toEqual(["amt_buerokratie"]);
  });
});

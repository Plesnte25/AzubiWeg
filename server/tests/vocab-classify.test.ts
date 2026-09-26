import { describe, expect, it } from "vitest";
import { classifyLevel, withComputedFields } from "../src/services/vocab/classify.js";
import type { CardCuration } from "../src/services/vault/format.js";

describe("classifyLevel", () => {
  it("derives the level from a week-numbered lesson tag", () => {
    expect(classifyLevel("week-5")).toBe("a1");
    expect(classifyLevel("wk12")).toBe("a2");
    expect(classifyLevel("w20")).toBe("b1");
  });

  it("returns null for milestone weeks, unnumbered lessons and no lesson", () => {
    expect(classifyLevel("week-8")).toBeNull();
    expect(classifyLevel("kein-problem")).toBeNull();
    expect(classifyLevel(null)).toBeNull();
  });
});

describe("withComputedFields", () => {
  function word(meaning: string | null, curation: CardCuration) {
    return { meaning, grammar: null, srDue: null, srInterval: null, curation };
  }

  it("attaches enrichmentStatus alongside the existing computed facets", () => {
    const result = withComputedFields(word("(Noun) dog", "generated"));
    expect(result.enrichmentStatus).toBe("published");
    // existing facets still present -- this change is additive, not a replacement
    expect(result.wortart).toBeDefined();
    expect(result.genus).toBeDefined();
    expect(result.state).toBeDefined();
  });

  it("hides stale editorial metadata from learner-facing word responses", () => {
    const result = withComputedFields({
      ...word("(Noun) cat _(source: Wiktionary)_", "generated"),
      form: null,
      example: "Die Katze schläft. _(hand-written -- literary quotation)_",
    });
    expect(result.meaning).toBe("(Noun) cat");
    expect(result.example).toBe("Die Katze schläft.");
  });

  it("published_review for an ambiguous/mt-fallback meaning under review", () => {
    expect(withComputedFields(word("(Noun) castle", "review")).enrichmentStatus).toBe("published_review");
  });

  it("unresolved for a review-flagged card with no meaning yet", () => {
    expect(withComputedFields(word(null, "review")).enrichmentStatus).toBe("unresolved");
  });

  it("protected for manual/mt regardless of meaning", () => {
    expect(withComputedFields(word("(Noun) dog", "manual")).enrichmentStatus).toBe("protected");
    expect(withComputedFields(word(null, "manual")).enrichmentStatus).toBe("protected");
    expect(withComputedFields(word("(Noun) dog", "mt")).enrichmentStatus).toBe("protected");
  });

  it("incomplete for a blank generated placeholder", () => {
    expect(withComputedFields(word(null, "generated")).enrichmentStatus).toBe("incomplete");
  });
});

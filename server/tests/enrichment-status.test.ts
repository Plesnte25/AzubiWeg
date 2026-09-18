import { describe, expect, it } from "vitest";
import { deriveEnrichmentStatus } from "../src/services/enrichment/index.js";

describe("deriveEnrichmentStatus", () => {
  it("generated + meaning -> published", () => {
    expect(deriveEnrichmentStatus("dog", "generated")).toBe("published");
  });

  it("generated + no meaning -> incomplete", () => {
    expect(deriveEnrichmentStatus(null, "generated")).toBe("incomplete");
  });

  it("review + meaning -> published_review", () => {
    expect(deriveEnrichmentStatus("dog", "review")).toBe("published_review");
  });

  it("review + no meaning -> unresolved", () => {
    expect(deriveEnrichmentStatus(null, "review")).toBe("unresolved");
  });

  it("manual + meaning -> protected", () => {
    expect(deriveEnrichmentStatus("dog", "manual")).toBe("protected");
  });

  // The case an earlier draft got wrong: a deliberately-blanked manual card
  // must never read back as "unresolved" -- a human already made this state.
  it("manual + no meaning -> protected, never unresolved", () => {
    expect(deriveEnrichmentStatus(null, "manual")).toBe("protected");
  });

  it("mt + meaning -> protected", () => {
    expect(deriveEnrichmentStatus("dog", "mt")).toBe("protected");
  });

  it("mt + no meaning -> protected, never unresolved", () => {
    expect(deriveEnrichmentStatus(null, "mt")).toBe("protected");
  });
});

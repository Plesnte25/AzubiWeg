import { describe, expect, it } from "vitest";
import { detectGermanLevel, parseJobPreview } from "../src/services/applications/fetchPreview.js";

describe("detectGermanLevel", () => {
  it("reads explicit CEFR levels next to German context", () => {
    expect(detectGermanLevel("Deutschkenntnisse auf B1-Niveau")).toBe("b1");
    expect(detectGermanLevel("Sprachniveau: B2 (GER)")).toBe("b2");
    expect(detectGermanLevel("German skills at C1 level are required")).toBe("c1");
  });

  it("takes the lowest level as the requirement", () => {
    expect(detectGermanLevel("Deutsch mindestens B1, B2 wünschenswert")).toBe("b1");
  });

  it("ignores a level that belongs to English", () => {
    expect(detectGermanLevel("Deutsch B2 und Englisch C1")).toBe("b2");
    expect(detectGermanLevel("Gute Englischkenntnisse (B2) sind ein Plus")).toBeNull();
  });

  it("ignores level-like tokens without language context", () => {
    expect(detectGermanLevel("Standort direkt an der A1, B2B-Vertrieb, Führerschein C1")).toBeNull();
  });

  it("maps common phrasing when no level is given", () => {
    expect(detectGermanLevel("Deutsch als Muttersprache")).toBe("c2");
    expect(detectGermanLevel("Sehr gute Deutschkenntnisse in Wort und Schrift")).toBe("c1");
    expect(detectGermanLevel("Du sprichst fließend Deutsch")).toBe("c1");
    expect(detectGermanLevel("Gute Deutschkenntnisse")).toBe("b2");
    expect(detectGermanLevel("Grundkenntnisse in Deutsch reichen")).toBe("a2");
  });

  it("is null when the posting says nothing about German", () => {
    expect(detectGermanLevel("Wir suchen motivierte Azubis für unser Team.")).toBeNull();
  });
});

describe("parseJobPreview germanLevel", () => {
  it("reads the level from the JobPosting description", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      title: "Azubi Mechatroniker",
      hiringOrganization: { name: "Bosch" },
      description: "<ul><li>Deutschkenntnisse mindestens <b>B1</b></li></ul>",
    })}</script>`;
    expect(parseJobPreview(html, "jobs.example.com")).toMatchObject({ company: "Bosch", germanLevel: "b1" });
  });

  it("falls back to the page text without structured data", () => {
    const html = "<html><head><title>Azubi Koch - Edeka</title></head><body><p>Gute Deutschkenntnisse</p></body></html>";
    expect(parseJobPreview(html, "edeka.de")).toMatchObject({ role: "Azubi Koch", germanLevel: "b2" });
  });
});

describe("curated phrase bank", () => {
  it("has unique ids and something for every active stage, nothing for rejected", async () => {
    const { CURATED_PHRASES, phrasesForStage } = await import("../src/services/applications/phrases.js");
    expect(new Set(CURATED_PHRASES.map((p) => p.id)).size).toBe(CURATED_PHRASES.length);
    for (const stage of ["wishlist", "applied", "interview", "offer"] as const) expect(phrasesForStage(stage).length).toBeGreaterThan(0);
    expect(phrasesForStage("rejected")).toEqual([]);
    expect(phrasesForStage("interview").some((p) => p.context === "probetag")).toBe(true);
  });
});

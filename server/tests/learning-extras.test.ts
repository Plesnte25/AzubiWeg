import { describe, expect, it } from "vitest";
import { EXTRAS } from "../src/services/learning/extras.js";

describe("EXTRAS", () => {
  it("carries each level's weekly resources and Deutschland Context items, nothing generic", () => {
    const count = (level: string, kind: string) => EXTRAS.filter((e) => e.level === level && e.kind === kind).length;
    expect([count("a1", "resource"), count("a2", "resource"), count("b1", "resource")]).toEqual([7, 7, 8]);
    expect(EXTRAS.filter((e) => e.kind === "context")).toHaveLength(7);
    expect(EXTRAS.some((e) => /^(Reading|Listening|Speaking|Writing): /.test(e.title))).toBe(false);
    expect(EXTRAS.find((e) => e.title.startsWith("Nicos Weg A1"))?.level).toBe("a1");
  });

  it("has unique, stable ids", () => {
    expect(new Set(EXTRAS.map((e) => e.id)).size).toBe(EXTRAS.length);
    expect(EXTRAS.every((e) => /^(a1|a2|b1)-[a-z0-9-]+$/.test(e.id))).toBe(true);
  });
});

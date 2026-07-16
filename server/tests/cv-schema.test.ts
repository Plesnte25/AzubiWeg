import { describe, expect, it } from "vitest";
import { cvContentSchema, emptyCvContent } from "../src/services/cv/schema.js";

describe("emptyCvContent", () => {
  it("prefills name parts and email and passes its own schema", () => {
    const content = emptyCvContent({ name: "Tanzeel Zander", email: "t@example.com" });
    expect(content.personal).toMatchObject({
      firstName: "Tanzeel",
      lastName: "Zander",
      email: "t@example.com",
    });
    expect(cvContentSchema.safeParse(content).success).toBe(true);
  });

  it("handles single-word names", () => {
    const content = emptyCvContent({ name: "Tanzeel", email: "t@example.com" });
    expect(content.personal.firstName).toBe("Tanzeel");
    expect(content.personal.lastName).toBe("");
  });
});

describe("cvContentSchema", () => {
  const valid = {
    ...emptyCvContent({ name: "Max Müller", email: "m@example.com" }),
    experience: [
      {
        id: "e1",
        role: "Praktikant",
        company: "Bäckerei Groß",
        from: "2024-03",
        to: "2024-09",
        current: false,
        bullets: ["Kundenberatung auf Deutsch"],
      },
    ],
    languages: [{ id: "l1", name: "Deutsch", level: "B1" }],
    signature: { city: "Görlitz", date: "2026-07-16" },
  };

  it("round-trips a valid document unchanged", () => {
    const parsed = cvContentSchema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  it("rejects unknown top-level keys", () => {
    expect(cvContentSchema.safeParse({ ...valid, evil: 1 }).success).toBe(false);
  });

  it("rejects unknown entry keys", () => {
    const bad = {
      ...valid,
      experience: [{ ...valid.experience[0], salary: "1000" }],
    };
    expect(cvContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects oversized fields", () => {
    const bad = { ...valid, summary: "x".repeat(2001) };
    expect(cvContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects malformed date-ish strings but accepts YYYY, YYYY-MM, YYYY-MM-DD, empty", () => {
    const withFrom = (from: string) => ({
      ...valid,
      experience: [{ ...valid.experience[0], from }],
    });
    expect(cvContentSchema.safeParse(withFrom("2024")).success).toBe(true);
    expect(cvContentSchema.safeParse(withFrom("2024-03")).success).toBe(true);
    expect(cvContentSchema.safeParse(withFrom("2024-03-01")).success).toBe(true);
    expect(cvContentSchema.safeParse(withFrom("")).success).toBe(true);
    expect(cvContentSchema.safeParse(withFrom("March 2024")).success).toBe(false);
  });
});

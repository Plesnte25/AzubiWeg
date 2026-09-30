import { describe, expect, it } from "vitest";
import { A1_CHECKS } from "../src/services/learning/syllabus-checks-a1.js";
import { A2_CHECKS } from "../src/services/learning/syllabus-checks-a2.js";
import { DEFAULT_SYLLABUS_ITEMS, syllabusItemSeed, type CheckItem } from "../src/services/learning/syllabus-defaults.js";

const LEVELS = [
  ["a1", A1_CHECKS],
  ["a2", A2_CHECKS],
] as const;

describe.each(LEVELS)("%s checked exercises (#38)", (level, CHECKS) => {
  const a1 = DEFAULT_SYLLABUS_ITEMS.filter((i) => i.level === level);
  it("only authors topics that exist in the A1 syllabus", () => {
    const titles = new Set(a1.map((i) => i.title));
    expect(Object.keys(CHECKS).filter((t) => !titles.has(t))).toEqual([]);
  });

  it("every item is well-formed: one gap per fill-in, answers present, choice index in range, no duplicate options", () => {
    for (const [title, a] of Object.entries(CHECKS)) {
      if (a.exerciseType !== "check_set") continue;
      const items = (a.exerciseOptions as { items: CheckItem[] }).items;
      expect(items.length, title).toBeGreaterThanOrEqual(5);
      for (const item of items) {
        if (item.kind === "cloze") {
          expect(item.prompt.split("___").length - 1, `${title}: ${item.prompt}`).toBe(1);
          expect(item.accepted.length, `${title}: ${item.prompt}`).toBeGreaterThan(0);
          expect(item.accepted.every((x) => x.trim().length > 0), `${title}: ${item.prompt}`).toBe(true);
        } else {
          expect(item.correctIndex, `${title}: ${item.prompt}`).toBeLessThan(item.options.length);
          expect(new Set(item.options).size, `${title}: ${item.prompt}`).toBe(item.options.length);
        }
      }
    }
  });

  it("every authored topic has a real lesson, and the seed uses the check set", () => {
    for (const [title, a] of Object.entries(CHECKS)) {
      expect(a.resourceBody?.length ?? 0, title).toBeGreaterThan(120);
      const seeded = syllabusItemSeed(a1.find((i) => i.title === title)!);
      expect(seeded.exerciseType, title).toBe(a.exerciseType);
    }
  });
});

describe.each(LEVELS)("%s reading/listening answers come from the text", (level, CHECKS) => {
  const norm = (s: string) => s.toLowerCase().replace(/ß/g, "ss").replace(/\s+/g, " ");
  it("every fill-in answer of a reading or listening topic appears in its text or transcript", () => {
    const missing: string[] = [];
    for (const [title, a] of Object.entries(CHECKS)) {
      const skill = DEFAULT_SYLLABUS_ITEMS.find((i) => i.level === level && i.title === title)?.skill;
      const source = a.resourceTranscript ?? (skill === "reading" ? a.resourceBody : null);
      if (!source || a.exerciseType !== "check_set") continue;
      for (const item of (a.exerciseOptions as { items: CheckItem[] }).items) {
        if (item.kind !== "cloze") continue;
        if (!item.accepted.some((x) => norm(source).includes(norm(x)))) missing.push(`${title}: ${item.prompt} → ${item.accepted.join(" / ")}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

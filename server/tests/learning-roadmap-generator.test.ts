import { describe, expect, it } from "vitest";
import { distributeEvenly, deriveSyllabusTasks, buildUserRoadmapPlan } from "../src/services/learning/roadmap-generator.js";
import type { SyllabusRowForGeneration } from "../src/services/learning/roadmap-generator.js";
import { DEFAULT_SYLLABUS_ITEMS } from "../src/services/learning/syllabus-defaults.js";

describe("distributeEvenly", () => {
  it("splits evenly when items divide cleanly", () => {
    expect(distributeEvenly([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("front-loads the remainder into earlier buckets", () => {
    const result = distributeEvenly([1, 2, 3, 4, 5], 2);
    expect(result.map((b) => b.length)).toEqual([3, 2]);
    expect(result.flat()).toEqual([1, 2, 3, 4, 5]); // order preserved, nothing dropped/duplicated
  });

  it("gives every bucket at least the floor count, none skipped", () => {
    const result = distributeEvenly(Array.from({ length: 30 }, (_, i) => i), 14);
    expect(result).toHaveLength(14);
    expect(result.reduce((n, b) => n + b.length, 0)).toBe(30);
    const sizes = result.map((b) => b.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("handles more buckets than items (some buckets empty, none error)", () => {
    const result = distributeEvenly([1, 2], 5);
    expect(result).toHaveLength(5);
    expect(result.flat()).toEqual([1, 2]);
  });

  it("handles an empty input", () => {
    expect(distributeEvenly([], 3)).toEqual([[], [], []]);
  });
});

const row = (
  overrides: Partial<SyllabusRowForGeneration> & Pick<SyllabusRowForGeneration, "id" | "level" | "category" | "sortOrder" | "title">,
): SyllabusRowForGeneration => ({
  description: null,
  completedAt: null,
  ...overrides,
});

describe("deriveSyllabusTasks", () => {
  it("splits a level's grammar items across Mon/Tue of its phase's regular weeks, in sortOrder", () => {
    // a1 phase = weeks 1-7 (7 weeks) -> 14 grammar slots; give it exactly 14 items, 1 each
    const rows: SyllabusRowForGeneration[] = Array.from({ length: 14 }, (_, i) =>
      row({ id: `g${i}`, level: "a1", category: "grammar", sortOrder: i, title: `Topic ${i}` }),
    );
    const result = deriveSyllabusTasks(rows);

    // week 1 = dayOffset 0 (Mon) / 1 (Tue)
    expect(result.get(0)?.[0].title).toBe("Grammar: Topic 0");
    expect(result.get(1)?.[0].title).toBe("Grammar: Topic 1");
    // week 7 = dayOffset 42 (Mon) / 43 (Tue) -> last two items
    expect(result.get(42)?.[0].title).toBe("Grammar: Topic 12");
    expect(result.get(43)?.[0].title).toBe("Grammar: Topic 13");
  });

  it("puts vocab_theme items on Wednesday, tagged with the vocab task type", () => {
    const rows: SyllabusRowForGeneration[] = [row({ id: "v0", level: "a1", category: "vocab_theme", sortOrder: 0, title: "Numbers" })];
    const result = deriveSyllabusTasks(rows);
    const wed = result.get(2); // week 1 Wednesday = dayOffset 2
    expect(wed?.[0]).toMatchObject({ type: "vocab", skill: "vocab", title: "Vocab: Numbers", syllabusItemId: "v0" });
  });

  it("never generates tasks for skill-category items", () => {
    const rows: SyllabusRowForGeneration[] = [row({ id: "s0", level: "a1", category: "skill", sortOrder: 0, title: "Give a presentation" })];
    const result = deriveSyllabusTasks(rows);
    expect(result.size).toBe(0);
  });

  it("carries the live completedAt straight through onto the generated task", () => {
    const completedAt = new Date("2026-07-01T00:00:00Z");
    const rows: SyllabusRowForGeneration[] = [row({ id: "g0", level: "a1", category: "grammar", sortOrder: 0, title: "Done topic", completedAt })];
    const result = deriveSyllabusTasks(rows);
    expect(result.get(0)?.[0].completedAt).toEqual(completedAt);
  });

  it("keeps a2/b1 items entirely out of the a1 phase's weeks", () => {
    const rows: SyllabusRowForGeneration[] = [row({ id: "g0", level: "b1", category: "grammar", sortOrder: 0, title: "B1 topic" })];
    const result = deriveSyllabusTasks(rows);
    // b1 phase starts at week 17 -> dayOffset 112
    expect(result.get(0)).toBeUndefined();
    expect(result.get(112)?.[0].title).toBe("Grammar: B1 topic");
  });
});

describe("buildUserRoadmapPlan", () => {
  it("merges generated tasks onto empty Mon/Tue/Wed placeholders without touching hand-authored days", () => {
    const rows: SyllabusRowForGeneration[] = [
      row({ id: "g0", level: "a1", category: "grammar", sortOrder: 0, title: "Some topic" }),
    ];
    const plan = buildUserRoadmapPlan(rows);
    const monday = plan.find((d) => d.dayOffset === 0)!;
    expect(monday.tasks.some((t) => t.syllabusItemId === "g0")).toBe(true);

    // Thursday (dayOffset 3) is hand-authored (listening) and untouched
    const thursday = plan.find((d) => d.dayOffset === 3)!;
    expect(thursday.tasks.every((t) => t.syllabusItemId === undefined)).toBe(true);
    expect(thursday.tasks.length).toBeGreaterThan(0);
  });

  it("against the REAL syllabus content, every one of the 182 days ends up with at least one task", () => {
    // real DEFAULT_SYLLABUS_ITEMS entries don't have ids/completedAt (those
    // are DB-assigned) — synthesize them the same way seeding would
    const rows: SyllabusRowForGeneration[] = DEFAULT_SYLLABUS_ITEMS.map((item, i) => ({
      id: `item-${i}`,
      level: item.level,
      category: item.category,
      sortOrder: i,
      title: item.title,
      description: item.description ?? null,
      completedAt: null,
    }));
    const plan = buildUserRoadmapPlan(rows);
    expect(plan).toHaveLength(182);
    const emptyDays = plan.filter((d) => d.tasks.length === 0).map((d) => d.dayOffset);
    expect(emptyDays).toEqual([]);
  });
});

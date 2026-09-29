import { describe, expect, it } from "vitest";
import { addDaysUTC } from "../src/services/learning/roadmap.js";
import { DEFAULT_ROADMAP_DAYS } from "../src/services/learning/roadmap-defaults.js";

const utcDate = (iso: string) => new Date(iso + "T00:00:00Z");
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("DEFAULT_ROADMAP_DAYS content", () => {
  it("has exactly 182 days (26 weeks) with contiguous 0-based dayOffsets", () => {
    expect(DEFAULT_ROADMAP_DAYS).toHaveLength(182);
    expect(DEFAULT_ROADMAP_DAYS.map((d) => d.dayOffset)).toEqual(
      Array.from({ length: 182 }, (_, i) => i),
    );
  });

  it("every day has hand-authored content — all-skills-daily (ROADMAP_VERSION 5) means the generator only ever prepends grammar/vocab, it never fills an empty day", () => {
    for (const day of DEFAULT_ROADMAP_DAYS) {
      expect(day.tasks.length).toBeGreaterThan(0);
    }
  });

  it("has a milestone_test task on the last day of weeks 8, 16, 25, and 26", () => {
    const milestoneDayOffsets = [54, 110, 173, 180]; // (week-1)*7 + 5, for weeks 8/16/25/26
    for (const offset of milestoneDayOffsets) {
      const day = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === offset);
      expect(day?.tasks.some((t) => t.type === "milestone_test")).toBe(true);
    }
  });

  it("every task is tagged with a skill (powers the journal filter views)", () => {
    const allTasks = DEFAULT_ROADMAP_DAYS.flatMap((d) => d.tasks);
    expect(allTasks.every((t) => t.skill !== undefined)).toBe(true);
  });

  it("has a Deutschland Context (bureaucracy-skill) task on weeks 2, 5, 10, 14, 18, 20, and 24", () => {
    const weekFridayOffsets = [2, 5, 10, 14, 18, 20, 24].map((week) => (week - 1) * 7 + 4);
    for (const offset of weekFridayOffsets) {
      const day = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === offset);
      expect(day?.tasks.some((t) => t.skill === "bureaucracy" && t.title.startsWith("Deutschland Context:"))).toBe(true);
    }
  });
});

describe("addDaysUTC", () => {
  it("adds whole days ignoring time-of-day, at UTC midnight", () => {
    expect(addDaysUTC(utcDate("2026-07-22"), 0)).toEqual(utcDate("2026-07-22"));
    expect(addDaysUTC(utcDate("2026-07-22"), 10)).toEqual(utcDate("2026-08-01"));
  });

  it("crosses a year boundary correctly", () => {
    expect(addDaysUTC(utcDate("2026-12-30"), 5)).toEqual(utcDate("2027-01-04"));
  });
});

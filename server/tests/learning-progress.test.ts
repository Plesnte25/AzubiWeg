import { describe, expect, it } from "vitest";
import {
  levelProgress,
  levelStates,
  sourcePercent,
  type ProgressItem,
} from "../src/services/learning/progress.js";

const item = (
  id: string,
  level: ProgressItem["level"],
  sortOrder: number,
  done = false,
): ProgressItem => ({
  id,
  level,
  title: `Topic ${id}`,
  sortOrder,
  completedAt: done ? new Date("2026-07-01T10:00:00Z") : null,
});

describe("levelProgress", () => {
  it("returns all three levels in order even with no items", () => {
    const levels = levelProgress([]);
    expect(levels.map((l) => l.level)).toEqual(["a1", "a2", "b1"]);
    expect(levels[0]).toEqual({ level: "a1", total: 0, done: 0, percent: 0, nextUp: null });
  });

  it("counts done items and rounds the percent", () => {
    const items = [item("a", "a1", 0, true), item("b", "a1", 1), item("c", "a1", 2)];
    const [a1] = levelProgress(items);
    expect(a1.total).toBe(3);
    expect(a1.done).toBe(1);
    expect(a1.percent).toBe(33);
  });

  it("picks the first incomplete item by sortOrder as nextUp, regardless of input order", () => {
    const items = [item("late", "a1", 5), item("early", "a1", 2), item("done", "a1", 0, true)];
    const [a1] = levelProgress(items);
    expect(a1.nextUp).toEqual({ id: "early", title: "Topic early" });
  });

  it("has null nextUp when a level is fully complete", () => {
    const items = [item("a", "a2", 0, true), item("b", "a2", 1, true)];
    const a2 = levelProgress(items)[1];
    expect(a2.percent).toBe(100);
    expect(a2.nextUp).toBeNull();
  });

  it("keeps levels independent", () => {
    const items = [item("a", "a1", 0, true), item("b", "b1", 0)];
    const [a1, a2, b1] = levelProgress(items);
    expect(a1.percent).toBe(100);
    expect(a2.total).toBe(0);
    expect(b1.percent).toBe(0);
  });
});

describe("levelStates", () => {
  const lvl = (percent: number, total = 36) => ({ percent, total });

  it("marks the first incomplete level active and later ones locked", () => {
    expect(levelStates([lvl(40), lvl(0), lvl(0)])).toEqual(["active", "locked", "locked"]);
    expect(levelStates([lvl(100), lvl(70), lvl(0)])).toEqual(["done", "active", "locked"]);
  });

  it("marks everything done when the roadmap is complete", () => {
    expect(levelStates([lvl(100), lvl(100), lvl(100)])).toEqual(["done", "done", "done"]);
  });

  it("treats an unseeded (empty) syllabus as first-active", () => {
    expect(levelStates([lvl(0, 0), lvl(0, 0), lvl(0, 0)])).toEqual(["active", "locked", "locked"]);
  });
});

describe("sourcePercent", () => {
  it("is null for open-ended sources", () => {
    expect(sourcePercent(7, null)).toBeNull();
  });

  it("computes and rounds the percent", () => {
    expect(sourcePercent(1, 3)).toBe(33);
    expect(sourcePercent(3, 3)).toBe(100);
    expect(sourcePercent(0, 10)).toBe(0);
  });

  it("clamps out-of-range completed counts", () => {
    expect(sourcePercent(12, 10)).toBe(100);
    expect(sourcePercent(-2, 10)).toBe(0);
  });
});

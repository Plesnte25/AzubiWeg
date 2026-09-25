import { describe, expect, it } from "vitest";
import { isShaky, strength } from "../src/services/vocab/classify.js";

const w = (srInterval: number | null, leech = false) => ({ srInterval, leech });

describe("strength", () => {
  it("is 0 for a never-reviewed word", () => {
    expect(strength(w(null), null)).toBe(0);
  });

  it("is 1 for a manually flagged word, reviewed or not, whatever the interval", () => {
    expect(strength(w(null, true), null)).toBe(1);
    expect(strength(w(40, true), "easy")).toBe(1);
  });

  it("is 1 when the last grade was hard and the interval is at most a day", () => {
    expect(strength(w(1), "hard")).toBe(1);
  });

  it("is 2 for a short interval or a hard last grade on a longer one", () => {
    expect(strength(w(1), "good")).toBe(2);
    expect(strength(w(2), null)).toBe(2);
    expect(strength(w(12), "hard")).toBe(2);
  });

  it("follows the interval bands 3–9 / 10–20 / 21+", () => {
    expect(strength(w(3), "good")).toBe(3);
    expect(strength(w(9), "good")).toBe(3);
    expect(strength(w(10), "easy")).toBe(4);
    expect(strength(w(20), "good")).toBe(4);
    expect(strength(w(21), "good")).toBe(5);
    expect(strength(w(400), null)).toBe(5);
  });

  it("treats an unknown last grade (scheduled in Obsidian, no app ReviewLog) as not hard", () => {
    expect(strength(w(4), null)).toBe(3);
  });
});

describe("isShaky", () => {
  it("is strength 1–2 only", () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => isShaky(s as 0 | 1 | 2 | 3 | 4 | 5))).toEqual([false, true, true, false, false, false]);
  });
});

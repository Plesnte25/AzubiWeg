import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "../src/services/learning/question-bank.js";

// data lint: ids are persisted in SelfTestResult.questionIds, so the bank has
// to stay structurally sound as it grows
describe("QUESTION_BANK", () => {
  it("has unique, level-prefixed ids", () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTION_BANK) {
      expect(q.id.startsWith(`${q.level}-`)).toBe(true);
    }
  });

  it("meets per-level minimum counts", () => {
    const byLevel = { a1: 0, a2: 0, b1: 0 };
    for (const q of QUESTION_BANK) byLevel[q.level]++;
    expect(byLevel.a1).toBeGreaterThanOrEqual(60);
    expect(byLevel.a2).toBeGreaterThanOrEqual(40);
    expect(byLevel.b1).toBeGreaterThanOrEqual(35);
  });

  it("has a healthy mix of all three types per level", () => {
    for (const level of ["a1", "a2", "b1"] as const) {
      const inLevel = QUESTION_BANK.filter((q) => q.level === level);
      for (const type of ["mcq", "fill_blank", "true_false"] as const) {
        expect(inLevel.filter((q) => q.type === type).length).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("mcq: answerIndex in range, 4 distinct choices", () => {
    for (const q of QUESTION_BANK) {
      if (q.type !== "mcq") continue;
      expect(q.choices.length, q.id).toBe(4);
      expect(new Set(q.choices).size, q.id).toBe(4);
      expect(q.answerIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex, q.id).toBeLessThan(q.choices.length);
    }
  });

  it("fill_blank: exactly one ___ and at least one accepted answer", () => {
    for (const q of QUESTION_BANK) {
      if (q.type !== "fill_blank") continue;
      expect(q.prompt.split("___").length, q.id).toBe(2);
      expect(q.accepted.length, q.id).toBeGreaterThanOrEqual(1);
      for (const a of q.accepted) expect(a.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it("prompts are non-empty and topics are kebab-case-ish", () => {
    for (const q of QUESTION_BANK) {
      expect(q.prompt.trim().length, q.id).toBeGreaterThan(10);
      expect(q.topic, q.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});

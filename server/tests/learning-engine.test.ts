import { describe, expect, it } from "vitest";
import {
  buildSession,
  isAnswerAccepted,
  mulberry32,
  normalizeAnswer,
  pickLevelMix,
} from "../src/services/learning/engine.js";
import { QUESTION_BANK } from "../src/services/learning/question-bank.js";
import type { QuizWord } from "../src/services/learning/quiz.js";

const words: QuizWord[] = [
  { id: "1", headword: "Zug", meaning: "train", lesson: "L1" },
  { id: "2", headword: "Bahnhof", meaning: "train station", lesson: "L1" },
  { id: "3", headword: "Haus", meaning: "house", lesson: "L2" },
  { id: "4", headword: "Tisch", meaning: "table", lesson: "L2" },
  { id: "5", headword: "Apfel", meaning: "apple", lesson: null },
  { id: "6", headword: "fahren", meaning: "to drive", lesson: "L1" },
];

const base = {
  bank: QUESTION_BANK,
  words,
  activeLevel: "a1" as const,
  recentPercents: [],
  excludeIds: new Set<string>(),
  size: 12,
};

describe("pickLevelMix", () => {
  it("keeps struggling learners on the active level (plus review)", () => {
    expect(pickLevelMix("a2", [40, 50])).toEqual({ a1: 0.2, a2: 0.8, b1: 0 });
  });

  it("treats no history like a fresh start", () => {
    const mix = pickLevelMix("a1", []);
    expect(mix.a1).toBe(1); // a1 has no level below — share folds in
    expect(mix.b1).toBe(0);
  });

  it("pulls from the next level for mid scores", () => {
    expect(pickLevelMix("a2", [70, 75])).toEqual({ a1: 0.1, a2: 0.7, b1: 0.2 });
  });

  it("pushes hard into the next level for high scores", () => {
    expect(pickLevelMix("a1", [90, 95])).toEqual({ a1: 0.5, a2: 0.5, b1: 0 });
  });

  it("folds the above-share back in at b1 (no higher level)", () => {
    expect(pickLevelMix("b1", [95])).toEqual({ a1: 0, a2: 0, b1: 1 });
  });
});

describe("normalizeAnswer / isAnswerAccepted", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(normalizeAnswer("  Der   Zug! ")).toBe("der zug");
  });

  it("accepts umlaut and ss/ß alternate spellings", () => {
    expect(isAnswerAccepted("groesser", ["größer"])).toBe(true);
    expect(isAnswerAccepted("größer", ["groesser"])).toBe(true);
    expect(isAnswerAccepted("heisst", ["heißt"])).toBe(true);
  });

  it("rejects wrong answers", () => {
    expect(isAnswerAccepted("kleiner", ["größer"])).toBe(false);
  });
});

describe("buildSession", () => {
  it("is deterministic under a seeded rng", () => {
    const a = buildSession({ ...base, rng: mulberry32(7) });
    const b = buildSession({ ...base, rng: mulberry32(7) });
    expect(a).toEqual(b);
  });

  it("returns the requested size with no duplicate qids or words", () => {
    const session = buildSession({ ...base, rng: mulberry32(1) });
    expect(session).toHaveLength(12);
    const qids = session.map((q) => q.qid);
    expect(new Set(qids).size).toBe(qids.length);
    const wordIds = qids.filter((id) => id.startsWith("w:")).map((id) => id.split(":")[1]);
    expect(new Set(wordIds).size).toBe(wordIds.length);
  });

  it("mixes question types", () => {
    const session = buildSession({ ...base, size: 20, rng: mulberry32(2) });
    const types = new Set(session.map((q) => q.type));
    expect(types.has("mcq")).toBe(true);
    expect(types.has("fill_blank")).toBe(true);
    expect(types.has("true_false")).toBe(true);
  });

  it("respects excludeIds (no repeats across sessions)", () => {
    const first = buildSession({ ...base, rng: mulberry32(3) });
    const excluded = new Set(first.filter((q) => !q.qid.startsWith("w:")).map((q) => q.qid));
    const second = buildSession({ ...base, excludeIds: excluded, rng: mulberry32(3) });
    for (const q of second) {
      expect(excluded.has(q.qid)).toBe(false);
    }
  });

  it("works without any vocabulary (bank only)", () => {
    const session = buildSession({ ...base, words: [], rng: mulberry32(4) });
    expect(session).toHaveLength(12);
    expect(session.every((q) => !q.qid.startsWith("w:"))).toBe(true);
  });

  it("high scorers on a1 see a2 bank questions", () => {
    const session = buildSession({ ...base, recentPercents: [95, 92], size: 20, rng: mulberry32(5) });
    expect(session.some((q) => q.level === "a2")).toBe(true);
  });

  it("never leaks ipa/grammar metadata into questions", () => {
    const session = buildSession({ ...base, size: 20, rng: mulberry32(6) });
    for (const q of session) {
      expect(JSON.stringify(q)).not.toMatch(/ipa|grammar/i);
    }
  });
});

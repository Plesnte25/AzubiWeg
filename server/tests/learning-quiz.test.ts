import { describe, expect, it } from "vitest";
import {
  generateQuiz,
  mulberry32,
  QUIZ_CHOICES,
  type QuizWord,
} from "../src/services/learning/quiz.js";

const word = (id: string, headword: string, meaning: string, lesson: string | null = null): QuizWord => ({
  id,
  headword,
  meaning,
  lesson,
});

const pool: QuizWord[] = [
  word("1", "Zug", "train", "L1"),
  word("2", "Bahnhof", "train station", "L1"),
  word("3", "fahren", "to drive", "L1"),
  word("4", "Haus", "house", "L2"),
  word("5", "Tisch", "table", "L2"),
  word("6", "Apfel", "apple", null),
];

describe("generateQuiz", () => {
  it("is deterministic under a seeded rng", () => {
    const a = generateQuiz(pool, { size: 4, direction: "de_to_meaning", rng: mulberry32(42) });
    const b = generateQuiz(pool, { size: 4, direction: "de_to_meaning", rng: mulberry32(42) });
    expect(a).toEqual(b);
  });

  it("builds 4 distinct choices with the answer at answerIndex", () => {
    const questions = generateQuiz(pool, { size: 6, direction: "de_to_meaning", rng: mulberry32(1) });
    expect(questions).toHaveLength(6);
    for (const q of questions) {
      expect(q.choices).toHaveLength(QUIZ_CHOICES);
      expect(new Set(q.choices).size).toBe(QUIZ_CHOICES);
      const promptWord = pool.find((w) => w.id === q.wordId)!;
      expect(q.prompt).toBe(promptWord.headword);
      expect(q.choices[q.answerIndex]).toBe(promptWord.meaning);
    }
  });

  it("swaps prompt and answer sides in reverse direction", () => {
    const questions = generateQuiz(pool, { size: 4, direction: "meaning_to_de", rng: mulberry32(2) });
    for (const q of questions) {
      const promptWord = pool.find((w) => w.id === q.wordId)!;
      expect(q.prompt).toBe(promptWord.meaning);
      expect(q.choices[q.answerIndex]).toBe(promptWord.headword);
    }
  });

  it("prefers same-lesson distractors when enough exist", () => {
    // 4 L1 words: every L1 question can fill all 3 distractor slots from L1
    const lessonPool = [
      word("1", "Zug", "train", "L1"),
      word("2", "Bahnhof", "train station", "L1"),
      word("3", "fahren", "to drive", "L1"),
      word("4", "Gleis", "platform", "L1"),
      word("5", "Haus", "house", "L2"),
      word("6", "Tisch", "table", "L2"),
    ];
    const questions = generateQuiz(lessonPool, { size: 6, direction: "de_to_meaning", rng: mulberry32(3) });
    const l1Meanings = new Set(["train", "train station", "to drive", "platform"]);
    for (const q of questions) {
      const promptWord = lessonPool.find((w) => w.id === q.wordId)!;
      if (promptWord.lesson === "L1") {
        for (const choice of q.choices) expect(l1Meanings.has(choice)).toBe(true);
      }
    }
  });

  it("returns a shorter quiz when the pool is smaller than size", () => {
    const questions = generateQuiz(pool, { size: 50, direction: "de_to_meaning", rng: mulberry32(4) });
    expect(questions).toHaveLength(pool.length);
  });

  it("collapses words with duplicate answer texts", () => {
    const dupPool = [
      word("1", "gehen", "to go"),
      word("2", "laufen", "to go"), // duplicate meaning — collapsed
      word("3", "Haus", "house"),
      word("4", "Tisch", "table"),
      word("5", "Apfel", "apple"),
    ];
    const questions = generateQuiz(dupPool, { size: 10, direction: "de_to_meaning", rng: mulberry32(5) });
    expect(questions).toHaveLength(4);
    for (const q of questions) expect(new Set(q.choices).size).toBe(QUIZ_CHOICES);
  });

  it("returns [] when fewer than 4 distinct answers exist", () => {
    const tiny = [word("1", "Zug", "train"), word("2", "Haus", "house"), word("3", "Tisch", "table")];
    expect(generateQuiz(tiny, { size: 10, direction: "de_to_meaning", rng: mulberry32(6) })).toEqual([]);
  });
});

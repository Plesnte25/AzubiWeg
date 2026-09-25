import { describe, expect, it } from "vitest";
import {
  EXAM_ATTEMPT_COOLDOWN_DAYS,
  EXAM_PASS_THRESHOLD,
  buildExamSession,
  canAttemptExam,
  choiceOrder,
  examAudioTranscript,
  examSectionCounts,
  levelHasExamContent,
  scoreExam,
} from "../src/services/learning/exam.js";
import { EXAM_QUESTION_BANK } from "../src/services/learning/exam-question-bank.js";

const LEVELS = ["a1", "a2", "b1"] as const;
const bankFor = (level: (typeof LEVELS)[number]) => EXAM_QUESTION_BANK.filter((q) => q.level === level);

describe("exam question bank", () => {
  it("has 5 questions per section at every level", () => {
    for (const level of LEVELS) expect(examSectionCounts(level)).toEqual({ vocabulary: 5, grammar: 5, gender_drill: 5, listening: 5 });
  });

  it("has unique ids and well-formed questions", () => {
    const ids = EXAM_QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of EXAM_QUESTION_BANK) {
      expect(q.id.startsWith(`exam-${q.level}-`)).toBe(true);
      if (q.type === "mcq") {
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(q.choices.length);
        expect(new Set(q.choices).size).toBe(q.choices.length);
      }
      if (q.type === "fill_blank") expect(q.accepted.length).toBeGreaterThan(0);
    }
  });

  it("gives every listening question an audio transcript, and only listening questions", () => {
    for (const q of EXAM_QUESTION_BANK) expect(Boolean(q.audio)).toBe(q.section === "listening");
  });

  it("mixes true and false statements at every level", () => {
    for (const level of LEVELS) {
      const tf = bankFor(level).filter((q) => q.type === "true_false").map((q) => (q.type === "true_false" ? q.answer : null));
      expect(tf).toContain(true);
      expect(tf).toContain(false);
    }
  });
});

describe("levelHasExamContent", () => {
  it("is true for every level with an authored bank", () => {
    for (const level of LEVELS) expect(levelHasExamContent(level)).toBe(true);
  });
});

describe("choiceOrder", () => {
  const q = { id: "exam-x-01", choices: ["a", "b", "c", "d"] };

  it("is a stable permutation for the same seed", () => {
    const order = choiceOrder(q, "seed-1");
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(choiceOrder(q, "seed-1")).toEqual(order);
  });

  it("keeps the authored order without a seed (attempts from before shuffling)", () => {
    expect(choiceOrder(q, null)).toEqual([0, 1, 2, 3]);
  });

  it("doesn't leave the right answer first across attempts", () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => choiceOrder(q, `s${i}`)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe("buildExamSession", () => {
  it("returns every question of the level, with no answer data or transcript exposed", () => {
    for (const level of LEVELS) {
      const session = buildExamSession(level, "seed", () => 0.5);
      expect(session).toHaveLength(bankFor(level).length);
      for (const q of session) {
        expect(q).not.toHaveProperty("answerIndex");
        expect(q).not.toHaveProperty("accepted");
        expect(q).not.toHaveProperty("answer");
        expect(typeof q.audio).toBe("boolean");
        expect(JSON.stringify(q)).not.toContain("Personalabteilung"); // a B1 transcript phrase
      }
    }
  });

  it("shows each MCQ's choices in the attempt's seeded order", () => {
    const session = buildExamSession("a2", "seed-x");
    const q = bankFor("a2").find((x) => x.type === "mcq")!;
    const shown = session.find((s) => s.qid === q.id)!;
    if (q.type !== "mcq" || shown.type !== "mcq") throw new Error("expected an mcq");
    expect(shown.choices).toEqual(choiceOrder(q, "seed-x").map((i) => q.choices[i]));
  });
});

describe("examAudioTranscript", () => {
  it("returns a listening question's transcript for its own level only", () => {
    const lis = bankFor("b1").find((q) => q.section === "listening")!;
    expect(examAudioTranscript("b1", lis.id)).toBe(lis.audio);
    expect(examAudioTranscript("a1", lis.id)).toBeNull();
    expect(examAudioTranscript("b1", bankFor("b1").find((q) => q.section === "grammar")!.id)).toBeNull();
  });
});

describe("scoreExam", () => {
  const SEED = "attempt-seed";
  /** The right answer as the client would submit it: for an MCQ, the shown index of the authored answer. */
  const correctAnswers = (level: (typeof LEVELS)[number], seed: string | null) =>
    bankFor(level).map((q) => ({
      qid: q.id,
      answer: q.type === "mcq" ? choiceOrder(q, seed).indexOf(q.answerIndex) : q.type === "true_false" ? q.answer : q.accepted[0]!,
    }));

  it("scores a perfect run as a pass at every level, with a full section breakdown", () => {
    for (const level of LEVELS) {
      const result = scoreExam(level, correctAnswers(level, SEED), SEED);
      expect(result.score).toBe(result.total);
      expect(result.passed).toBe(true);
      expect(new Set(result.sectionBreakdown.map((s) => s.section))).toEqual(new Set(["vocabulary", "grammar", "gender_drill", "listening"]));
    }
  });

  it("doesn't pass by always picking the first choice", () => {
    const firsts = bankFor("a2").map((q) => ({ qid: q.id, answer: q.type === "mcq" ? 0 : q.type === "true_false" ? q.answer : q.accepted[0]! }));
    const mcqCount = bankFor("a2").filter((q) => q.type === "mcq").length;
    const result = scoreExam("a2", firsts, SEED);
    expect(result.score).toBeLessThan(result.total);
    expect(result.total - result.score).toBeLessThanOrEqual(mcqCount);
  });

  it("scores pre-shuffle attempts (null seed) against the authored order", () => {
    const result = scoreExam("a1", correctAnswers("a1", null), null);
    expect(result.score).toBe(result.total);
  });

  it("never trusts a client-submitted answer beyond the bank's own correct value", () => {
    const wrong = bankFor("a1").map((q) => ({
      qid: q.id,
      answer: q.type === "mcq" ? 999 : q.type === "true_false" ? !q.answer : "not-a-real-answer",
    }));
    const result = scoreExam("a1", wrong, SEED);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it(`fails a run below the ${EXAM_PASS_THRESHOLD * 100}% pass threshold`, () => {
    const all = correctAnswers("b1", SEED);
    const passingCount = Math.ceil(all.length * EXAM_PASS_THRESHOLD);
    const below = all.map((a, i) => (i < passingCount - 1 ? a : { ...a, answer: "wrong" }));
    expect(scoreExam("b1", below, SEED).passed).toBe(false);
  });

  it("ignores unknown or duplicate question ids rather than crashing", () => {
    const all = correctAnswers("a1", SEED);
    const result = scoreExam("a1", [{ qid: "not-a-real-id", answer: 0 }, ...all, all[0]!], SEED);
    expect(result.score).toBe(result.total);
  });

  it("accepts fill-blank answers with umlaut transliteration and any case", () => {
    const q = bankFor("b1").find((x) => x.id === "exam-b1-lis-05")!;
    const result = scoreExam("b1", [{ qid: q.id, answer: "DREIHUNDERTFUENFZIG" }], SEED);
    expect(result.sectionBreakdown.find((s) => s.section === "listening")!.correct).toBe(1);
  });
});

describe("canAttemptExam", () => {
  it("allows a first attempt with no history", () => {
    expect(canAttemptExam([])).toEqual({ allowed: true, reason: null, nextAvailableAt: null });
  });

  it("blocks a new attempt once the level has been passed", () => {
    const result = canAttemptExam([{ startedAt: new Date(), passed: true }]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("already_passed");
  });

  it(`enforces the ${EXAM_ATTEMPT_COOLDOWN_DAYS}-day cooldown after a failed attempt`, () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    const result = canAttemptExam([{ startedAt: twoDaysAgo, passed: false }]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("cooldown");
    expect(result.nextAvailableAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("allows a retry once the cooldown has elapsed", () => {
    const overAWeekAgo = new Date(Date.now() - (EXAM_ATTEMPT_COOLDOWN_DAYS + 1) * 86_400_000);
    const result = canAttemptExam([{ startedAt: overAWeekAgo, passed: false }]);
    expect(result.allowed).toBe(true);
  });

  it("uses the most recent attempt for the cooldown, not the oldest", () => {
    const longAgo = new Date(Date.now() - 30 * 86_400_000);
    const recent = new Date(Date.now() - 1 * 86_400_000);
    const result = canAttemptExam([
      { startedAt: longAgo, passed: false },
      { startedAt: recent, passed: false },
    ]);
    expect(result.allowed).toBe(false);
  });
});

describe("suggestedMockDate", () => {
  it("is two weeks before the exam date, or null without one", async () => {
    const { suggestedMockDate } = await import("../src/services/learning/exam.js");
    expect(suggestedMockDate(new Date("2027-01-09T00:00:00Z"))).toBe("2026-12-26");
    expect(suggestedMockDate(null)).toBeNull();
  });
});

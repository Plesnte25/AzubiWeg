import { describe, expect, it } from "vitest";
import {
  EXAM_ATTEMPT_COOLDOWN_DAYS,
  EXAM_PASS_THRESHOLD,
  buildExamSession,
  canAttemptExam,
  levelHasExamContent,
  scoreExam,
} from "../src/services/learning/exam.js";
import { EXAM_QUESTION_BANK } from "../src/services/learning/exam-question-bank.js";

describe("levelHasExamContent", () => {
  it("is true for a1, which has an authored bank", () => {
    expect(levelHasExamContent("a1")).toBe(true);
  });

  it("is false for a level with no questions yet", () => {
    expect(levelHasExamContent("a2")).toBe(false);
    expect(levelHasExamContent("b1")).toBe(false);
  });
});

describe("buildExamSession", () => {
  it("returns every A1 question, shuffled, with no answer data exposed", () => {
    const session = buildExamSession("a1", () => 0.5);
    const a1Count = EXAM_QUESTION_BANK.filter((q) => q.level === "a1").length;
    expect(session).toHaveLength(a1Count);
    for (const q of session) {
      expect(q).not.toHaveProperty("answerIndex");
      expect(q).not.toHaveProperty("accepted");
      expect(q).not.toHaveProperty("answer");
    }
  });

  it("returns an empty session for a level with no authored content yet", () => {
    expect(buildExamSession("b1")).toEqual([]);
  });
});

describe("scoreExam", () => {
  const allCorrectAnswers = EXAM_QUESTION_BANK.filter((q) => q.level === "a1").map((q) => ({
    qid: q.id,
    answer: q.type === "mcq" ? q.answerIndex : q.type === "true_false" ? q.answer : q.accepted[0]!,
  }));

  it("scores a perfect run as a pass, with a full section breakdown", () => {
    const result = scoreExam("a1", allCorrectAnswers);
    expect(result.score).toBe(result.total);
    expect(result.passed).toBe(true);
    const sections = new Set(result.sectionBreakdown.map((s) => s.section));
    expect(sections).toEqual(new Set(["vocabulary", "grammar", "gender_drill", "listening"]));
    for (const s of result.sectionBreakdown) expect(s.correct).toBe(s.total);
  });

  it("never trusts a client-submitted answer beyond the bank's own correct value", () => {
    // wrong answers throughout -- even if a hostile client claims a high
    // score in some other field, scoreExam only ever recomputes from qid
    const wrong = EXAM_QUESTION_BANK.filter((q) => q.level === "a1").map((q) => ({
      qid: q.id,
      answer: q.type === "mcq" ? 999 : q.type === "true_false" ? !q.answer : "not-a-real-answer",
    }));
    const result = scoreExam("a1", wrong);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it(`fails a run below the ${EXAM_PASS_THRESHOLD * 100}% pass threshold`, () => {
    const total = EXAM_QUESTION_BANK.filter((q) => q.level === "a1").length;
    const passingCount = Math.ceil(total * EXAM_PASS_THRESHOLD);
    const belowThreshold = allCorrectAnswers.map((a, i) => (i < passingCount - 1 ? a : { ...a, answer: "wrong" }));
    const result = scoreExam("a1", belowThreshold);
    expect(result.passed).toBe(false);
  });

  it("ignores unknown or duplicate question ids rather than crashing", () => {
    const result = scoreExam("a1", [
      { qid: "not-a-real-id", answer: 0 },
      ...allCorrectAnswers,
      { qid: allCorrectAnswers[0]!.qid, answer: allCorrectAnswers[0]!.answer }, // duplicate
    ]);
    expect(result.score).toBe(result.total); // duplicate didn't double-count
  });

  it("isAnswerAccepted-style tolerance applies to fill_blank answers (umlaut spelling)", () => {
    const fillBlank = EXAM_QUESTION_BANK.find((q) => q.type === "fill_blank" && q.level === "a1")!;
    const result = scoreExam("a1", [{ qid: fillBlank.id, answer: (fillBlank as { accepted: string[] }).accepted[0]!.toUpperCase() }]);
    const section = result.sectionBreakdown.find((s) => s.section === fillBlank.section)!;
    expect(section.correct).toBe(1);
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

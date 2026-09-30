import { describe, expect, it } from "vitest";
import { gradeCheckSet, gradeSyllabusExercise } from "../src/services/learning/exercise-grading.js";
import type { CheckItem } from "../src/services/learning/syllabus-defaults.js";

const rubric = { taskFulfilled: true, grammarChecked: true, understandable: true };

describe("gradeSyllabusExercise", () => {
  it("grades normalized free-text and correction answers", () => {
    const result = gradeSyllabusExercise({
      exerciseType: "free_text",
      skill: "grammar",
      exerciseAnswer: "Ich lerne Deutsch.",
      exerciseOptions: null,
      answer: "  ICH   LERNE DEUTSCH. ",
      rubricAssessment: null,
      audioEvidence: false,
      recordingDurationSeconds: null,
    });
    expect(result.passed).toBe(true);
  });

  it("grades multiple-choice by the persisted correct index", () => {
    const result = gradeSyllabusExercise({
      exerciseType: "multiple_choice",
      skill: "grammar",
      exerciseAnswer: null,
      exerciseOptions: { options: ["bin", "bist"], correctIndex: 1 },
      answer: "1",
      rubricAssessment: null,
      audioEvidence: false,
      recordingDurationSeconds: null,
    });
    expect(result.passed).toBe(true);
  });

  it("requires evidence for audio and all checks for self-assessment", () => {
    expect(gradeSyllabusExercise({
      exerciseType: "speaking_audio",
      skill: "speaking",
      exerciseAnswer: null,
      exerciseOptions: null,
      answer: "audio",
      rubricAssessment: rubric,
      audioEvidence: false,
      recordingDurationSeconds: null,
    }).passed).toBe(false);
    expect(gradeSyllabusExercise({
      exerciseType: "self_check",
      skill: "grammar",
      exerciseAnswer: null,
      exerciseOptions: null,
      answer: "self-check",
      rubricAssessment: rubric,
      audioEvidence: false,
      recordingDurationSeconds: null,
    }).passed).toBe(true);
  });

  it("requires a substantial writing answer and two rubric checks", () => {
    const result = gradeSyllabusExercise({
      exerciseType: "free_text",
      skill: "writing",
      exerciseAnswer: null,
      exerciseOptions: null,
      answer: "Das ist ein kurzer deutscher Text.",
      rubricAssessment: { ...rubric, understandable: false },
      audioEvidence: false,
      recordingDurationSeconds: null,
    });
    expect(result.passed).toBe(true);
  });
});

describe("gradeCheckSet", () => {
  const items: CheckItem[] = [
    { kind: "cloze", prompt: "Ich ___ aus Indien.", accepted: ["komme"] },
    { kind: "cloze", prompt: "Wir ___ in Köln.", accepted: ["wohnen"] },
    { kind: "choice", prompt: "du ___", options: ["bin", "bist", "ist"], correctIndex: 1 },
    { kind: "cloze", prompt: "Das ist ___ Buch.", accepted: ["ein", "mein"] },
    { kind: "cloze", prompt: "Er ___ gern.", accepted: ["läuft"] },
  ];

  it("passes at 80 % and accepts any listed answer, tolerantly", () => {
    const r = gradeCheckSet(items, JSON.stringify(["Komme", "wohnen.", 1, "mein", "laeuft"]));
    expect(r).toMatchObject({ passed: true, results: [true, true, true, true, true] });
  });

  it("fails below 80 % and names the right answers", () => {
    const r = gradeCheckSet(items, JSON.stringify(["komme", "wohne", 0, "ein", ""]));
    expect(r.passed).toBe(false);
    expect(r.results).toEqual([true, false, false, true, false]);
    expect(r.feedback).toContain("2/5 right");
    expect(r.feedback).toContain("2: wohnen · 3: bist · 5: läuft");
  });

  it("treats a malformed answer as all wrong, and routes check_set through gradeSyllabusExercise", () => {
    expect(gradeCheckSet(items, "not json").passed).toBe(false);
    const r = gradeSyllabusExercise({ exerciseType: "check_set", skill: "grammar", exerciseAnswer: null, exerciseOptions: { items }, answer: JSON.stringify(["komme", "wohnen", 1, "ein", "läuft"]), rubricAssessment: null, audioEvidence: false, recordingDurationSeconds: null });
    expect(r.passed).toBe(true);
  });
});

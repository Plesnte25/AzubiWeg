import { describe, expect, it } from "vitest";
import { gradeSyllabusExercise } from "../src/services/learning/exercise-grading.js";

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

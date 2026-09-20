export type ExerciseType = "free_text" | "self_check" | "multiple_choice" | "correction" | "listening_audio" | "speaking_audio";

export type ExerciseRubric = {
  taskFulfilled: boolean;
  grammarChecked: boolean;
  understandable: boolean;
};

export type ExerciseGradingInput = {
  exerciseType: ExerciseType;
  skill: string | null;
  exerciseAnswer: string | null;
  exerciseOptions: { options?: unknown[]; correctIndex?: unknown } | null;
  answer: string;
  rubricAssessment: ExerciseRubric | null | undefined;
  audioEvidence: boolean;
  recordingDurationSeconds: number | null;
};

function normalizeAnswer(answer: string): string {
  return answer.toLocaleLowerCase("de-DE").replace(/\s+/g, " ").trim();
}

export function gradeSyllabusExercise(input: ExerciseGradingInput): { passed: boolean; feedback: string } {
  const normalized = normalizeAnswer(input.answer);
  const expected = input.exerciseAnswer ? normalizeAnswer(input.exerciseAnswer) : null;
  const rubric = input.rubricAssessment;
  const rubricScore = rubric
    ? [rubric.taskFulfilled, rubric.grammarChecked, rubric.understandable].filter(Boolean).length
    : 0;

  const passed = input.exerciseType === "listening_audio" || input.exerciseType === "speaking_audio"
    ? input.audioEvidence
    : input.exerciseType === "self_check"
      ? rubricScore === 3
      : input.skill === "writing"
        ? normalized.length >= 20 && rubricScore >= 2
        : input.exerciseType === "multiple_choice" && input.exerciseOptions
          ? Number(input.answer) === input.exerciseOptions.correctIndex
          : expected
            ? normalized === expected
            : normalized.length >= 12;

  const recordingDurationNote = input.recordingDurationSeconds
    ? ` Recording length: ~${input.recordingDurationSeconds}s.`
    : "";
  const feedback = passed && input.exerciseType === "speaking_audio"
    ? rubricScore === 3
      ? `Passed. You completed the speaking checklist.${recordingDurationNote} Keep the recording and repeat the task once more without reading.`
      : `Recording saved and passed.${recordingDurationNote} Next time, complete all three speaking checks for a stronger self-review.`
    : passed && input.exerciseType === "self_check"
      ? "Passed. You completed the self-assessment checklist."
      : passed
        ? "Passed. Compare your answer with the lesson and keep the correction in your notes."
        : expected
          ? "Not quite. Review the resource, then try the exact target form again."
          : "Add a complete sentence with the target concept, then try again.";

  return { passed, feedback };
}

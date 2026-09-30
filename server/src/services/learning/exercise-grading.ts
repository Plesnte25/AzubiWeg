import { isAnswerAccepted } from "./engine.js";
import type { CheckItem } from "./syllabus-defaults.js";

export type ExerciseType = "free_text" | "self_check" | "multiple_choice" | "correction" | "listening_audio" | "speaking_audio" | "check_set";

export type ExerciseRubric = {
  taskFulfilled: boolean;
  grammarChecked: boolean;
  understandable: boolean;
};

export type ExerciseGradingInput = {
  exerciseType: ExerciseType;
  skill: string | null;
  exerciseAnswer: string | null;
  exerciseOptions: { options?: unknown[]; correctIndex?: unknown; items?: unknown } | null;
  answer: string;
  rubricAssessment: ExerciseRubric | null | undefined;
  audioEvidence: boolean;
  recordingDurationSeconds: number | null;
};

function normalizeAnswer(answer: string): string {
  return answer.toLocaleLowerCase("de-DE").replace(/\s+/g, " ").trim();
}

/** Share of a check_set that has to be right to pass. */
export const CHECK_SET_PASS = 0.8;

/**
 * A check_set (KNOWN_ISSUES #38): `answer` is a JSON array, one entry per item — the typed text for a fill-in (any
 * accepted answer counts, compared without case, punctuation or spacing, ä/ae and ß/ss alike) or the chosen option's
 * index for a choice. Passes at 80 %; the feedback names what to fix.
 */
export function gradeCheckSet(items: CheckItem[], answer: string): { passed: boolean; feedback: string; results: boolean[] } {
  let given: unknown;
  try {
    given = JSON.parse(answer);
  } catch {
    given = null;
  }
  const answers = Array.isArray(given) ? given : [];
  const results = items.map((item, i) => {
    const a = answers[i];
    if (item.kind === "choice") return String(a) === String(item.correctIndex);
    return typeof a === "string" && a.trim() !== "" && isAnswerAccepted(a, item.accepted);
  });
  const right = results.filter(Boolean).length;
  const passed = items.length > 0 && right / items.length >= CHECK_SET_PASS;
  const misses = items
    .map((item, i) => (results[i] ? null : `${i + 1}: ${item.kind === "choice" ? item.options[item.correctIndex] : item.accepted[0]}`))
    .filter(Boolean);
  const feedback = passed
    ? `${right}/${items.length} right — passed.${misses.length ? ` Look again at ${misses.join(" · ")}.` : ""}`
    : `${right}/${items.length} right — you need ${Math.ceil(items.length * CHECK_SET_PASS)} to pass. Check: ${misses.join(" · ")}.`;
  return { passed, feedback, results };
}

export function gradeSyllabusExercise(input: ExerciseGradingInput): { passed: boolean; feedback: string; results?: boolean[] } {
  if (input.exerciseType === "check_set") {
    const items = Array.isArray(input.exerciseOptions?.items) ? (input.exerciseOptions.items as CheckItem[]) : [];
    return gradeCheckSet(items, input.answer);
  }
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

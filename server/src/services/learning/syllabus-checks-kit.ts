/**
 * Shared building blocks for the checked exercises of every level (KNOWN_ISSUES #38): syllabus-checks-a1.ts,
 * -a2.ts, -b1.ts. See syllabus-checks-a1.ts for the authoring rules.
 */
import type { CheckItem, DefaultSyllabusItem } from "./syllabus-defaults.js";

export type Authored = Pick<
  DefaultSyllabusItem,
  | "learningOutcome"
  | "resourceTitle"
  | "resourceBody"
  | "resourceTranscript"
  | "listeningPrompt"
  | "guidedPractice"
  | "exerciseType"
  | "exercisePrompt"
  | "exerciseAnswer"
  | "exerciseOptions"
>;

export const gap = (prompt: string, ...accepted: string[]): CheckItem => ({ kind: "cloze", prompt, accepted });
export const hintGap = (prompt: string, hint: string, ...accepted: string[]): CheckItem => ({ kind: "cloze", prompt, accepted, hint });
export const pick = (prompt: string, options: string[], correctIndex: number): CheckItem => ({ kind: "choice", prompt, options, correctIndex });
export const checks = (exercisePrompt: string, items: CheckItem[]): Pick<Authored, "exerciseType" | "exercisePrompt" | "exerciseOptions"> => ({
  exerciseType: "check_set",
  exercisePrompt,
  exerciseOptions: { items },
});

// ── reading: a short text in the lesson, questions on its facts ─────────────

export const read = (resourceTitle: string, text: string, items: CheckItem[], learningOutcome: string): Authored => ({
  learningOutcome,
  resourceTitle,
  resourceBody: `${text}\n\nRead the text twice: once for the gist, once for the details. Then answer without guessing — every answer is in the text.`,
  guidedPractice: "Underline the key facts (names, numbers, times, places) before you answer.",
  ...checks("Lies den Text und beantworte die Fragen.", items),
});

// ── listening: a script played as generated audio (transcript hidden until revealed), questions on it ─────────

export const listen = (resourceTitle: string, listeningPrompt: string, transcript: string, items: CheckItem[], learningOutcome: string): Authored => ({
  learningOutcome,
  resourceTitle,
  resourceBody: "Listen twice before you look at the transcript: first for the situation, then for the details the questions ask about. Only open the transcript to check yourself afterwards.",
  resourceTranscript: transcript,
  listeningPrompt,
  guidedPractice: "After the second listen, say the key facts aloud in one or two sentences.",
  ...checks("Hör zu und beantworte die Fragen.", items),
});

// ── speaking: a recording of a concrete task, with the phrases to build it from ───────────────────────────
// Honest limit: the app can check that you recorded, not what you said (no pronunciation or grammar scoring). The
// pass is the recording plus your own three checks; the phrase bank and a model answer make that self-check fair.

export const speak = (task: string, phrases: string, model: string, learningOutcome: string): Authored => ({
  learningOutcome,
  resourceTitle: "Phrases for this task",
  resourceBody: `${phrases}\n\nModel answer (read it, then close it and say your own):\n${model}`,
  guidedPractice: "Say your answer once aloud without recording. Then record it in one go — don't read from the screen.",
  exerciseType: "speaking_audio",
  exercisePrompt: task,
});

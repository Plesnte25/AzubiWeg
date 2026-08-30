import type { CefrLevel } from "@prisma/client";

/** The 4 sections the Exam Gate screen breaks a level's final exam into
 * (handoff spec: "Vocabulary/Grammar/Gender-drill/Listening rows, each a
 * label + score fraction"). "listening" questions are text-based
 * listening-comprehension items (a short dialogue/passage to read and
 * answer about) rather than real audio — no TTS/audio-clip pipeline is
 * wired into the exam flow yet; upgrading these to real audio prompts is
 * follow-up work, not required for the gating logic itself to be real. */
export type ExamSection = "vocabulary" | "grammar" | "gender_drill" | "listening";

export type ExamQuestion =
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "mcq";
      prompt: string;
      choices: string[];
      answerIndex: number;
      explanation?: string;
    }
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "fill_blank";
      prompt: string;
      accepted: string[];
      explanation?: string;
    }
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "true_false";
      prompt: string;
      answer: boolean;
      explanation?: string;
    };

/**
 * Dedicated, separately-authored exam content — deliberately NOT the same
 * pool as question-bank.ts's practice QUESTION_BANK (confirmed with the
 * user: the real gating exam needs its own higher-stakes questions, not a
 * reused practice set). Ids are stable and persist in ExamAttempt.
 * sectionBreakdown — never renumber or reuse an id; retire by deletion, add
 * with fresh numbers.
 *
 * Starter set: A1 only (20 questions, 5 per section) — enough for the exam-
 * gate engine to be real and end-to-end functional for the first level a
 * user actually hits it at. A2/B1 exam content is flagged follow-up work,
 * same as this project's practice question-bank.ts was itself built up
 * incrementally over time.
 */
export const EXAM_QUESTION_BANK: ExamQuestion[] = [
  // ═══ A1 · vocabulary ═══
  { id: "exam-a1-vocab-01", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Die Rechnung\" means:", choices: ["the bill/invoice", "the receipt", "the menu", "the tip"], answerIndex: 0 },
  { id: "exam-a1-vocab-02", level: "a1", section: "vocabulary", type: "fill_blank", prompt: "Ich brauche ein neues Handy, meins ist ___ . (broken)", accepted: ["kaputt"] },
  { id: "exam-a1-vocab-03", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Der Termin\" means:", choices: ["appointment", "term of a contract", "birthday", "weekend"], answerIndex: 0 },
  { id: "exam-a1-vocab-04", level: "a1", section: "vocabulary", type: "true_false", prompt: "\"Die Miete\" means the rent you pay for an apartment.", answer: true },
  { id: "exam-a1-vocab-05", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Die Ausbildung\" is best translated as:", choices: ["vocational training", "the exhibition", "the education fee", "the workplace"], answerIndex: 0 },

  // ═══ A1 · grammar ═══
  { id: "exam-a1-gram-01", level: "a1", section: "grammar", type: "fill_blank", prompt: "Ich ___ jeden Tag Deutsch. (lernen)", accepted: ["lerne"] },
  { id: "exam-a1-gram-02", level: "a1", section: "grammar", type: "mcq", prompt: "Wähle die richtige Form: Er ___ aus Deutschland.", choices: ["kommt", "kommst", "kommen", "komme"], answerIndex: 0 },
  { id: "exam-a1-gram-03", level: "a1", section: "grammar", type: "fill_blank", prompt: "Wir ___ heute keine Zeit. (haben)", accepted: ["haben"] },
  { id: "exam-a1-gram-04", level: "a1", section: "grammar", type: "true_false", prompt: "In a German yes/no question, the verb comes first: \"Kommst du morgen?\"", answer: true },
  { id: "exam-a1-gram-05", level: "a1", section: "grammar", type: "mcq", prompt: "Negate correctly: \"Ich habe ein Auto.\" → \"Ich habe ___ Auto.\"", choices: ["kein", "nicht", "keine", "nichts"], answerIndex: 0 },

  // ═══ A1 · gender drill ═══
  { id: "exam-a1-gen-01", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Wohnung ist sehr klein.", choices: ["Die", "Der", "Das", "Den"], answerIndex: 0 },
  { id: "exam-a1-gen-02", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Bahnhof ist gleich um die Ecke.", choices: ["Der", "Die", "Das", "Dem"], answerIndex: 0 },
  { id: "exam-a1-gen-03", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Kind spielt im Park.", choices: ["Das", "Der", "Die", "Den"], answerIndex: 0 },
  { id: "exam-a1-gen-04", level: "a1", section: "gender_drill", type: "true_false", prompt: "\"Der Schlüssel\" (the key) takes the article \"der\".", answer: true },
  { id: "exam-a1-gen-05", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Vertrag muss unterschrieben werden.", choices: ["Der", "Die", "Das", "Den"], answerIndex: 0 },

  // ═══ A1 · listening (text-based comprehension — see ExamSection doc) ═══
  { id: "exam-a1-lis-01", level: "a1", section: "listening", type: "mcq", prompt: "A: \"Wo ist der Bahnhof?\" B: \"Gehen Sie geradeaus, dann links.\" — What does B tell A to do?", choices: ["Go straight, then turn left", "Go straight, then turn right", "Turn around", "Take the bus"], answerIndex: 0 },
  { id: "exam-a1-lis-02", level: "a1", section: "listening", type: "mcq", prompt: "A: \"Möchten Sie noch etwas?\" B: \"Nein danke, das war's.\" — What is B saying?", choices: ["No thanks, that's all", "Yes, one more please", "I don't understand", "Can I pay now?"], answerIndex: 0 },
  { id: "exam-a1-lis-03", level: "a1", section: "listening", type: "true_false", prompt: "A: \"Um wie viel Uhr öffnet die Bank?\" B: \"Um neun Uhr.\" — The bank opens at 9 o'clock.", answer: true },
  { id: "exam-a1-lis-04", level: "a1", section: "listening", type: "mcq", prompt: "A: \"Haben Sie einen Termin?\" B: \"Nein, aber es ist dringend.\" — B is saying their situation is:", choices: ["urgent", "not important", "already scheduled", "cancelled"], answerIndex: 0 },
  { id: "exam-a1-lis-05", level: "a1", section: "listening", type: "fill_blank", prompt: "A: \"Wie war Ihr Wochenende?\" B: \"Sehr ___, danke!\" (nice/good) — fill in a natural one-word answer.", accepted: ["gut", "schoen", "schön"] },
];

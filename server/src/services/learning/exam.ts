import type { CefrLevel } from "@prisma/client";
import { isAnswerAccepted } from "./engine.js";
import { EXAM_QUESTION_BANK, type ExamQuestion, type ExamSection } from "./exam-question-bank.js";

/** Real pass threshold for the gating exam — deliberately not the same
 * standard as anything in the practice self-tests, since this is the one
 * result that actually unlocks the next level. */
export const EXAM_PASS_THRESHOLD = 0.7;
export const EXAM_TIME_LIMIT_MINUTES = 20;
/** "one attempt/week" per the handoff's Exam Gate rules card. */
export const EXAM_ATTEMPT_COOLDOWN_DAYS = 7;

/** What the client sees before answering — never the correct answer. */
export type ExamQuestionPublic =
  | { qid: string; section: ExamSection; type: "mcq"; prompt: string; choices: string[] }
  | { qid: string; section: ExamSection; type: "fill_blank"; prompt: string }
  | { qid: string; section: ExamSection; type: "true_false"; prompt: string };

function toPublic(q: ExamQuestion): ExamQuestionPublic {
  if (q.type === "mcq") return { qid: q.id, section: q.section, type: "mcq", prompt: q.prompt, choices: q.choices };
  if (q.type === "fill_blank") return { qid: q.id, section: q.section, type: "fill_blank", prompt: q.prompt };
  return { qid: q.id, section: q.section, type: "true_false", prompt: q.prompt };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Whether any exam questions exist yet for this level — a level with none
 * can never be exam-gated (see levelStatesWithExamGate() in
 * services/learning/progress.ts), or completing its syllabus would
 * permanently lock the user out with no exam to ever pass. Only A1 has
 * content as of this writing. */
export function levelHasExamContent(level: CefrLevel): boolean {
  return EXAM_QUESTION_BANK.some((q) => q.level === level);
}

/** All of a level's exam questions, shuffled — the whole bank, not a
 * sampled subset (20 questions at the A1 starter size is already a
 * reasonable exam length; sampling matters more once each level's bank
 * grows past that). */
export function buildExamSession(level: CefrLevel, rng: () => number = Math.random): ExamQuestionPublic[] {
  return shuffle(
    EXAM_QUESTION_BANK.filter((q) => q.level === level),
    rng,
  ).map(toPublic);
}

export interface ExamAnswer {
  qid: string;
  answer: string | number | boolean;
}

export interface SectionBreakdown {
  section: ExamSection;
  correct: number;
  total: number;
}

export interface ExamScoreResult {
  score: number;
  total: number;
  passed: boolean;
  sectionBreakdown: SectionBreakdown[];
}

/**
 * Server-side scoring against the stored question bank — a submitted
 * "answer" is only ever compared to the bank's own correct value, never
 * trusted from the client, unlike the practice quiz (which is intentionally
 * self-reported/client-scored, cheat-resistance against yourself being a
 * non-goal there). This is the one result that actually gates progress, so
 * it doesn't get that same trust model.
 */
export function scoreExam(level: CefrLevel, answers: ExamAnswer[]): ExamScoreResult {
  const bank = new Map(EXAM_QUESTION_BANK.filter((q) => q.level === level).map((q) => [q.id, q]));
  const bySection = new Map<ExamSection, { correct: number; total: number }>();

  let score = 0;
  const seen = new Set<string>();
  for (const a of answers) {
    const q = bank.get(a.qid);
    if (!q || seen.has(q.id)) continue; // ignore unknown/duplicate qids, same defensive stance as elsewhere in this pipeline
    seen.add(q.id);

    const entry = bySection.get(q.section) ?? { correct: 0, total: 0 };
    entry.total++;

    const correct =
      q.type === "mcq"
        ? typeof a.answer === "number" && a.answer === q.answerIndex
        : q.type === "true_false"
          ? typeof a.answer === "boolean" && a.answer === q.answer
          : typeof a.answer === "string" && isAnswerAccepted(a.answer, q.accepted);
    if (correct) {
      score++;
      entry.correct++;
    }
    bySection.set(q.section, entry);
  }

  const total = bank.size;
  return {
    score,
    total,
    passed: total > 0 && score / total >= EXAM_PASS_THRESHOLD,
    sectionBreakdown: [...bySection.entries()].map(([section, v]) => ({ section, ...v })),
  };
}

/** Rate-limit + "already passed" gate for starting a new attempt. */
export function canAttemptExam(
  attempts: { startedAt: Date; passed: boolean | null }[],
): { allowed: boolean; reason: "already_passed" | "cooldown" | null; nextAvailableAt: Date | null } {
  if (attempts.some((a) => a.passed)) return { allowed: false, reason: "already_passed", nextAvailableAt: null };
  const last = attempts.reduce<Date | null>(
    (latest, a) => (!latest || a.startedAt > latest ? a.startedAt : latest),
    null,
  );
  if (!last) return { allowed: true, reason: null, nextAvailableAt: null };
  const nextAvailableAt = new Date(last.getTime() + EXAM_ATTEMPT_COOLDOWN_DAYS * 86_400_000);
  if (nextAvailableAt.getTime() > Date.now()) {
    return { allowed: false, reason: "cooldown", nextAvailableAt };
  }
  return { allowed: true, reason: null, nextAvailableAt: null };
}

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
/** What the client sees before answering — never the correct answer. `audio` = has a listening clip (fetched per
 * attempt from GET /exam/:id/audio/:qid), never the transcript itself. */
export type ExamQuestionPublic =
  | { qid: string; section: ExamSection; type: "mcq"; prompt: string; choices: string[]; audio: boolean }
  | { qid: string; section: ExamSection; type: "fill_blank"; prompt: string; audio: boolean }
  | { qid: string; section: ExamSection; type: "true_false"; prompt: string; audio: boolean };

/** Deterministic PRNG (mulberry32 over an FNV-1a hash) so a choice order can be rebuilt at scoring time. */
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order an attempt shows an MCQ's choices in: `order[shown] = authored index`. Seeded by the attempt's
 * choiceSeed + question id, so the bank can author the right answer first without the exam leaking it, and scoring
 * can map the submitted (shown) index back. A null seed (attempts from before per-attempt shuffling) keeps the
 * authored order.
 */
export function choiceOrder(q: { id: string; choices: string[] }, seed: string | null): number[] {
  const identity = q.choices.map((_, i) => i);
  return seed ? shuffle(identity, seededRng(`${seed}:${q.id}`)) : identity;
}

function toPublic(q: ExamQuestion, seed: string | null): ExamQuestionPublic {
  const audio = !!q.audio;
  if (q.type === "mcq") {
    const choices = choiceOrder(q, seed).map((i) => q.choices[i]!);
    return { qid: q.id, section: q.section, type: "mcq", prompt: q.prompt, choices, audio };
  }
  if (q.type === "fill_blank") return { qid: q.id, section: q.section, type: "fill_blank", prompt: q.prompt, audio };
  return { qid: q.id, section: q.section, type: "true_false", prompt: q.prompt, audio };
}

/** A listening question's transcript, for the audio route (and the "read it instead" fallback). */
export function examAudioTranscript(level: CefrLevel, qid: string): string | null {
  return EXAM_QUESTION_BANK.find((q) => q.level === level && q.id === qid)?.audio ?? null;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Question count per section for a level -- real, from the bank, but
 * never the questions/answers themselves. Exam Gate (Phase 12 of the
 * Nocturne redesign) shows this as "40 questions · meaning & gender" per
 * section; safe to expose since knowing the count doesn't help anyone
 * cheat. */
export function examSectionCounts(level: CefrLevel): Record<ExamSection, number> {
  const counts: Record<ExamSection, number> = { vocabulary: 0, grammar: 0, gender_drill: 0, listening: 0 };
  for (const q of EXAM_QUESTION_BANK) {
    if (q.level === level) counts[q.section]++;
  }
  return counts;
}

/** Whether any exam questions exist for this level — a level with none can never be exam-gated (see
 * levelStatesWithExamGate() in services/learning/progress.ts), or completing its syllabus would permanently lock the
 * user out with no exam to ever pass. */
export function levelHasExamContent(level: CefrLevel): boolean {
  return EXAM_QUESTION_BANK.some((q) => q.level === level);
}

/** All of a level's exam questions (20), in shuffled order, each MCQ's choices shuffled by the attempt's seed. */
export function buildExamSession(level: CefrLevel, seed: string | null, rng: () => number = Math.random): ExamQuestionPublic[] {
  return shuffle(
    EXAM_QUESTION_BANK.filter((q) => q.level === level),
    rng,
  ).map((q) => toPublic(q, seed));
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
export function scoreExam(level: CefrLevel, answers: ExamAnswer[], seed: string | null): ExamScoreResult {
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
        ? typeof a.answer === "number" && choiceOrder(q, seed)[a.answer] === q.answerIndex
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

/** How long before the exam date the Plan gate suggests the mock exam (README exam schedule: "Mock exam"). */
export const MOCK_EXAM_LEAD_DAYS = 14;

/** Suggested mock-exam date: the exam date minus two weeks, as a YYYY-MM-DD calendar date; null with no exam date. */
export function suggestedMockDate(examDate: Date | null): string | null {
  if (!examDate) return null;
  const d = new Date(examDate.getTime() - MOCK_EXAM_LEAD_DAYS * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Rate-limit + "already passed" gate for starting a new REAL attempt (callers pass real attempts only: a mock
 * exam has no cooldown and can never pass). */
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

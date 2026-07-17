import type { CefrLevel } from "@prisma/client";
import type { BankQuestion } from "./question-bank.js";
import { generateQuiz, mulberry32, type QuizWord } from "./quiz.js";

export { mulberry32 };

// Session questions ship the answer to the client (fill-blank feedback needs
// it anyway); results are self-reported — the same trust model the vocab quiz
// always had. Cheat-resistance against yourself is a non-goal.
export type SessionQuestion =
  | { qid: string; type: "mcq"; level: CefrLevel; topic: string; prompt: string; choices: string[]; answerIndex: number }
  | { qid: string; type: "fill_blank"; level: CefrLevel; topic: string; prompt: string; accepted: string[] }
  | { qid: string; type: "true_false"; level: CefrLevel; topic: string; prompt: string; answer: boolean };

const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

/**
 * Difficulty adapts to recent scores: struggling keeps you on the active
 * level with some review; strong scores pull questions from the next level.
 */
export function pickLevelMix(
  activeLevel: CefrLevel,
  recentPercents: number[],
): Record<CefrLevel, number> {
  const idx = LEVELS.indexOf(activeLevel);
  const below = idx > 0 ? LEVELS[idx - 1] : null;
  const above = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  const mix: Record<CefrLevel, number> = { a1: 0, a2: 0, b1: 0 };
  const avg =
    recentPercents.length === 0
      ? 0
      : recentPercents.reduce((a, b) => a + b, 0) / recentPercents.length;

  let active: number;
  let belowShare: number;
  let aboveShare: number;
  if (recentPercents.length === 0 || avg < 60) {
    [active, belowShare, aboveShare] = [0.8, 0.2, 0];
  } else if (avg <= 85) {
    [active, belowShare, aboveShare] = [0.7, 0.1, 0.2];
  } else {
    [active, belowShare, aboveShare] = [0.5, 0, 0.5];
  }
  // redistribute shares that have no level to land on (a1 has no below,
  // b1 has no above)
  if (!below) {
    active += belowShare;
    belowShare = 0;
  }
  if (!above) {
    active += aboveShare;
    aboveShare = 0;
  }
  mix[activeLevel] = active;
  if (below) mix[below] = belowShare;
  if (above) mix[above] = aboveShare;
  return mix;
}

/** Tolerant answer comparison: case, spacing, punctuation, umlaut spellings. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[.,!?;:'"„"»«]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerAccepted(input: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(input);
  return accepted.some((a) => normalizeAnswer(a) === normalized);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const toSession = (q: BankQuestion): SessionQuestion =>
  q.type === "mcq"
    ? { qid: q.id, type: "mcq", level: q.level, topic: q.topic, prompt: q.prompt, choices: q.choices, answerIndex: q.answerIndex }
    : q.type === "fill_blank"
      ? { qid: q.id, type: "fill_blank", level: q.level, topic: q.topic, prompt: q.prompt, accepted: q.accepted }
      : { qid: q.id, type: "true_false", level: q.level, topic: q.topic, prompt: q.prompt, answer: q.answer };

/**
 * Build a mixed test session: bank questions sampled by the adaptive level
 * mix (excluding recently asked ids), topped up with questions generated from
 * the user's own vocabulary. Choices only ever expose meanings/headwords —
 * never IPA or grammar metadata. No duplicate question or underlying word
 * within a session.
 */
export function buildSession(input: {
  bank: BankQuestion[];
  words: QuizWord[];
  activeLevel: CefrLevel;
  recentPercents: number[];
  excludeIds: Set<string>;
  size: number;
  rng?: () => number;
}): SessionQuestion[] {
  const rng = input.rng ?? Math.random;
  const mix = pickLevelMix(input.activeLevel, input.recentPercents);

  // vocab questions get ~a third of the session when words exist
  const vocabTarget = input.words.length >= 4 ? Math.round(input.size / 3) : 0;
  const bankTarget = input.size - vocabTarget;

  const fresh = input.bank.filter((q) => !input.excludeIds.has(q.id));
  const byLevel = (lvl: CefrLevel) => shuffle(fresh.filter((q) => q.level === lvl), rng);
  const picked: BankQuestion[] = [];
  const pickedIds = new Set<string>();
  for (const lvl of LEVELS) {
    const want = Math.round(bankTarget * mix[lvl]);
    for (const q of byLevel(lvl).slice(0, want)) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  }
  // top up bank shortfall (small levels, heavy exclusions) from any fresh level
  for (const q of shuffle(fresh, rng)) {
    if (picked.length >= bankTarget) break;
    if (!pickedIds.has(q.id)) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  // vocab questions: alternate mcq / fill_blank / true_false over distinct words
  const vocab: SessionQuestion[] = [];
  if (vocabTarget > 0) {
    const mcqs = generateQuiz(input.words, { size: input.words.length, direction: "de_to_meaning", rng });
    const usedWords = new Set<string>();
    const meanings = [...new Set(input.words.map((w) => w.meaning))];
    let i = 0;
    for (const q of mcqs) {
      if (vocab.length >= vocabTarget) break;
      const word = input.words.find((w) => w.id === q.wordId);
      if (!word || usedWords.has(word.id)) continue;
      usedWords.add(word.id);
      const kind = i++ % 3;
      if (kind === 0) {
        vocab.push({ qid: `w:${word.id}:mcq`, type: "mcq", level: input.activeLevel, topic: "vocabulary", prompt: `What does „${word.headword}" mean?`, choices: q.choices, answerIndex: q.answerIndex });
      } else if (kind === 1) {
        vocab.push({ qid: `w:${word.id}:fb`, type: "fill_blank", level: input.activeLevel, topic: "vocabulary", prompt: `Type the German word for "${word.meaning}": ___`, accepted: [word.headword] });
      } else {
        const correct = rng() < 0.5;
        const wrong = shuffle(meanings.filter((m) => m !== word.meaning), rng)[0];
        const shown = correct || wrong === undefined ? word.meaning : wrong;
        vocab.push({ qid: `w:${word.id}:tf`, type: "true_false", level: input.activeLevel, topic: "vocabulary", prompt: `„${word.headword}" means "${shown}".`, answer: shown === word.meaning });
      }
    }
  }

  const session = shuffle([...picked.map(toSession), ...vocab], rng).slice(0, input.size);
  return session;
}

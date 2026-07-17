export interface QuizWord {
  id: string;
  headword: string;
  meaning: string;
  lesson: string | null;
}

export type QuizDirection = "de_to_meaning" | "meaning_to_de";

export interface QuizQuestion {
  wordId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export const QUIZ_CHOICES = 4;

/** Deterministic PRNG for tests; Math.random-compatible output in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const answerText = (w: QuizWord, direction: QuizDirection) =>
  direction === "de_to_meaning" ? w.meaning : w.headword;
const promptText = (w: QuizWord, direction: QuizDirection) =>
  direction === "de_to_meaning" ? w.headword : w.meaning;

/**
 * Build a multiple-choice quiz from the user's own words. Distractors prefer
 * words from the same lesson, topping up from the whole pool; all four choice
 * texts are distinct. Words whose answer-side text collides are deduped, so
 * callers should guard on >= QUIZ_CHOICES distinct answers (the route returns
 * a 400 otherwise). Never touches SRS state — self-tests are independent.
 */
export function generateQuiz(
  words: QuizWord[],
  opts: { size: number; direction: QuizDirection; rng?: () => number },
): QuizQuestion[] {
  const rng = opts.rng ?? Math.random;
  const { direction } = opts;

  const seen = new Set<string>();
  const pool: QuizWord[] = [];
  for (const w of words) {
    const text = answerText(w, direction);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    pool.push(w);
  }
  if (pool.length < QUIZ_CHOICES) return [];

  const prompts = shuffle(pool, rng).slice(0, Math.min(opts.size, pool.length));

  return prompts.map((word) => {
    const others = pool.filter((w) => w.id !== word.id);
    const sameLesson = others.filter((w) => w.lesson !== null && w.lesson === word.lesson);
    const rest = others.filter((w) => !(w.lesson !== null && w.lesson === word.lesson));
    const distractors = [...shuffle(sameLesson, rng), ...shuffle(rest, rng)]
      .slice(0, QUIZ_CHOICES - 1)
      .map((w) => answerText(w, direction));

    const choices = shuffle([answerText(word, direction), ...distractors], rng);
    return {
      wordId: word.id,
      prompt: promptText(word, direction),
      choices,
      answerIndex: choices.indexOf(answerText(word, direction)),
    };
  });
}

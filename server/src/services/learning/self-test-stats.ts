import type { Strength } from "../vocab/classify.js";
import { mulberry32 } from "./quiz.js";

export type Article = "der" | "die" | "das";
export const ARTICLES: Article[] = ["der", "die", "das"];

export interface TypeTally {
  type: "mcq" | "fill_blank" | "true_false";
  correct: number;
  total: number;
}

export interface SelfTestScore {
  percent: number | null;
  /** Answers (or, for the drill kinds, tests) the percent is based on. */
  count: number;
}

export interface SelfTestScores {
  multipleChoice: SelfTestScore;
  fillIn: SelfTestScore;
  genderDrill: SelfTestScore;
  listenType: SelfTestScore;
}

const pct = (correct: number, total: number): number | null => (total === 0 ? null : Math.round((correct / total) * 100));

/**
 * The four Checkpoint self-test tiles (README §4: Multiple choice · Fill-in-the-blank · Gender drill · Listen &
 * type). Multiple choice and Fill-in come from the per-question-type tallies of mixed/checkpoint tests; the drill
 * kinds are their own tests' scores. Pass the recent results you want counted (the route uses the last 20).
 */
export function selfTestScores(
  results: { kind: string; score: number; total: number; typeBreakdown: unknown }[],
): SelfTestScores {
  const tally = { mcq: [0, 0], fill_blank: [0, 0] } as Record<"mcq" | "fill_blank", [number, number]>;
  const kinds = { gender_drill: [0, 0, 0], listen_type: [0, 0, 0] } as Record<string, [number, number, number]>;
  for (const r of results) {
    if (Array.isArray(r.typeBreakdown)) {
      for (const t of r.typeBreakdown as TypeTally[]) {
        if (t.type === "mcq" || t.type === "fill_blank") {
          tally[t.type][0] += t.correct;
          tally[t.type][1] += t.total;
        }
      }
    }
    const k = kinds[r.kind];
    if (k) {
      k[0] += r.score;
      k[1] += r.total;
      k[2] += 1;
    }
  }
  return {
    multipleChoice: { percent: pct(tally.mcq[0], tally.mcq[1]), count: tally.mcq[1] },
    fillIn: { percent: pct(tally.fill_blank[0], tally.fill_blank[1]), count: tally.fill_blank[1] },
    genderDrill: { percent: pct(kinds.gender_drill![0], kinds.gender_drill![1]), count: kinds.gender_drill![2] },
    listenType: { percent: pct(kinds.listen_type![0], kinds.listen_type![1]), count: kinds.listen_type![2] },
  };
}

export interface DrillAnswer {
  wordId: string;
  article: Article;
  picked: Article;
}

export interface ArticleAccuracy {
  byArticle: Record<Article, { correct: number; total: number; percent: number | null }>;
  /** Lowest-accuracy article with any answers ("You miss das most often"); null with no answers. */
  mostMissed: Article | null;
  /** Of the most-missed article's last 20 answers, how many were wrong ("9 of the last 20 were wrong"). */
  recentWrong: { wrong: number; of: number } | null;
}

/** Article accuracy from gender-drill answers, oldest first (as stored across results in takenAt order). */
export function articleAccuracy(answers: DrillAnswer[]): ArticleAccuracy {
  const byArticle = Object.fromEntries(
    ARTICLES.map((a) => {
      const mine = answers.filter((x) => x.article === a);
      const correct = mine.filter((x) => x.picked === a).length;
      return [a, { correct, total: mine.length, percent: pct(correct, mine.length) }];
    }),
  ) as ArticleAccuracy["byArticle"];

  const answered = ARTICLES.filter((a) => byArticle[a].total > 0);
  if (answered.length === 0) return { byArticle, mostMissed: null, recentWrong: null };
  const mostMissed = answered.reduce((worst, a) => (byArticle[a].percent! < byArticle[worst].percent! ? a : worst));
  const recent = answers.filter((x) => x.article === mostMissed).slice(-20);
  return { byArticle, mostMissed, recentWrong: { wrong: recent.filter((x) => x.picked !== mostMissed).length, of: recent.length } };
}

/**
 * Words for a gender drill (Stats "Drill the shaky ones" / Words "Drill now"): nouns with a known article, weakest
 * first (strength 1–2, then never-reviewed, then the rest), shuffled within each band so repeated drills vary.
 */
export function pickGenderDrill<T extends { id: string; genus: Article | null; strength: Strength }>(
  words: T[],
  size: number,
  seed: number = Date.now(),
): (T & { genus: Article })[] {
  const rng = mulberry32(seed);
  const band = (s: Strength) => (s === 1 || s === 2 ? 0 : s === 0 ? 1 : 2);
  return words
    .filter((w): w is T & { genus: Article } => w.genus !== null)
    .map((w) => ({ w, band: band(w.strength), r: rng() }))
    .sort((a, b) => a.band - b.band || a.r - b.r)
    .slice(0, size)
    .map((x) => x.w);
}

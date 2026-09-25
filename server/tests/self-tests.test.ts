import { describe, expect, it } from "vitest";
import { checkpointBank, BANK_TOPIC_STATION } from "../src/services/learning/checkpoint.js";
import { QUESTION_BANK, type BankQuestion } from "../src/services/learning/question-bank.js";
import { articleAccuracy, pickGenderDrill, selfTestScores, type DrillAnswer } from "../src/services/learning/self-test-stats.js";
import { deriveStations, checkpointStations, type StationItem } from "../src/services/learning/stations.js";
import { DEFAULT_SYLLABUS_ITEMS } from "../src/services/learning/syllabus-defaults.js";

const q = (id: string, level: BankQuestion["level"], topic: string): BankQuestion => ({ id, level, topic, skill: "grammar", type: "true_false", prompt: "?", answer: true });

describe("BANK_TOPIC_STATION", () => {
  it("maps every authored bank topic to a real station theme of its level", () => {
    const themes = new Set(DEFAULT_SYLLABUS_ITEMS.map((i) => `${i.level}:${i.theme}`));
    for (const question of QUESTION_BANK) {
      const theme = BANK_TOPIC_STATION[`${question.level}:${question.topic}`];
      expect(theme, `${question.level}:${question.topic}`).toBeDefined();
      expect(themes.has(`${question.level}:${theme}`), `${question.level}:${theme}`).toBe(true);
    }
  });
});

describe("checkpointBank", () => {
  const items: StationItem[] = DEFAULT_SYLLABUS_ITEMS.map((i, n) => ({ id: `s${n}`, level: i.level, theme: i.theme, sortOrder: n, masteryState: "not_started", skippedAt: null }));
  const a2 = deriveStations(items, "a2");

  it("takes only the checkpoint's stations' questions when there are enough", () => {
    const bank = [q("1", "a2", "dativ"), q("2", "a2", "perfekt"), q("3", "a2", "wohnen"), q("4", "a1", "akkusativ")];
    const r = checkpointBank(bank, checkpointStations(a2, 1), "a2", 2);
    expect(r.questions.map((x) => x.id)).toEqual(["1", "2"]);
    expect(r.scoped).toBe(2);
  });

  it("tops up from the same level (never another) when the stations have too few questions", () => {
    const bank = [q("1", "a2", "dativ"), q("2", "a2", "wohnen"), q("3", "a1", "akkusativ")];
    const r = checkpointBank(bank, checkpointStations(a2, 1), "a2", 5);
    expect(r.questions.map((x) => x.id)).toEqual(["1", "2"]);
    expect(r.scoped).toBe(1);
  });
});

describe("selfTestScores", () => {
  it("combines per-type tallies across tests and averages the drill kinds", () => {
    const scores = selfTestScores([
      { kind: "mixed", score: 7, total: 10, typeBreakdown: [{ type: "mcq", correct: 4, total: 5 }, { type: "fill_blank", correct: 3, total: 5 }] },
      { kind: "checkpoint", score: 3, total: 5, typeBreakdown: [{ type: "mcq", correct: 1, total: 5 }] },
      { kind: "gender_drill", score: 4, total: 6, typeBreakdown: null },
      { kind: "gender_drill", score: 6, total: 6, typeBreakdown: null },
    ]);
    expect(scores.multipleChoice).toEqual({ percent: 50, count: 10 });
    expect(scores.fillIn).toEqual({ percent: 60, count: 5 });
    expect(scores.genderDrill).toEqual({ percent: 83, count: 2 });
    expect(scores.listenType).toEqual({ percent: null, count: 0 });
  });
});

describe("articleAccuracy", () => {
  const a = (article: DrillAnswer["article"], picked: DrillAnswer["picked"]): DrillAnswer => ({ wordId: "w", article, picked });

  it("computes per-article accuracy and the most-missed article's recent wrong count", () => {
    const answers = [a("der", "der"), a("der", "der"), a("die", "die"), a("die", "der"), a("das", "die"), a("das", "das"), a("das", "der")];
    const r = articleAccuracy(answers);
    expect(r.byArticle.der).toEqual({ correct: 2, total: 2, percent: 100 });
    expect(r.byArticle.das.percent).toBe(33);
    expect(r.mostMissed).toBe("das");
    expect(r.recentWrong).toEqual({ wrong: 2, of: 3 });
  });

  it("only looks at the last 20 answers for the recent count", () => {
    const answers = [...Array.from({ length: 10 }, () => a("das", "der")), ...Array.from({ length: 20 }, () => a("das", "das"))];
    expect(articleAccuracy(answers).recentWrong).toEqual({ wrong: 0, of: 20 });
  });

  it("is empty with no answers", () => {
    expect(articleAccuracy([])).toMatchObject({ mostMissed: null, recentWrong: null });
  });
});

describe("pickGenderDrill", () => {
  it("drills nouns only, shaky first, then never-reviewed, then the rest", () => {
    const words = [
      { id: "solid", genus: "der" as const, strength: 5 as const },
      { id: "verb", genus: null, strength: 1 as const },
      { id: "new", genus: "das" as const, strength: 0 as const },
      { id: "shaky", genus: "die" as const, strength: 2 as const },
    ];
    expect(pickGenderDrill(words, 3, 1).map((w) => w.id)).toEqual(["shaky", "new", "solid"]);
    expect(pickGenderDrill(words, 1, 1).map((w) => w.id)).toEqual(["shaky"]);
  });
});

describe("exam-prep syllabus items", () => {
  it("are self_check activities with their own three checks", async () => {
    const { DEFAULT_SYLLABUS_ITEMS: items, syllabusItemSeed: seed } = await import("../src/services/learning/syllabus-defaults.js");
    const prep = items.filter((i) => i.theme === "Exam prep");
    expect(prep).toHaveLength(6);
    for (const item of prep) {
      const s = seed(item);
      expect(s.exerciseType).toBe("self_check");
      expect(s.exerciseOptions && "checks" in s.exerciseOptions ? s.exerciseOptions.checks : []).toHaveLength(3);
    }
    // everything else keeps its own exercise type (no stray self-checks)
    expect(items.filter((i) => i.theme !== "Exam prep").every((i) => seed(i).exerciseType !== "self_check")).toBe(true);
  });
});

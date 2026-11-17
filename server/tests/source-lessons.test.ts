import { describe, expect, it } from "vitest";
import { parseKnowledges } from "../src/services/learning/nicosweg.js";
import {
  defaultUnitMinutes,
  lessonTitle,
  nextUnit,
  planSourceLessons,
  scheduleLessons,
  unitMinutes,
} from "../src/services/learning/source-lessons.js";
import { DEFAULT_SYLLABUS_ITEMS } from "../src/services/learning/syllabus-defaults.js";
import { lessonTeaches, matchGrammarPoint } from "../src/services/learning/topic-match.js";

const topics = DEFAULT_SYLLABUS_ITEMS.map((t, i) => ({
  id: `t${i}`,
  level: t.level,
  title: t.title,
  theme: t.theme ?? null,
  description: t.description ?? null,
  category: t.category,
}));
const match = (point: string, level = "a1") => matchGrammarPoint(point, topics, level).map((t) => t.title);

describe("matchGrammarPoint (real Nicos Weg A1 grammar tags)", () => {
  it("maps DW's wording onto the syllabus topic", () => {
    expect(match("Conjugation: present tense (2)")).toEqual(["Regular conjugation"]);
    expect(match("Conjugation: haben")).toEqual(["sein & haben"]);
    expect(match("Conjugation: sprechen")).toEqual(["Stem-changing verbs"]);
    expect(match("Vowel change: e to i")).toEqual(["Stem-changing verbs"]);
    expect(match("Simple past: sein")).toEqual(["war & hatte"]);
    expect(match("Personal pronouns: er, sie")).toEqual(["Personal pronouns"]);
    expect(match("Personal pronouns: accusative")).toEqual(["Accusative pronouns"]);
    expect(match("Articles: indefinite")).toEqual(["Indefinite articles: ein / eine"]);
    expect(match("The formal imperative")).toEqual(["Sie-imperative"]);
    expect(match("Imperative: informal")).toEqual(["du- and ihr-imperative"]);
    expect(match('Present perfect with "sein"')).toEqual(["Perfekt with sein"]);
    expect(match("Multi-part predicates")).toEqual(["The sentence bracket"]);
  });
  it("stays within one level above the source", () => {
    expect(match("Adjective declension (1)")).toEqual(["After definite articles", "After indefinite articles"]);
    expect(match("gehen + infinitive")).toEqual([]);
  });
  it("never pairs opposites, and gives up on three-way ties", () => {
    expect(match("Past participles: regular")).not.toContain("Irregular participles");
    expect(match("Two-case prepositions (1)")).toEqual([]);
    expect(match("Numbers from 20 to 100")).toEqual([]);
  });
  it("collects a lesson's matched topics once, dropping DW's (n) counters", () => {
    const t = lessonTeaches(
      { grammarPoints: ["Conjugation: present tense (2)", "Conjugation: haben", "Personal pronouns: er, sie", "Personal pronouns: plural"], culturePoints: ["Communication at offices and agencies"], vocabCount: 24 },
      topics,
      "a1",
    );
    expect(t.grammar[0]!.point).toBe("Conjugation: present tense");
    expect(t.topicIds.map((id) => topics.find((x) => x.id === id)!.title)).toEqual(["Regular conjugation", "sein & haben", "Personal pronouns"]);
    expect(t.vocabCount).toBe(24);
  });
});

describe("parseKnowledges", () => {
  it("splits DW knowledge items into grammar, culture and a vocab count", () => {
    expect(
      parseKnowledges([
        { name: "die Arbeit ", knowledgeType: "VOCABULARY" },
        { name: " Conjugation:  haben", knowledgeType: "GRAMMAR" },
        { name: "Conjugation: haben", knowledgeType: "GRAMMAR" },
        { name: "Communication at offices", knowledgeType: "REGIONAL_STUDIES" },
        { name: "sein", knowledgeType: "VOCABULARY" },
      ]),
    ).toEqual({ grammarPoints: ["Conjugation: haben"], culturePoints: ["Communication at offices"], vocabCount: 2 });
    expect(parseKnowledges(undefined)).toEqual({ grammarPoints: [], culturePoints: [], vocabCount: null });
  });
});

describe("source lessons on the ticket", () => {
  const unit = (id: string, position: number, done = false) => ({ id, position, completedAt: done ? new Date() : null });
  const sources = [
    { id: "nw", dailyLesson: true, units: [unit("n1", 0, true), unit("n3", 2), unit("n2", 1)] },
    { id: "yt", dailyLesson: true, units: [unit("y1", 0)] },
    { id: "book", dailyLesson: false, units: [unit("b1", 0)] },
    { id: "finished", dailyLesson: true, units: [unit("f1", 0, true)] },
  ];
  const none = new Set<string>();

  it("takes each active source's next unfinished lesson", () => {
    expect(nextUnit(sources[0]!.units)?.id).toBe("n2");
    expect(planSourceLessons({ sources, restDay: false, onTodaySourceIds: none, openSourceIds: none })).toEqual([
      { sourceId: "nw", unitId: "n2" },
      { sourceId: "yt", unitId: "y1" },
    ]);
  });
  it("skips sources already on today or with a lesson rolling over, and rest days", () => {
    expect(planSourceLessons({ sources, restDay: false, onTodaySourceIds: new Set(["nw"]), openSourceIds: new Set(["yt"]) })).toEqual([]);
    expect(planSourceLessons({ sources, restDay: true, onTodaySourceIds: none, openSourceIds: none })).toEqual([]);
  });
  it("budgets by type unless the source sets its own minutes", () => {
    expect(defaultUnitMinutes("course", "lessons")).toBe(25);
    expect(defaultUnitMinutes("youtube", "episodes")).toBe(15);
    expect(defaultUnitMinutes("book", "pages")).toBe(10);
    expect(unitMinutes({ type: "course", unitLabel: "lessons", minutesPerUnit: 40 })).toBe(40);
  });
  it("titles lessons with their number unless they carry one", () => {
    expect(lessonTitle("Nicos Weg", { position: 7, title: "Nico hat ein Problem" })).toBe("Nicos Weg · 8. Nico hat ein Problem");
    expect(lessonTitle("Menschen", { position: 2, title: "Lesson 3" })).toBe("Menschen · Lesson 3");
  });
  it("schedules one lesson per study day, from tomorrow once today's is done", () => {
    const weekdays = [true, true, true, true, true, false, false]; // Mon–Fri
    const fri = new Date("2026-11-20T00:00:00Z");
    expect(scheduleLessons({ remaining: 3, today: fri, studyDays: weekdays, doneToday: false })).toEqual(["2026-11-20", "2026-11-23", "2026-11-24"]);
    expect(scheduleLessons({ remaining: 2, today: fri, studyDays: weekdays, doneToday: true })).toEqual(["2026-11-23", "2026-11-24"]);
    expect(scheduleLessons({ remaining: 2, today: fri, studyDays: Array(7).fill(false), doneToday: false })).toEqual([]);
  });
});

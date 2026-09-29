import { describe, expect, it } from "vitest";
import { blockedTopicIds } from "../src/services/learning/prerequisites.js";

type T = Parameters<typeof blockedTopicIds>[0][number];
const t = (
  id: string,
  level: string,
  sortOrder: number,
  masteryState: T["masteryState"],
  category: T["category"] = "grammar",
  theme: string | null = "Verbs",
  skippedAt: Date | null = null,
): T => ({ id, level, sortOrder, masteryState, category, theme, skippedAt });

describe("blockedTopicIds", () => {
  it("blocks every topic after the first unpassed one in a line", () => {
    const topics = [t("a", "a1", 1, "passed"), t("b", "a1", 2, "learning"), t("c", "a1", 3, "not_started"), t("d", "a1", 4, "mastered")];
    expect([...blockedTopicIds(topics)].sort()).toEqual(["c", "d"]);
  });

  it("orders by sortOrder, not input order", () => {
    const topics = [t("late", "a1", 5, "not_started"), t("early", "a1", 1, "not_started")];
    expect([...blockedTopicIds(topics)]).toEqual(["late"]);
  });

  it("evaluates each level independently", () => {
    const topics = [t("a1-1", "a1", 1, "not_started"), t("a1-2", "a1", 2, "not_started"), t("a2-1", "a2", 1, "not_started")];
    expect([...blockedTopicIds(topics)]).toEqual(["a1-2"]);
  });

  it("blocks nothing when everything before is passed or mastered, or there's nothing", () => {
    expect(blockedTopicIds([t("a", "b1", 1, "passed"), t("b", "b1", 2, "mastered"), t("c", "b1", 3, "not_started")]).size).toBe(0);
    expect(blockedTopicIds([]).size).toBe(0);
  });

  it("runs grammar, vocab and skills as independent lines", () => {
    const topics = [
      t("g1", "a1", 1, "learning", "grammar", "Verbs"),
      t("g2", "a1", 2, "not_started", "grammar", "Nouns"),
      t("v1", "a1", 3, "not_started", "vocab_theme", "Personal world"),
      t("v2", "a1", 4, "not_started", "vocab_theme", "Personal world"),
      t("s1", "a1", 5, "not_started", "skill", "Speaking"),
      t("s2", "a1", 6, "not_started", "skill", "Writing"),
      t("x1", "a1", 7, "not_started", "skill", "Exam prep"),
    ];
    expect([...blockedTopicIds(topics)].sort()).toEqual(["g2", "s2", "v2", "x1"]);
  });

  it("counts skipped topics as done", () => {
    const topics = [t("a", "a1", 1, "not_started", "grammar", "Verbs", new Date()), t("b", "a1", 2, "not_started")];
    expect(blockedTopicIds(topics).size).toBe(0);
  });

  it("opens the gate station only once the rest of the level is done", () => {
    const rest = [t("g1", "a1", 1, "passed", "grammar", "Verbs"), t("s1", "a1", 2, "learning", "skill", "Speaking")];
    const gate = [t("x1", "a1", 3, "not_started", "skill", "Exam prep"), t("x2", "a1", 4, "not_started", "skill", "Exam prep")];
    expect([...blockedTopicIds([...rest, ...gate])].sort()).toEqual(["x1", "x2"]);

    const restDone = [rest[0]!, { ...rest[1]!, masteryState: "passed" as const }];
    expect([...blockedTopicIds([...restDone, ...gate])]).toEqual(["x2"]);
  });
});

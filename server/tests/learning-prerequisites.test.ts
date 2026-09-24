import { describe, expect, it } from "vitest";
import { blockedTopicIds } from "../src/services/learning/prerequisites.js";

type T = Parameters<typeof blockedTopicIds>[0][number];
const t = (id: string, level: string, sortOrder: number, masteryState: T["masteryState"]): T => ({ id, level, sortOrder, masteryState });

describe("blockedTopicIds", () => {
  it("blocks every topic after the first unpassed one in a level", () => {
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
});

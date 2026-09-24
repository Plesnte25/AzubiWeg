import { describe, expect, it } from "vitest";
import { addDaysKey, mondayKey, weeklyGoal } from "../src/services/learning/weekly-goal.js";
import { pickWeakSpot } from "../src/services/learning/weak-spot.js";

describe("weeklyGoal", () => {
  it("finds the Monday of a week, across month ends", () => {
    expect(mondayKey("2026-09-24")).toBe("2026-09-21"); // Thursday
    expect(mondayKey("2026-09-21")).toBe("2026-09-21");
    expect(mondayKey("2026-11-01")).toBe("2026-10-26"); // Sunday
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("totals Monday–Sunday Lernzeit against capacity × 6 and tags each day", () => {
    const minutes = new Map([
      ["2026-09-20", 99], // previous Sunday: outside the week
      ["2026-09-21", 30],
      ["2026-09-23", 20],
      ["2026-09-24", 10],
    ]);
    const g = weeklyGoal(20, minutes, "2026-09-24");
    expect(g).toMatchObject({ goalMinutes: 120, minutes: 60, percent: 50 });
    expect(g.days.map((d) => d.status)).toEqual(["past", "past", "past", "today", "future", "future", "future"]);
    expect(g.days[0]).toEqual({ date: "2026-09-21", minutes: 30, status: "past" });
  });

  it("caps the ring percent at 100", () => {
    expect(weeklyGoal(5, new Map([["2026-09-24", 100]]), "2026-09-24").percent).toBe(100);
  });
});

describe("pickWeakSpot", () => {
  it("picks the weakest topic with enough answers and labels it with its station", () => {
    const spot = pickWeakSpot(
      [
        { topic: "dativ", level: "a2", correct: 3, total: 6 },
        { topic: "perfekt", level: "a2", correct: 0, total: 2 }, // too few answers
        { topic: "komparativ", level: "a2", correct: 4, total: 5 },
      ],
      [],
    );
    expect(spot).toEqual({ source: "self_test", label: "Dative case", topic: "dativ", level: "a2", percent: 50, answered: 6 });
  });

  it("falls back to the top mistake category, then to nothing", () => {
    expect(pickWeakSpot([], [{ category: "gender_article", count: 4, topics: ["Nouns"] }])).toMatchObject({ source: "mistakes", label: "Articles (der/die/das)", count: 4 });
    expect(pickWeakSpot([{ topic: "dativ", level: "a2", correct: 5, total: 5 }], [])).toBeNull();
  });
});

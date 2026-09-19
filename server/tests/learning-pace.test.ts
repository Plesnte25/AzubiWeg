import { describe, expect, it } from "vitest";
import { computeGoalFeasibility, computeRoadmapPace, computeRoutePace } from "../src/services/learning/pace.js";

describe("computeRoadmapPace", () => {
  it("computes planned/actual tasks per day and days left", () => {
    const pace = computeRoadmapPace({ totalDays: 100, totalTasks: 200, tasksDone: 20, daysElapsed: 10 });
    expect(pace.plannedTasksPerDay).toBe(2);
    expect(pace.actualTasksPerDay).toBe(2);
    expect(pace.daysLeft).toBe(90);
  });
});

describe("computeRoutePace", () => {
  it("projects a finish date from recent (last 4 weeks) velocity", () => {
    const today = new Date("2026-08-01T00:00:00Z");
    const pace = computeRoutePace({
      remainingItems: 20,
      recentCompletions: [
        new Date("2026-07-25T00:00:00Z"),
        new Date("2026-07-18T00:00:00Z"),
        new Date("2026-07-11T00:00:00Z"),
        new Date("2026-07-04T00:00:00Z"),
      ], // 4 completions across 4 weeks = 1/week
      examTargetDate: null,
      today,
    });
    expect(pace.itemsPerWeek).toBe(1);
    expect(pace.projectedFinishDate).toBe("2026-12-19"); // 20 weeks out from today
  });

  it("returns null projected finish with no recent completions", () => {
    const pace = computeRoutePace({ remainingItems: 5, recentCompletions: [], examTargetDate: null, today: new Date() });
    expect(pace.projectedFinishDate).toBeNull();
    expect(pace.weeksBehindPace).toBeNull();
  });
});

describe("computeGoalFeasibility", () => {
  it("returns nulls when there is no exam target date", () => {
    const f = computeGoalFeasibility({ remainingItems: 20, examTargetDate: null, studyCapacityMinutes: 45, today: new Date() });
    expect(f.requiredItemsPerWeek).toBeNull();
    expect(f.requiredMinutesPerWeek).toBeNull();
    expect(f.verdict).toBeNull();
    expect(f.sustainableItemsPerWeek).toBeGreaterThan(0);
  });

  it("returns nulls when there are no remaining items (nothing left to pace)", () => {
    const f = computeGoalFeasibility({
      remainingItems: 0,
      examTargetDate: new Date("2026-12-01T00:00:00Z"),
      studyCapacityMinutes: 45,
      today: new Date("2026-08-01T00:00:00Z"),
    });
    expect(f.verdict).toBeNull();
  });

  it("marks 'unrealistic' when the exam date has already passed with items remaining", () => {
    const f = computeGoalFeasibility({
      remainingItems: 10,
      examTargetDate: new Date("2026-07-01T00:00:00Z"),
      studyCapacityMinutes: 45,
      today: new Date("2026-08-01T00:00:00Z"),
    });
    expect(f.verdict).toBe("unrealistic");
    expect(f.requiredItemsPerWeek).toBe(10);
  });

  it("marks 'on_track' when required pace is within sustainable capacity", () => {
    // 45 min/day capacity / 10 min per item = 31.5 items/week sustainable
    const f = computeGoalFeasibility({
      remainingItems: 10,
      examTargetDate: new Date("2026-09-05T00:00:00Z"), // ~5 weeks out
      studyCapacityMinutes: 45,
      today: new Date("2026-08-01T00:00:00Z"),
    });
    expect(f.verdict).toBe("on_track");
    expect(f.requiredItemsPerWeek).toBeCloseTo(2, 0);
  });

  it("marks 'tight' or 'unrealistic' when required pace exceeds low capacity", () => {
    // 5 min/day capacity / 10 min per item = 3.5 items/week sustainable
    const f = computeGoalFeasibility({
      remainingItems: 40,
      examTargetDate: new Date("2026-08-15T00:00:00Z"), // 2 weeks out -> 20 items/week required
      studyCapacityMinutes: 5,
      today: new Date("2026-08-01T00:00:00Z"),
    });
    expect(f.verdict).toBe("unrealistic");
  });
});

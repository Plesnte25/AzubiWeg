import { describe, expect, it } from "vitest";
import { planTicket, projectDates, queueOrder, type QueueTopic } from "../src/services/learning/ticket.js";

const g = (id: string, sortOrder: number): QueueTopic => ({ id, category: "grammar", sortOrder });
const v = (id: string, sortOrder: number): QueueTopic => ({ id, category: "vocab_theme", sortOrder });
const s = (id: string, sortOrder: number): QueueTopic => ({ id, category: "skill", sortOrder });

describe("queueOrder", () => {
  it("takes one topic per line, grammar → vocab → skills, then the rest by syllabus order", () => {
    expect(queueOrder([s("s1", 60), v("v1", 31), g("g1", 3), s("x1", 59)]).map((t) => t.id)).toEqual(["g1", "v1", "x1", "s1"]);
  });

  it("skips lines with nothing open", () => {
    expect(queueOrder([s("s1", 60), g("g1", 3)]).map((t) => t.id)).toEqual(["g1", "s1"]);
    expect(queueOrder([])).toEqual([]);
  });
});

describe("planTicket", () => {
  const open = [g("g1", 1), v("v1", 2), s("s1", 3)];

  it("fills the goal from the queue and offers the rest as next", () => {
    expect(planTicket({ open, plannedMinutes: 10, goalMinutes: 30, restDay: false, hasTopicToday: true })).toEqual({ autoTake: ["g1", "v1"], next: "s1" });
  });

  it("takes nothing once the goal is met, but still offers Take another", () => {
    expect(planTicket({ open, plannedMinutes: 45, goalMinutes: 45, restDay: false, hasTopicToday: true })).toEqual({ autoTake: [], next: "g1" });
  });

  it("still takes one new topic when reviews alone fill the goal", () => {
    expect(planTicket({ open, plannedMinutes: 53, goalMinutes: 45, restDay: false, hasTopicToday: false })).toEqual({ autoTake: ["g1"], next: "v1" });
  });

  it("never auto-takes on a rest day", () => {
    expect(planTicket({ open, plannedMinutes: 0, goalMinutes: 60, restDay: true, hasTopicToday: false })).toEqual({ autoTake: [], next: "g1" });
  });

  it("has no next once every open topic is taken", () => {
    expect(planTicket({ open, plannedMinutes: 0, goalMinutes: 120, restDay: false, hasTopicToday: true })).toEqual({ autoTake: ["g1", "v1", "s1"], next: null });
    expect(planTicket({ open: [], plannedMinutes: 0, goalMinutes: 60, restDay: false, hasTopicToday: true })).toEqual({ autoTake: [], next: null });
  });
});

describe("projectDates", () => {
  const today = new Date("2026-09-29T00:00:00Z");

  it("takes turns across the lines with work left, one topic per 7 / perWeek days", () => {
    // 2/week → 3.5 days a topic: g1 (3.5), v1 (7), then only grammar is left: g2 (10.5)
    const dates = projectDates({ lines: [["g1", "g2"], ["v1"], []], gate: [], perWeek: 2, today });
    expect([...dates]).toEqual([["g1", "2026-10-03"], ["v1", "2026-10-06"], ["g2", "2026-10-10"]]);
  });

  it("puts the gate after every line is done", () => {
    const dates = projectDates({ lines: [["g1", "g2"], ["v1"]], gate: ["x1"], perWeek: 2, today });
    expect(dates.get("x1")).toBe("2026-10-13"); // day 14
  });

  it("projects nothing without any pace", () => {
    expect(projectDates({ lines: [["s1"]], gate: ["x1"], perWeek: 0, today }).size).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { addDaysUTC, computeBacklog, dayStatus, diffReseed } from "../src/services/learning/roadmap.js";
import type { DefaultRoadmapDay } from "../src/services/learning/roadmap-defaults.js";
import { DEFAULT_ROADMAP_DAYS } from "../src/services/learning/roadmap-defaults.js";

const utcDate = (iso: string) => new Date(iso + "T00:00:00Z");
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("DEFAULT_ROADMAP_DAYS content", () => {
  it("has exactly 182 days (26 weeks) with contiguous 0-based dayOffsets", () => {
    expect(DEFAULT_ROADMAP_DAYS).toHaveLength(182);
    expect(DEFAULT_ROADMAP_DAYS.map((d) => d.dayOffset)).toEqual(
      Array.from({ length: 182 }, (_, i) => i),
    );
  });

  it("Mon/Tue/Wed of regular weeks are empty generated-content placeholders; every other day is hand-authored", () => {
    const milestoneWeeks = new Set([8, 16, 25, 26]);
    for (const day of DEFAULT_ROADMAP_DAYS) {
      const week = Math.floor(day.dayOffset / 7) + 1;
      const dayOfWeek = day.dayOffset % 7; // 0=Mon ... 6=Sun
      const isSyllabusPlaceholder = !milestoneWeeks.has(week) && dayOfWeek <= 2;
      if (isSyllabusPlaceholder) {
        expect(day.tasks).toHaveLength(0);
      } else {
        expect(day.tasks.length).toBeGreaterThan(0);
      }
    }
  });

  it("has a milestone_test task on the last day of weeks 8, 16, 25, and 26", () => {
    const milestoneDayOffsets = [54, 110, 173, 180]; // (week-1)*7 + 5, for weeks 8/16/25/26
    for (const offset of milestoneDayOffsets) {
      const day = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === offset);
      expect(day?.tasks.some((t) => t.type === "milestone_test")).toBe(true);
    }
  });

  it("every task is tagged with a skill (powers the journal filter views)", () => {
    const allTasks = DEFAULT_ROADMAP_DAYS.flatMap((d) => d.tasks);
    expect(allTasks.every((t) => t.skill !== undefined)).toBe(true);
  });

  it("has a Deutschland Context (bureaucracy-skill) task on weeks 2, 5, 10, 14, 18, 20, and 24", () => {
    const weekFridayOffsets = [2, 5, 10, 14, 18, 20, 24].map((week) => (week - 1) * 7 + 4);
    for (const offset of weekFridayOffsets) {
      const day = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === offset);
      expect(day?.tasks.some((t) => t.skill === "bureaucracy" && t.title.startsWith("Deutschland Context:"))).toBe(true);
    }
  });
});

describe("addDaysUTC", () => {
  it("adds whole days ignoring time-of-day, at UTC midnight", () => {
    expect(addDaysUTC(utcDate("2026-07-22"), 0)).toEqual(utcDate("2026-07-22"));
    expect(addDaysUTC(utcDate("2026-07-22"), 10)).toEqual(utcDate("2026-08-01"));
  });

  it("crosses a year boundary correctly", () => {
    expect(addDaysUTC(utcDate("2026-12-30"), 5)).toEqual(utcDate("2027-01-04"));
  });
});

describe("dayStatus", () => {
  const today = local(2026, 7, 16);
  const task = (done: boolean) => ({ completedAt: done ? new Date("2026-07-01T00:00:00Z") : null });

  it("is done once every task on that day is complete, regardless of date", () => {
    expect(dayStatus({ date: utcDate("2026-07-01"), tasks: [task(true), task(true)] }, today)).toBe("done");
  });

  it("is overdue when the date is past and tasks remain incomplete", () => {
    expect(dayStatus({ date: utcDate("2026-07-10"), tasks: [task(false)] }, today)).toBe("overdue");
  });

  it("is today for the current date with incomplete tasks", () => {
    expect(dayStatus({ date: utcDate("2026-07-16"), tasks: [task(false)] }, today)).toBe("today");
  });

  it("is upcoming for a future date", () => {
    expect(dayStatus({ date: utcDate("2026-07-20"), tasks: [task(false)] }, today)).toBe("upcoming");
  });

  it("a day with zero tasks is never considered done", () => {
    expect(dayStatus({ date: utcDate("2026-07-01"), tasks: [] }, today)).toBe("overdue");
  });
});

describe("computeBacklog", () => {
  const today = local(2026, 7, 16);
  const day = (id: string, iso: string, tasks: { id: string; completedAt: Date | null }[]) => ({
    id,
    date: utcDate(iso),
    theme: "Test theme",
    tasks,
  });

  it("only includes past days with at least one incomplete task", () => {
    const days = [
      day("d1", "2026-07-10", [{ id: "t1", completedAt: null }]),
      day("d2", "2026-07-12", [{ id: "t2", completedAt: new Date() }]), // fully done, excluded
      day("d3", "2026-07-16", [{ id: "t3", completedAt: null }]), // today, excluded
      day("d4", "2026-07-20", [{ id: "t4", completedAt: null }]), // future, excluded
    ];
    const backlog = computeBacklog(days, today);
    expect(backlog.map((g) => g.dayId)).toEqual(["d1"]);
    expect(backlog[0].daysOverdue).toBe(6);
  });

  it("orders oldest-overdue first", () => {
    const days = [
      day("recent", "2026-07-15", [{ id: "t1", completedAt: null }]),
      day("old", "2026-07-01", [{ id: "t2", completedAt: null }]),
    ];
    expect(computeBacklog(days, today).map((g) => g.dayId)).toEqual(["old", "recent"]);
  });

  it("only surfaces the incomplete tasks within a partially-done day", () => {
    const days = [
      day("mixed", "2026-07-10", [
        { id: "done", completedAt: new Date() },
        { id: "pending", completedAt: null },
      ]),
    ];
    const [group] = computeBacklog(days, today);
    expect(group.tasks.map((t) => t.id)).toEqual(["pending"]);
  });
});

describe("diffReseed", () => {
  const content: DefaultRoadmapDay[] = [
    { dayOffset: 0, theme: "A", tasks: [{ type: "generic", title: "Task one" }, { type: "vocab", title: "Task two" }] },
    { dayOffset: 1, theme: "B", tasks: [{ type: "generic", title: "Task three" }] },
  ];

  it("carries completions over by (dayOffset, normalized title) match", () => {
    const completedAt = new Date("2026-07-01T00:00:00Z");
    const existing = [
      { dayOffset: 0, tasks: [{ title: "  TASK ONE  ", completedAt }, { title: "Task two", completedAt: null }] },
    ];
    const plan = diffReseed(existing, content);
    expect(plan[0].tasks[0].completedAt).toEqual(completedAt);
    expect(plan[0].tasks[1].completedAt).toBeNull();
  });

  it("leaves tasks incomplete when no matching prior completion exists", () => {
    const plan = diffReseed([], content);
    expect(plan.every((d) => d.tasks.every((t) => t.completedAt === null))).toBe(true);
  });

  it("never carries a completion across a different dayOffset even with the same title", () => {
    const completedAt = new Date("2026-07-01T00:00:00Z");
    const existing = [{ dayOffset: 1, tasks: [{ title: "Task one", completedAt }] }];
    const plan = diffReseed(existing, content);
    expect(plan[0].tasks[0].completedAt).toBeNull(); // dayOffset 0's "Task one" unaffected
  });

  it("uses a syllabus-linked task's own completedAt directly, ignoring title-match entirely", () => {
    const linkedContent: DefaultRoadmapDay[] = [
      {
        dayOffset: 0,
        theme: "A",
        tasks: [{ type: "generic", title: "Grammar: Renamed topic", syllabusItemId: "syl-1", completedAt: new Date("2026-07-05T00:00:00Z") }],
      },
    ];
    // an old row with a completely different title (simulating a rename) and
    // no completion — title-matching would find nothing, but linked tasks
    // don't consult title-matching at all
    const existing = [{ dayOffset: 0, tasks: [{ title: "Grammar: Old topic name", completedAt: null }] }];
    const plan = diffReseed(existing, linkedContent);
    expect(plan[0].tasks[0].completedAt).toEqual(new Date("2026-07-05T00:00:00Z"));
    expect(plan[0].tasks[0].syllabusItemId).toBe("syl-1");
  });

  it("carries skill through reseed (a latent bug this fixes — skill used to be silently dropped)", () => {
    const withSkill: DefaultRoadmapDay[] = [
      { dayOffset: 0, theme: "A", tasks: [{ type: "generic", skill: "writing", title: "Writing: something" }] },
    ];
    const plan = diffReseed([], withSkill);
    expect(plan[0].tasks[0].skill).toBe("writing");
  });
});

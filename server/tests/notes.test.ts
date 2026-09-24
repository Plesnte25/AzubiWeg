import { describe, expect, it } from "vitest";
import { initialNoteCategory } from "../src/services/notes/category.js";
import { dayPlus, nextResurface, resurfaceForCategory } from "../src/services/notes/resurface.js";

describe("initialNoteCategory", () => {
  const base = { skill: null, contextTag: null, applicationId: null };

  it("maps grammar and listening skills", () => {
    expect(initialNoteCategory({ ...base, skill: "grammar" })).toBe("grammar");
    expect(initialNoteCategory({ ...base, skill: "listening" })).toBe("listening");
  });

  it("maps the Jobs capture context or an application link to jobs", () => {
    expect(initialNoteCategory({ ...base, contextTag: "/Jobs" })).toBe("jobs");
    expect(initialNoteCategory({ ...base, applicationId: "app1", skill: "grammar" })).toBe("jobs");
  });

  it("maps self-test mistake notes to mistakes, ahead of any skill", () => {
    expect(initialNoteCategory({ ...base, contextTag: "/Self-tests", skill: "grammar" })).toBe("mistakes");
  });

  it("falls back to everyday", () => {
    expect(initialNoteCategory(base)).toBe("everyday");
    expect(initialNoteCategory({ ...base, skill: "speaking", contextTag: "/Words" })).toBe("everyday");
  });
});

describe("note resurfacing", () => {
  const now = new Date(2026, 8, 24, 15, 30); // local Thu 24 Sept, mid-afternoon
  const day = (d: number) => new Date(Date.UTC(2026, 8, d));

  it("dayPlus lands on UTC midnight of the local calendar day", () => {
    expect(dayPlus(now, 0)).toEqual(day(24));
    expect(dayPlus(now, 14)).toEqual(day(38)); // Date.UTC rolls 38 Sept over to 8 Oct
  });

  it("puts grammar/mistakes notes into rotation from tomorrow, and takes others out", () => {
    expect(resurfaceForCategory("grammar", { resurfaceDueAt: null, resurfaceStep: 0 }, now)).toEqual({ resurfaceDueAt: day(25), resurfaceStep: 0 });
    expect(resurfaceForCategory("jobs", { resurfaceDueAt: day(30), resurfaceStep: 2 }, now)).toEqual({ resurfaceDueAt: null, resurfaceStep: 0 });
  });

  it("keeps the schedule when a note moves between rotating categories", () => {
    const current = { resurfaceDueAt: day(30), resurfaceStep: 2 };
    expect(resurfaceForCategory("mistakes", current, now)).toBe(current);
  });

  it("'again' brings it back tomorrow and restarts the ladder", () => {
    expect(nextResurface({ resurfaceDueAt: day(24), resurfaceStep: 3 }, "again", now)).toEqual({ resurfaceDueAt: day(25), resurfaceStep: 0 });
  });

  it("'known' climbs 14 → 30 → 60 → 120 and stays at 120", () => {
    let s = { resurfaceDueAt: day(24), resurfaceStep: 0 };
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = nextResurface(s, "known", now);
      gaps.push(Math.round((s.resurfaceDueAt!.getTime() - day(24).getTime()) / 86_400_000));
    }
    expect(gaps).toEqual([14, 30, 60, 120, 120]);
  });
});

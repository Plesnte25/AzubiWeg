import { describe, expect, it } from "vitest";
import { schedule } from "../src/services/srs.js";

// The expected values below are real outputs of the obsidian-spaced-repetition
// plugin found in the live vault's master.md (new cards graded once).
describe("SRS scheduling matches the Obsidian plugin", () => {
  const today = new Date(2026, 6, 12); // 2026-07-12

  it("new card graded Easy → interval 4, ease 270 (Apfel, Guten Abend., Guten Morgen.)", () => {
    expect(schedule("easy", null, today)).toEqual({
      due: "2026-07-16",
      interval: 4,
      ease: 270,
    });
  });

  it("new card graded Good → interval 3, ease 250 (Hund)", () => {
    expect(schedule("good", null, today)).toEqual({
      due: "2026-07-15",
      interval: 3,
      ease: 250,
    });
  });

  it("new card graded Hard → interval 1, ease 230 (Baum, Fenster)", () => {
    expect(schedule("hard", null, today)).toEqual({
      due: "2026-07-13",
      interval: 1,
      ease: 230,
    });
  });

  it("mature card graded Good grows by ease factor", () => {
    const prev = { interval: 4, ease: 270, due: new Date(2026, 6, 12) };
    // (4 + 0) * 270/100 = 10.8 → 11
    expect(schedule("good", prev, today)).toEqual({
      due: "2026-07-23",
      interval: 11,
      ease: 270,
    });
  });

  it("overdue review counts the delay (Good: half credit)", () => {
    const prev = { interval: 4, ease: 250, due: new Date(2026, 6, 8) }; // 4 days late
    // (4 + 4/2) * 250/100 = 15
    expect(schedule("good", prev, today)).toEqual({
      due: "2026-07-27",
      interval: 15,
      ease: 250,
    });
  });

  it("ease never drops below 130", () => {
    const prev = { interval: 1, ease: 130, due: new Date(2026, 6, 12) };
    expect(schedule("hard", prev, today).ease).toBe(130);
  });
});

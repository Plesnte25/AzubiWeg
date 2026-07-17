import { describe, expect, it } from "vitest";
import { computeDayStreak, localDateKey } from "../src/services/learning/activity.js";

// local-time instants, matching how the streak reads them
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

const today = local(2026, 7, 16);

describe("localDateKey", () => {
  it("formats the local calendar day with zero padding", () => {
    expect(localDateKey(local(2026, 7, 4, 9))).toBe("2026-07-04");
  });
});

describe("computeDayStreak", () => {
  it("is 0 with no activity", () => {
    expect(computeDayStreak([], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const ts = [local(2026, 7, 16), local(2026, 7, 15), local(2026, 7, 14)];
    expect(computeDayStreak(ts, today)).toBe(3);
  });

  it("survives when the latest activity was yesterday", () => {
    const ts = [local(2026, 7, 15), local(2026, 7, 14)];
    expect(computeDayStreak(ts, today)).toBe(2);
  });

  it("breaks on a gap", () => {
    const ts = [local(2026, 7, 16), local(2026, 7, 13), local(2026, 7, 12)];
    expect(computeDayStreak(ts, today)).toBe(1);
  });

  it("is 0 when the latest activity is two days old", () => {
    expect(computeDayStreak([local(2026, 7, 14)], today)).toBe(0);
  });

  it("counts multiple activities on one day once", () => {
    const ts = [local(2026, 7, 16, 8), local(2026, 7, 16, 20), local(2026, 7, 15)];
    expect(computeDayStreak(ts, today)).toBe(2);
  });

  it("walks across a month boundary", () => {
    const ts = [local(2026, 7, 2), local(2026, 7, 1), local(2026, 6, 30)];
    expect(computeDayStreak(ts, local(2026, 7, 2))).toBe(3);
  });
});

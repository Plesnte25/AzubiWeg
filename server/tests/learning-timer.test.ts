import { describe, expect, it } from "vitest";
import { applyTimerIntent, bankTimer, liveTimerSeconds, startsTimer } from "../src/services/learning/timer.js";

const now = new Date("2026-09-24T10:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000);

describe("liveTimerSeconds / bankTimer", () => {
  it("adds the running segment to the stored total", () => {
    expect(liveTimerSeconds({ timerSeconds: 60, timerRunningSince: ago(90) }, now)).toBe(150);
    expect(liveTimerSeconds({ timerSeconds: 60, timerRunningSince: null }, now)).toBe(60);
  });

  it("never goes backwards on a clock skew", () => {
    expect(liveTimerSeconds({ timerSeconds: 60, timerRunningSince: new Date(now.getTime() + 5000) }, now)).toBe(60);
  });

  it("banks a running timer into a paused one", () => {
    expect(bankTimer({ timerSeconds: 10, timerRunningSince: ago(50) }, now)).toEqual({ timerSeconds: 60, timerRunningSince: null });
  });
});

describe("applyTimerIntent", () => {
  const stopped = { timerSeconds: 120, timerRunningSince: null };
  const running = { timerSeconds: 120, timerRunningSince: ago(30) };

  it("start runs from now, and is idempotent on a running timer", () => {
    expect(applyTimerIntent(stopped, { action: "start" }, now)).toEqual({ timerSeconds: 120, timerRunningSince: now });
    expect(applyTimerIntent(running, { action: "start" }, now)).toEqual(running);
  });

  it("pause banks, reset zeroes", () => {
    expect(applyTimerIntent(running, { action: "pause" }, now)).toEqual({ timerSeconds: 150, timerRunningSince: null });
    expect(applyTimerIntent(running, { action: "reset" }, now)).toEqual({ timerSeconds: 0, timerRunningSince: null });
  });

  it("setSeconds corrects the total and restarts a running segment from now", () => {
    expect(applyTimerIntent(running, { setSeconds: 600 }, now)).toEqual({ timerSeconds: 600, timerRunningSince: now });
    expect(applyTimerIntent(stopped, { setSeconds: 600 }, now)).toEqual({ timerSeconds: 600, timerRunningSince: null });
  });

  it("completing stops the timer, banking its time", () => {
    expect(applyTimerIntent(running, { completing: true }, now)).toEqual({ timerSeconds: 150, timerRunningSince: null });
  });
});

describe("startsTimer", () => {
  it("is true only for a stopped → running transition", () => {
    const r = { timerSeconds: 0, timerRunningSince: now };
    const s = { timerSeconds: 0, timerRunningSince: null };
    expect(startsTimer(s, r)).toBe(true);
    expect(startsTimer(r, r)).toBe(false);
    expect(startsTimer(r, s)).toBe(false);
  });
});

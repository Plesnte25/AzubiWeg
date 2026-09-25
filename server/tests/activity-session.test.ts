import { describe, expect, it } from "vitest";
import { clusterPingsIntoSessions, dayLernzeit, splitActiveMinutes, totalActiveMinutes } from "../src/services/activity/session.js";

const at = (isoTime: string) => new Date(`2026-07-22T${isoTime}:00`);

describe("clusterPingsIntoSessions", () => {
  it("merges pings within the gap into a single session", () => {
    const pings = [at("09:00"), at("09:03"), at("09:06")];
    const sessions = clusterPingsIntoSessions(pings, 10, 3);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.minutes).toBe(6 + 3); // span + tail
  });

  it("splits into separate sessions when the gap is exceeded", () => {
    const pings = [at("09:00"), at("09:03"), at("10:00"), at("10:02")];
    const sessions = clusterPingsIntoSessions(pings, 10, 3);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.minutes).toBe(3 + 3);
    expect(sessions[1]!.minutes).toBe(2 + 3);
  });

  it("gives a single isolated ping a short non-zero session", () => {
    const sessions = clusterPingsIntoSessions([at("09:00")], 10, 3);
    expect(sessions).toEqual([{ start: at("09:00"), end: at("09:00"), minutes: 3 }]);
  });

  it("handles no pings", () => {
    expect(clusterPingsIntoSessions([])).toEqual([]);
  });

  it("sorts unordered input before clustering", () => {
    const pings = [at("09:06"), at("09:00"), at("09:03")];
    const sessions = clusterPingsIntoSessions(pings, 10, 3);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.start).toEqual(at("09:00"));
    expect(sessions[0]!.end).toEqual(at("09:06"));
  });
});

describe("totalActiveMinutes", () => {
  it("sums minutes across all clustered sessions", () => {
    const pings = [at("09:00"), at("09:03"), at("10:00"), at("10:02")];
    expect(totalActiveMinutes(pings, 10, 3)).toBe(6 + 5);
  });
});

describe("splitActiveMinutes", () => {
  const at = (min: number, learning: boolean) => ({ pingedAt: new Date(Date.UTC(2026, 8, 24, 9, min)), learning });

  it("matches totalActiveMinutes for the total and credits all of it when every ping is learning", () => {
    const pings = [at(0, true), at(3, true), at(6, true)];
    expect(splitActiveMinutes(pings)).toEqual({ minutes: totalActiveMinutes(pings.map((p) => p.pingedAt)), learningMinutes: 9 });
  });

  it("credits a mixed session in proportion to its learning pings", () => {
    // one 9-minute session (0→6 plus a 3-minute tail), 2 of 3 pings on learning routes
    expect(splitActiveMinutes([at(0, true), at(3, false), at(6, true)])).toEqual({ minutes: 9, learningMinutes: 6 });
  });

  it("splits per session, so a non-learning session adds nothing", () => {
    const pings = [at(0, true), at(3, true), at(30, false), at(33, false)];
    expect(splitActiveMinutes(pings)).toEqual({ minutes: 12, learningMinutes: 6 });
  });

  it("is zero for no pings", () => {
    expect(splitActiveMinutes([])).toEqual({ minutes: 0, learningMinutes: 0 });
  });
});

describe("dayLernzeit", () => {
  it("uses the learning split when recorded and falls back to the total for older days", () => {
    expect(dayLernzeit({ minutes: 50, learningMinutes: 20 })).toBe(20);
    expect(dayLernzeit({ minutes: 50, learningMinutes: null })).toBe(50);
  });
});

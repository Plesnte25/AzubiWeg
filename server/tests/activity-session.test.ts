import { describe, expect, it } from "vitest";
import { clusterPingsIntoSessions, totalActiveMinutes } from "../src/services/activity/session.js";

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

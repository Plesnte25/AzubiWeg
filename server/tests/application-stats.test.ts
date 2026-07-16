import { describe, expect, it } from "vitest";
import { computeStats, type StatsApplication, type StatsEvent } from "../src/services/applications/stats.js";

const today = new Date(2026, 6, 16); // Thu 2026-07-16; ISO week starts Mon 2026-07-13

const app = (
  id: string,
  status: StatsApplication["status"],
  appliedAt: string | null,
): StatsApplication => ({
  id,
  status,
  appliedAt: appliedAt ? new Date(appliedAt + "T00:00:00Z") : null,
  createdAt: new Date("2026-07-01T00:00:00Z"),
});

const statusChange = (
  applicationId: string,
  toStatus: StatsEvent["toStatus"],
  occurredAt: string,
): StatsEvent => ({
  applicationId,
  type: "status_change",
  toStatus,
  occurredAt: new Date(occurredAt),
});

describe("computeStats", () => {
  it("empty state yields zeros and null rates, never NaN", () => {
    const stats = computeStats([], [], today);
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.responseRate).toBeNull();
    expect(stats.interviewRate).toBeNull();
    expect(stats.avgDaysToResponse).toBeNull();
    expect(stats.weeklyActivity).toHaveLength(8);
    expect(stats.weeklyActivity.every((w) => w.applied === 0)).toBe(true);
  });

  it("wishlist-only applications don't count as applied", () => {
    const stats = computeStats([app("a", "wishlist", null)], [], today);
    expect(stats.total).toBe(1);
    expect(stats.responseRate).toBeNull();
  });

  it("computes response and interview rates over applied applications", () => {
    const apps = [
      app("a", "rejected", "2026-07-01"),
      app("b", "applied", "2026-07-05"),
      app("c", "interview", "2026-07-06"),
      app("d", "wishlist", null),
    ];
    const events = [
      statusChange("a", "rejected", "2026-07-08T10:00:00Z"),
      statusChange("c", "interview", "2026-07-10T10:00:00Z"),
    ];
    const stats = computeStats(apps, events, today);
    expect(stats.responseRate).toBeCloseTo(2 / 3);
    expect(stats.interviewRate).toBeCloseTo(1 / 3);
    expect(stats.active).toBe(3);
  });

  it("averages days from appliedAt to first response", () => {
    const apps = [app("a", "rejected", "2026-07-01"), app("b", "interview", "2026-07-04")];
    const events = [
      statusChange("a", "rejected", "2026-07-08T00:00:00Z"), // 7 days
      statusChange("b", "interview", "2026-07-07T00:00:00Z"), // 3 days
      // a later change must not override the first response
      statusChange("b", "offer", "2026-07-14T00:00:00Z"),
    ];
    expect(computeStats(apps, events, today).avgDaysToResponse).toBe(5);
  });

  it("buckets weekly activity by ISO week, spanning a year boundary", () => {
    const jan = new Date(2026, 0, 7); // Wed; week starts Mon 2026-01-05
    const apps = [
      app("a", "applied", "2025-12-30"), // week of Mon 2025-12-29
      app("b", "applied", "2026-01-05"),
      app("c", "applied", "2026-01-06"),
    ];
    const stats = computeStats(apps, [], jan);
    const byWeek = Object.fromEntries(stats.weeklyActivity.map((w) => [w.weekStart, w.applied]));
    expect(byWeek["2025-12-29"]).toBe(1);
    expect(byWeek["2026-01-05"]).toBe(2);
  });
});

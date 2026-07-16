import { describe, expect, it } from "vitest";
import { daysUntil, expiryStatus } from "../src/services/reminders.js";

// stored @db.Date values arrive as UTC midnight
const utcDate = (iso: string) => new Date(iso + "T00:00:00Z");
// "today" as the server's local clock would produce it
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("daysUntil", () => {
  it("same day is 0, tomorrow is 1, yesterday is -1", () => {
    const today = local(2026, 7, 16);
    expect(daysUntil(utcDate("2026-07-16"), today)).toBe(0);
    expect(daysUntil(utcDate("2026-07-17"), today)).toBe(1);
    expect(daysUntil(utcDate("2026-07-15"), today)).toBe(-1);
  });

  it("is stable across a local time east of UTC (UTC-midnight date vs local today)", () => {
    // 00:30 local on the 16th — in an eastern timezone this instant is still
    // the 15th in UTC; local getters on "today" must keep it the 16th
    const earlyMorning = local(2026, 7, 16, 0.5);
    expect(daysUntil(utcDate("2026-07-16"), earlyMorning)).toBe(0);
  });

  it("crosses the European DST boundary without drifting (2026-03-29)", () => {
    expect(daysUntil(utcDate("2026-03-30"), local(2026, 3, 28))).toBe(2);
    expect(daysUntil(utcDate("2026-10-26"), local(2026, 10, 24))).toBe(2);
  });
});

describe("expiryStatus", () => {
  const today = local(2026, 7, 16);
  const inDays = (n: number) => {
    const d = new Date(Date.UTC(2026, 6, 16));
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };

  it("null date has no status", () => {
    expect(expiryStatus(null, today)).toBeNull();
  });

  it("boundaries: <0 expired, ≤14 urgent, ≤60 warn, else ok", () => {
    expect(expiryStatus(inDays(-1), today)).toBe("expired");
    expect(expiryStatus(inDays(0), today)).toBe("urgent");
    expect(expiryStatus(inDays(14), today)).toBe("urgent");
    expect(expiryStatus(inDays(15), today)).toBe("warn");
    expect(expiryStatus(inDays(60), today)).toBe("warn");
    expect(expiryStatus(inDays(61), today)).toBe("ok");
  });
});

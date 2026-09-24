import { describe, expect, it } from "vitest";
import {
  checkpointStations,
  deriveStations,
  levelMastery,
  parseStationKey,
  stationKey,
  type StationItem,
} from "../src/services/learning/stations.js";

let n = 0;
const item = (theme: string | null, masteryState: StationItem["masteryState"] = "not_started", o: Partial<StationItem> = {}): StationItem => ({
  id: `i${++n}`,
  level: "a2",
  theme,
  sortOrder: n,
  masteryState,
  skippedAt: null,
  ...o,
});

describe("stationKey / parseStationKey", () => {
  it("round-trips, including themes that contain a colon", () => {
    expect(parseStationKey(stationKey("a2", "Dative case"))).toEqual({ level: "a2", theme: "Dative case" });
    expect(parseStationKey("b1:Note: odd")).toEqual({ level: "b1", theme: "Note: odd" });
  });

  it("rejects malformed keys", () => {
    expect(parseStationKey("c1:Theme")).toBeNull();
    expect(parseStationKey("a1:")).toBeNull();
    expect(parseStationKey("nokey")).toBeNull();
  });
});

describe("deriveStations", () => {
  it("groups by theme in first-appearance order and numbers from 1", () => {
    const items = [item("A"), item("B"), item("A"), item("C")];
    const stations = deriveStations(items, "a2");
    expect(stations.map((s) => [s.index, s.theme, s.total])).toEqual([
      [1, "A", 2],
      [2, "B", 1],
      [3, "C", 1],
    ]);
    expect(stations[0]!.key).toBe("a2:A");
  });

  it("only includes the requested level", () => {
    expect(deriveStations([item("A"), item("X", "not_started", { level: "b1" })], "a2").map((s) => s.theme)).toEqual(["A"]);
  });

  it("marks closed stations done, the first open one cur, later ones locked, and the last one the gate", () => {
    const items = [item("A", "passed"), item("B", "mastered"), item("B", "not_started", { skippedAt: new Date() }), item("C", "learning"), item("D"), item("Exam prep")];
    expect(deriveStations(items, "a2").map((s) => s.state)).toEqual(["done", "done", "cur", "locked", "gate"]);
  });

  it("puts theme-less items under one fallback station", () => {
    expect(deriveStations([item(null), item("  ")], "a2").map((s) => s.theme)).toEqual(["More topics"]);
  });
});

describe("levelMastery", () => {
  it("is passed+mastered ÷ items, with station counts and the current station", () => {
    const items = [item("A", "passed"), item("A", "mastered"), item("B", "learning"), item("B"), item("Exam prep")];
    const m = levelMastery(items, "a2");
    expect(m).toMatchObject({ percent: 40, passedItems: 2, countedItems: 5, closedStations: 1, totalStations: 3 });
    expect(m.current?.theme).toBe("B");
  });

  it("leaves skipped items out of the denominator", () => {
    const items = [item("A", "passed"), item("B", "not_started", { skippedAt: new Date() })];
    expect(levelMastery(items, "a2").percent).toBe(100);
  });

  it("is 0% for an empty level", () => {
    expect(levelMastery([], "b1")).toMatchObject({ percent: 0, totalStations: 0, current: null });
  });
});

describe("checkpointStations", () => {
  it("covers stations 1–7, 8–14 and 15–21", () => {
    const items = Array.from({ length: 22 }, (_, i) => item(`T${i + 1}`));
    const stations = deriveStations(items, "a2");
    expect(checkpointStations(stations, 1).map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(checkpointStations(stations, 2).map((s) => s.index)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(checkpointStations(stations, 3).map((s) => s.index)).toEqual([15, 16, 17, 18, 19, 20, 21]);
  });
});

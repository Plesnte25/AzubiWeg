import { describe, expect, it } from "vitest";
import {
  buildManualUnits,
  buildPlaylistUnits,
  resizeManualUnits,
  unitProgress,
} from "../src/services/learning/units.js";

describe("buildManualUnits", () => {
  it("numbers lessons from 1 with 0-based positions", () => {
    const units = buildManualUnits(3);
    expect(units).toEqual([
      { position: 0, title: "Lesson 1" },
      { position: 1, title: "Lesson 2" },
      { position: 2, title: "Lesson 3" },
    ]);
  });
});

describe("buildPlaylistUnits", () => {
  it("keeps playlist order and video ids", () => {
    const units = buildPlaylistUnits([
      { videoId: "a", title: "Intro" },
      { videoId: "b", title: "Greetings" },
    ]);
    expect(units).toEqual([
      { position: 0, title: "Intro", videoId: "a" },
      { position: 1, title: "Greetings", videoId: "b" },
    ]);
  });
});

describe("unitProgress", () => {
  it("counts done units", () => {
    expect(
      unitProgress([{ completedAt: new Date() }, { completedAt: null }, { completedAt: null }]),
    ).toEqual({ total: 3, done: 1 });
    expect(unitProgress([])).toEqual({ total: 0, done: 0 });
  });
});

describe("resizeManualUnits", () => {
  const current = [{ position: 0 }, { position: 1 }, { position: 2 }];

  it("appends placeholders when growing", () => {
    expect(resizeManualUnits(current, 5)).toEqual({
      create: [
        { position: 3, title: "Lesson 4" },
        { position: 4, title: "Lesson 5" },
      ],
      deletePositions: [],
    });
  });

  it("drops from the end when shrinking", () => {
    expect(resizeManualUnits(current, 1)).toEqual({
      create: [],
      deletePositions: [2, 1],
    });
  });

  it("is a no-op at the same total", () => {
    expect(resizeManualUnits(current, 3)).toEqual({ create: [], deletePositions: [] });
  });
});

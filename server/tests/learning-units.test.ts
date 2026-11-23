import { describe, expect, it } from "vitest";
import {
  buildManualUnits,
  parseContents,
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

describe("buildManualUnits labels", () => {
  it("names placeholders after the unit", () => {
    expect(buildManualUnits(2, "chapters").map((u) => u.title)).toEqual(["Chapter 1", "Chapter 2"]);
    expect(resizeManualUnits([{ position: 0 }], 2, "chapters").create[0]?.title).toBe("Chapter 2");
  });
});

describe("parseContents", () => {
  it("turns a pasted table of contents into chapter titles", () => {
    const toc = [
      "Inhalt",
      "",
      "Lektion 1: Hallo! ........ 8",
      "• Lektion 2: Ich bin Journalistin.\t14",
      "Lektion 3   20",
      "Lektion 12",
      "Modul-Plus, S. 46",
      "  57 ",
    ].join("\n");
    expect(parseContents(toc)).toEqual(["Lektion 1: Hallo!", "Lektion 2: Ich bin Journalistin.", "Lektion 3", "Lektion 12", "Modul-Plus"]);
  });

  it("caps very long pastes", () => {
    expect(parseContents(Array.from({ length: 400 }, (_, i) => `Kapitel ${i + 1}`).join("\n"))).toHaveLength(300);
  });
});

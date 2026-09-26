import { describe, expect, it } from "vitest";
import { cleanTeaser, extractCourseId, parseCourseResponse } from "../src/services/learning/nicosweg.js";
import { buildCourseUnits } from "../src/services/learning/units.js";

describe("extractCourseId", () => {
  it("reads the course id from overview URLs", () => {
    expect(extractCourseId("https://learngerman.dw.com/en/nicos-weg/c-36519789")).toBe(36519789);
    expect(extractCourseId("https://www.learngerman.dw.com/de/nicos-weg/c-36519718")).toBe(36519718);
  });

  it("rejects other hosts, lesson URLs, and garbage", () => {
    expect(extractCourseId("https://dw.com/en/nicos-weg/c-123")).toBeNull();
    expect(extractCourseId("https://learngerman.dw.com/en/hallo/l-37250531")).toBeNull();
    expect(extractCourseId("not a url")).toBeNull();
  });
});

describe("parseCourseResponse", () => {
  const body = {
    data: {
      content: {
        name: "Nicos Weg",
        lessons: [
          {
            name: "Hallo!",
            id: 37250531,
            namedUrl: "/en/hallo/l-37250531",
            teaser: "A1 German for beginners: How do you introduce yourself in German? Learn formal and informal greetings.",
          },
          { name: "broken lesson", id: 1 }, // missing namedUrl — skipped
          { name: "Tschüss!", id: 37251033, namedUrl: "/en/tschüss/l-37251033" },
        ],
      },
    },
  };

  it("extracts title and lessons with absolute URLs", () => {
    const { title, lessons } = parseCourseResponse(body);
    expect(title).toBe("Nicos Weg");
    expect(lessons).toEqual([
      {
        title: "Hallo!",
        url: "https://learngerman.dw.com/en/hallo/l-37250531",
        description: "How do you introduce yourself in German? Learn formal and informal greetings.",
      },
      { title: "Tschüss!", url: "https://learngerman.dw.com/en/tschüss/l-37251033", description: null },
    ]);
  });

  it("returns empty on error/malformed bodies", () => {
    expect(parseCourseResponse({ errors: [{ message: "nope" }] }).lessons).toEqual([]);
    expect(parseCourseResponse({ data: { content: null } }).lessons).toEqual([]);
    expect(parseCourseResponse(null).lessons).toEqual([]);
    expect(parseCourseResponse("garbage").lessons).toEqual([]);
  });
});

describe("buildCourseUnits", () => {
  it("maps lessons to units with urls", () => {
    expect(
      buildCourseUnits([{ title: "Hallo!", url: "https://learngerman.dw.com/en/hallo/l-1", description: "Greetings." }]),
    ).toEqual([{ position: 0, title: "Hallo!", url: "https://learngerman.dw.com/en/hallo/l-1", description: "Greetings." }]);
  });
});

describe("cleanTeaser", () => {
  it("drops the level prefix and DW's promo sentences", () => {
    expect(
      cleanTeaser("A1 German: Learn the German alphabet and how to spell in German. Click here to learn with DW's free online class today!"),
    ).toBe("Learn the German alphabet and how to spell in German.");
  });
  it("returns null for missing or promo-only teasers", () => {
    expect(cleanTeaser(undefined)).toBeNull();
    expect(cleanTeaser("Learn German DW.")).toBeNull();
  });
});

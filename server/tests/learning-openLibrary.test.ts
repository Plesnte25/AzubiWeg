import { describe, expect, it } from "vitest";
import { extractIsbn, pickBook, scoreBook, toBookResult } from "../src/services/learning/openLibrary.js";

// shapes from the live search.json (2026-09-29)
const german1989 = { title: "German", author_name: ["Paul Coggle", "Heiner Schenke"], cover_i: 59102, number_of_pages_median: 272, first_publish_year: 1989 };
const complete2011 = { title: "Complete German (Learn German with Teach Yourself)", author_name: ["Paul Coggle", "Heiner Schenke"], cover_i: 14670036, number_of_pages_median: 408 };
const commissionE = { title: "The Complete German Commission E Monographs", author_name: ["Bundesinstitut fur Arzneimittel"], cover_i: 729811, number_of_pages_median: 685 };

describe("pickBook", () => {
  it("prefers the title that was typed over Open Library's first hit", () => {
    expect(pickBook("Complete German Coggle", [german1989, complete2011])?.title).toBe("Complete German (Learn German with Teach Yourself)");
    expect(pickBook("Complete German", [commissionE, complete2011])?.pageCount).toBe(408);
  });

  it("gives up when nothing matches half of what was typed", () => {
    expect(pickBook("Menschen A1.1 Kursbuch", [commissionE])).toBeNull();
    expect(pickBook("x", [])).toBeNull();
  });

  it("scores a missing title below anything real", () => {
    expect(scoreBook("German", {})).toBe(-1);
    expect(scoreBook("German", german1989)).toBeGreaterThan(0);
  });
});

describe("toBookResult", () => {
  it("builds the large cover URL and drops empty page counts", () => {
    expect(toBookResult(complete2011)).toEqual({
      title: "Complete German (Learn German with Teach Yourself)",
      authors: ["Paul Coggle", "Heiner Schenke"],
      thumbnailUrl: "https://covers.openlibrary.org/b/id/14670036-L.jpg",
      pageCount: 408,
    });
    expect(toBookResult({ title: "X", number_of_pages_median: 0 })?.pageCount).toBeNull();
  });
});

describe("extractIsbn", () => {
  it("reads a bare ISBN, with or without dashes", () => {
    expect(extractIsbn("978-1-4441-3027-0")).toBe("9781444130270");
    expect(extractIsbn("034055388x")).toBe("034055388X");
  });

  it("reads an ISBN out of book links", () => {
    expect(extractIsbn("https://openlibrary.org/isbn/9781444130270")).toBe("9781444130270");
    expect(extractIsbn("https://www.amazon.de/dp/1444130277/ref=sr_1_1")).toBe("1444130277");
    expect(extractIsbn("https://books.google.com/books?isbn=9781444130270")).toBe("9781444130270");
  });

  it("ignores titles and other links", () => {
    expect(extractIsbn("Complete German")).toBeNull();
    expect(extractIsbn("https://www.hueber.de/menschen")).toBeNull();
  });
});

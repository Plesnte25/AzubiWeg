import { describe, expect, it } from "vitest";
import { parseBooksResponse, parseVolumeInfo } from "../src/services/learning/googleBooks.js";

describe("parseBooksResponse", () => {
  it("extracts title, authors, https-upgraded thumbnail, and page count from the first result", () => {
    const body = {
      items: [
        {
          volumeInfo: {
            title: "Der Process",
            authors: ["Franz Kafka"],
            pageCount: 256,
            publishedDate: "2008-03",
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "3150096760" },
              { type: "ISBN_13", identifier: "9783150096762" },
            ],
            imageLinks: { thumbnail: "http://books.google.com/books/content?id=x&img=1" },
          },
        },
      ],
    };
    expect(parseBooksResponse(body)).toEqual({
      title: "Der Process",
      authors: ["Franz Kafka"],
      thumbnailUrl: "https://books.google.com/books/content?id=x&img=1",
      pageCount: 256,
      isbn: "9783150096762",
      year: 2008,
    });
  });

  it("falls back to smallThumbnail, and null pageCount/authors when absent", () => {
    const body = {
      items: [{ volumeInfo: { title: "Untitled", imageLinks: { smallThumbnail: "http://x/small.png" } } }],
    };
    expect(parseBooksResponse(body)).toEqual({
      title: "Untitled",
      authors: [],
      thumbnailUrl: "https://x/small.png",
      pageCount: null,
      isbn: null,
      year: null,
    });
  });

  it("returns null on empty/malformed/no-results bodies", () => {
    expect(parseBooksResponse({ items: [] })).toBeNull();
    expect(parseBooksResponse({ items: [{}] })).toBeNull();
    expect(parseBooksResponse(null)).toBeNull();
    expect(parseBooksResponse("garbage")).toBeNull();
  });

  it("parses a single volume (GET /volumes/{id})", () => {
    expect(parseVolumeInfo({ title: "Menschen A2", authors: ["Sandra Evans"] })?.title).toBe("Menschen A2");
    expect(parseVolumeInfo(undefined)).toBeNull();
  });
});

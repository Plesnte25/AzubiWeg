import { describe, expect, it } from "vitest";
import { parseBooksResponse } from "../src/services/learning/googleBooks.js";

describe("parseBooksResponse", () => {
  it("extracts title, authors, https-upgraded thumbnail, and page count from the first result", () => {
    const body = {
      items: [
        {
          volumeInfo: {
            title: "Der Process",
            authors: ["Franz Kafka"],
            pageCount: 256,
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
    });
  });

  it("returns null on empty/malformed/no-results bodies", () => {
    expect(parseBooksResponse({ items: [] })).toBeNull();
    expect(parseBooksResponse({ items: [{}] })).toBeNull();
    expect(parseBooksResponse(null)).toBeNull();
    expect(parseBooksResponse("garbage")).toBeNull();
  });
});

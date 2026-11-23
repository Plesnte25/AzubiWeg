import { describe, expect, it } from "vitest";
import { extractIsbn, isValidIsbn, parseBookLink } from "../src/services/learning/bookLinks.js";

describe("isValidIsbn", () => {
  it("checks ISBN-10 and ISBN-13 checksums", () => {
    expect(isValidIsbn("3191019022")).toBe(true);
    expect(isValidIsbn("978-3-19-101902-0")).toBe(true);
    expect(isValidIsbn("034055388X")).toBe(true);
    expect(isValidIsbn("3191019023")).toBe(false);
    expect(isValidIsbn("9783191019021")).toBe(false);
  });
});

describe("extractIsbn", () => {
  it("finds an ISBN-13 anywhere in a publisher or shop link", () => {
    expect(extractIsbn("https://shop.hueber.de/de/menschen-a2-kursbuch-978-3-19-101902-0.html")).toBe("9783191019020");
    expect(extractIsbn("https://www.thalia.de/shop/home/artikeldetails/A1234?ean=9783191019020")).toBe("9783191019020");
  });

  it("ignores digit runs that fail the checksum", () => {
    expect(extractIsbn("https://www.amazon.de/gp/your-account/order-details?orderID=3029384756")).toBeNull();
    expect(extractIsbn("https://example.com/track/9781234567890")).toBeNull();
  });
});

describe("parseBookLink", () => {
  it("reads Amazon's ISBN-10 product id and the title slug", () => {
    expect(parseBookLink("https://www.amazon.de/Menschen-A2-Kursbuch-Sandra-Evans/dp/3191019022/ref=sr_1_1?keywords=menschen")).toEqual({
      isbn: "3191019022",
      googleId: null,
      titleHint: "Menschen A2 Kursbuch Sandra Evans",
    });
  });

  it("keeps the slug when the Amazon id is an ASIN (Kindle), not an ISBN", () => {
    expect(parseBookLink("https://www.amazon.de/Menschen-A1-Kursbuch-ebook/dp/B07XYZ1234")).toEqual({
      isbn: null,
      googleId: null,
      titleHint: "Menschen A1 Kursbuch ebook",
    });
  });

  it("reads Google Books ids and slugs in their link shapes", () => {
    expect(parseBookLink("https://books.google.de/books?id=zyTCAlFPjgYC&printsec=frontcover")).toEqual({ isbn: null, googleId: "zyTCAlFPjgYC", titleHint: null });
    expect(parseBookLink("https://www.google.de/books/edition/Menschen_A2_Kursbuch/zyTCAlFPjgYC?hl=de")).toEqual({
      isbn: null,
      googleId: "zyTCAlFPjgYC",
      titleHint: "Menschen A2 Kursbuch",
    });
    expect(parseBookLink("https://books.google.com/books/about/Schritte_international.html?id=AbCdEfGhIjKL")).toEqual({
      isbn: null,
      googleId: "AbCdEfGhIjKL",
      titleHint: "Schritte international",
    });
    expect(parseBookLink("https://www.google.com/books/edition/_/zyTCAlFPjgYC").titleHint).toBeNull();
  });

  it("returns nothing useful for other pages", () => {
    expect(parseBookLink("https://www.hueber.de/menschen")).toEqual({ isbn: null, googleId: null, titleHint: null });
  });
});

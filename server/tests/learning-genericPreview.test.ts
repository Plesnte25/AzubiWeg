import { describe, expect, it } from "vitest";
import { parseGenericPreview } from "../src/services/learning/genericPreview.js";

describe("parseGenericPreview", () => {
  it("prefers og:title/og:image/og:site_name when present", () => {
    const html = `<html><head>
      <title>Fallback Title</title>
      <meta property="og:title" content="Real Article Title">
      <meta property="og:image" content="https://example.com/cover.jpg">
      <meta property="og:site_name" content="Example News">
    </head></html>`;
    expect(parseGenericPreview(html, "www.example.com")).toEqual({
      title: "Real Article Title",
      imageUrl: "https://example.com/cover.jpg",
      siteName: "Example News",
    });
  });

  it("falls back to <title> and the hostname when og tags are absent", () => {
    const html = "<html><head><title>Plain Page</title></head></html>";
    expect(parseGenericPreview(html, "www.example.com")).toEqual({
      title: "Plain Page",
      imageUrl: null,
      siteName: "example.com",
    });
  });

  it("returns all-null title/image with just the hostname on a totally empty page", () => {
    expect(parseGenericPreview("<html></html>", "www.example.com")).toEqual({
      title: null,
      imageUrl: null,
      siteName: "example.com",
    });
  });
});

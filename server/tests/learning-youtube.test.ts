import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractPlaylistId,
  extractVideoId,
  parsePlaylistHtml,
} from "../src/services/learning/youtube.js";

const fixture = readFileSync(path.join(import.meta.dirname, "fixtures/playlist.html"), "utf8");

describe("extractPlaylistId", () => {
  it("reads list= from playlist, watch and share URLs", () => {
    expect(extractPlaylistId("https://youtube.com/playlist?list=PLF9mJC4Rrj&si=x")).toBe("PLF9mJC4Rrj");
    expect(extractPlaylistId("https://www.youtube.com/watch?v=abc&list=PLxyz")).toBe("PLxyz");
    expect(extractPlaylistId("https://m.youtube.com/playlist?list=PL123")).toBe("PL123");
    expect(extractPlaylistId("https://youtu.be/abc123?list=PLshare")).toBe("PLshare");
  });

  it("rejects non-YouTube hosts and garbage", () => {
    expect(extractPlaylistId("https://example.com/playlist?list=PL1")).toBeNull();
    expect(extractPlaylistId("https://evil-youtube.com/playlist?list=PL1")).toBeNull();
    expect(extractPlaylistId("not a url")).toBeNull();
    expect(extractPlaylistId("https://youtube.com/watch?v=abc")).toBeNull();
  });
});

describe("extractVideoId", () => {
  it("reads v=, youtu.be paths, shorts and embeds", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=RuGmc662HDg")).toBe("RuGmc662HDg");
    expect(extractVideoId("https://youtu.be/RuGmc662HDg?si=x")).toBe("RuGmc662HDg");
    expect(extractVideoId("https://youtube.com/shorts/abc123def45")).toBe("abc123def45");
    expect(extractVideoId("https://www.youtube.com/embed/xyz")).toBe("xyz");
  });

  it("rejects other hosts and missing ids", () => {
    expect(extractVideoId("https://vimeo.com/12345")).toBeNull();
    expect(extractVideoId("https://youtube.com/playlist?list=PL1")).toBeNull();
    expect(extractVideoId("nope")).toBeNull();
  });
});

describe("parsePlaylistHtml", () => {
  it("collects lockupViewModel videos in order, deduped, skipping malformed nodes", () => {
    const { title, videos } = parsePlaylistHtml(fixture);
    expect(title).toBe("German A1 Course");
    expect(videos).toEqual([
      { videoId: "RuGmc662HDg", title: "A1 - Lesson 1 | Begrüßungen | Greetings" },
      { videoId: "aBcDeFgHiJk", title: "A1 - Lesson 2 | Zahlen | Numbers" },
      { videoId: "zYxWvUtSrQp", title: "A1 - Lesson 3 | Familie | Family" },
    ]);
  });

  it("returns empty on pages without the data blob (consent walls, garbage)", () => {
    expect(parsePlaylistHtml("<html><body>Accept cookies</body></html>").videos).toEqual([]);
    expect(parsePlaylistHtml("").videos).toEqual([]);
  });

  it("returns empty on a corrupt JSON blob", () => {
    const broken = 'var ytInitialData = {"unclosed": ;</script>';
    expect(parsePlaylistHtml(broken).videos).toEqual([]);
  });
});

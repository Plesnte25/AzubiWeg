import { describe, expect, it } from "vitest";
import { parsePodcastsResponse } from "../src/services/learning/itunesPodcasts.js";

describe("parsePodcastsResponse", () => {
  it("extracts name, artist, artwork, and episode count from the first result", () => {
    const body = {
      results: [
        {
          trackName: "Easy German Podcast",
          artistName: "Easy German",
          artworkUrl600: "https://example.com/art600.jpg",
          artworkUrl100: "https://example.com/art100.jpg",
          trackCount: 42,
        },
      ],
    };
    expect(parsePodcastsResponse(body)).toEqual({
      trackName: "Easy German Podcast",
      artistName: "Easy German",
      artworkUrl: "https://example.com/art600.jpg",
      trackCount: 42,
    });
  });

  it("falls back to artworkUrl100 when artworkUrl600 is missing, and null for absent fields", () => {
    const body = { results: [{ trackName: "Some Show", artworkUrl100: "https://example.com/art100.jpg" }] };
    expect(parsePodcastsResponse(body)).toEqual({
      trackName: "Some Show",
      artistName: null,
      artworkUrl: "https://example.com/art100.jpg",
      trackCount: null,
    });
  });

  it("returns null on empty/malformed/no-results bodies", () => {
    expect(parsePodcastsResponse({ results: [] })).toBeNull();
    expect(parsePodcastsResponse({ results: [{}] })).toBeNull();
    expect(parsePodcastsResponse(null)).toBeNull();
    expect(parsePodcastsResponse("garbage")).toBeNull();
  });
});

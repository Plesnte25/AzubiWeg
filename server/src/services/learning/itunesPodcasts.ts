// Apple's iTunes Search API — free, official, no API key or auth required
// for search (same "keyless where possible" convention as googleBooks.ts).

const SEARCH_ENDPOINT = "https://itunes.apple.com/search";

export interface PodcastResult {
  trackName: string;
  artistName: string | null;
  artworkUrl: string | null;
  trackCount: number | null;
}

interface PodcastRaw {
  trackName?: unknown;
  artistName?: unknown;
  artworkUrl600?: unknown;
  artworkUrl100?: unknown;
  trackCount?: unknown;
}

interface SearchResponseRaw {
  results?: PodcastRaw[];
}

/** Pure response parsing, split out for tests. Picks the first result, same
 * single-best-guess convention as googleBooks.ts's parseBooksResponse. */
export function parsePodcastsResponse(body: unknown): PodcastResult | null {
  if (body === null || typeof body !== "object") return null;
  const first = (body as SearchResponseRaw).results?.[0];
  if (!first || typeof first.trackName !== "string") return null;

  const artworkUrl = typeof first.artworkUrl600 === "string" ? first.artworkUrl600 : typeof first.artworkUrl100 === "string" ? first.artworkUrl100 : null;
  const trackCount = typeof first.trackCount === "number" && first.trackCount > 0 ? first.trackCount : null;

  return {
    trackName: first.trackName,
    artistName: typeof first.artistName === "string" ? first.artistName : null,
    artworkUrl,
    trackCount,
  };
}

/** null on any network/HTTP/parse/no-results failure — callers fall back to manual. */
export async function fetchPodcast(query: string): Promise<PodcastResult | null> {
  try {
    const url = `${SEARCH_ENDPOINT}?media=podcast&entity=podcast&limit=1&term=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return parsePodcastsResponse(await res.json());
  } catch {
    return null;
  }
}

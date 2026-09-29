// Google Books volumes search — the fallback after Open Library (openLibrary.ts). Without a key the quota is shared
// by every anonymous caller and answers 429 from the server (KNOWN_ISSUES #34); set GOOGLE_BOOKS_API_KEY (free,
// 1,000 requests a day) to make it dependable.

const SEARCH_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

export interface BookResult {
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  pageCount: number | null;
}

interface VolumeInfoRaw {
  title?: unknown;
  authors?: unknown;
  pageCount?: unknown;
  imageLinks?: { thumbnail?: unknown; smallThumbnail?: unknown };
}

interface VolumesResponseRaw {
  items?: { volumeInfo?: VolumeInfoRaw }[];
}

/** Pure response parsing, split out for tests. Picks the first result — a
 * search query is expected to already be a fairly specific title, and this
 * app has no UI for picking among several candidates. */
export function parseBooksResponse(body: unknown): BookResult | null {
  if (body === null || typeof body !== "object") return null;
  const items = (body as VolumesResponseRaw).items;
  const info = items?.[0]?.volumeInfo;
  if (!info || typeof info.title !== "string") return null;

  const authors = Array.isArray(info.authors) ? info.authors.filter((a): a is string => typeof a === "string") : [];
  // https-upgrade: the API returns http:// thumbnail URLs, which mixed-content
  // policies block when this app is served over https
  const rawThumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const thumbnailUrl = typeof rawThumb === "string" ? rawThumb.replace(/^http:/, "https:") : null;
  const pageCount = typeof info.pageCount === "number" && info.pageCount > 0 ? info.pageCount : null;

  return { title: info.title, authors, thumbnailUrl, pageCount };
}

/** null on any network/HTTP/parse/no-results failure — callers fall back to manual. */
export async function fetchBook(query: string): Promise<BookResult | null> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&maxResults=1${key ? `&key=${encodeURIComponent(key)}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return parseBooksResponse(await res.json());
  } catch {
    return null;
  }
}

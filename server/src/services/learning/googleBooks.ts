// Google Books — the fallback after Open Library (openLibrary.ts), and the exact lookup for a pasted Google Books
// link (its volume id). Only with GOOGLE_BOOKS_API_KEY (free, 1,000 requests a day): the anonymous quota is shared by
// every caller and was 0 per day when checked (2026-11-23), so without a key every call was a wasted 429 round trip.

const SEARCH_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

export interface BookResult {
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  pageCount: number | null;
  isbn?: string | null;
  year?: number | null;
}

interface VolumeInfoRaw {
  title?: unknown;
  authors?: unknown;
  pageCount?: unknown;
  imageLinks?: { thumbnail?: unknown; smallThumbnail?: unknown };
  industryIdentifiers?: { type?: unknown; identifier?: unknown }[];
  publishedDate?: unknown;
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
  return parseVolumeInfo(items?.[0]?.volumeInfo);
}

/** One volume (GET /volumes/{id} answers `{ volumeInfo }`). */
export function parseVolumeInfo(info: VolumeInfoRaw | undefined): BookResult | null {
  if (!info || typeof info.title !== "string") return null;

  const authors = Array.isArray(info.authors) ? info.authors.filter((a): a is string => typeof a === "string") : [];
  // https-upgrade: the API returns http:// thumbnail URLs, which mixed-content
  // policies block when this app is served over https
  const rawThumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const thumbnailUrl = typeof rawThumb === "string" ? rawThumb.replace(/^http:/, "https:") : null;
  const pageCount = typeof info.pageCount === "number" && info.pageCount > 0 ? info.pageCount : null;

  const ids = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  const isbn = ids.find((i) => i.type === "ISBN_13")?.identifier ?? ids.find((i) => i.type === "ISBN_10")?.identifier;
  const year = typeof info.publishedDate === "string" ? Number(info.publishedDate.slice(0, 4)) || null : null;

  return { title: info.title, authors, thumbnailUrl, pageCount, isbn: typeof isbn === "string" ? isbn : null, year };
}

const apiKey = () => process.env.GOOGLE_BOOKS_API_KEY?.trim() || null;
export const googleBooksEnabled = () => apiKey() !== null;

async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** A pasted Google Books link's volume, exactly. null without a key or on any failure. */
export async function fetchVolume(id: string): Promise<BookResult | null> {
  const key = apiKey();
  if (!key) return null;
  const body = await getJson(`${SEARCH_ENDPOINT}/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`);
  return body && typeof body === "object" ? parseVolumeInfo((body as { volumeInfo?: VolumeInfoRaw }).volumeInfo) : null;
}

/** A search (a title, or `isbn:…`). null without a key or on any network/HTTP/parse/no-results failure. */
export async function fetchBook(query: string): Promise<BookResult | null> {
  const key = apiKey();
  if (!key) return null;
  return parseBooksResponse(await getJson(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&maxResults=1&key=${encodeURIComponent(key)}`));
}

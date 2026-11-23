/**
 * Book lookup via Open Library (openlibrary.org): no API key and no shared quota, unlike anonymous Google Books,
 * which returns 429 from the server (KNOWN_ISSUES #34). A title search ranks the hits by how well they match what
 * was typed — Open Library's own first hit is often an older edition or an unrelated title — and an ISBN (typed, or
 * read from a book link) is an exact lookup.
 */
import type { BookResult } from "./googleBooks.js";

export { extractIsbn } from "./bookLinks.js";

const SEARCH = "https://openlibrary.org/search.json";
const FIELDS = "title,author_name,number_of_pages_median,cover_i,first_publish_year,isbn";
const COVER = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export interface OpenLibraryDoc {
  title?: unknown;
  author_name?: unknown;
  number_of_pages_median?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
  isbn?: unknown;
}

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9ß]+/)
    .filter((t) => t.length > 1);

/** How well a hit matches the query: the share of query words found in its title or authors counts most, then the
 * share of the title's own words (before any "(series)" part) that were typed, then a cover and a page count. */
export function scoreBook(query: string, doc: OpenLibraryDoc): number {
  if (typeof doc.title !== "string") return -1;
  const q = new Set(tokens(query));
  if (q.size === 0) return -1;
  const authors = Array.isArray(doc.author_name) ? doc.author_name.filter((a): a is string => typeof a === "string") : [];
  const hay = new Set([...tokens(doc.title), ...authors.flatMap(tokens)]);
  const queryCovered = [...q].filter((t) => hay.has(t)).length / q.size;
  const mainTitle = tokens(doc.title.split("(")[0] ?? doc.title);
  const titleCovered = mainTitle.length ? mainTitle.filter((t) => q.has(t)).length / mainTitle.length : 0;
  return queryCovered * 2 + titleCovered + (typeof doc.cover_i === "number" ? 0.1 : 0) + (typeof doc.number_of_pages_median === "number" ? 0.05 : 0);
}

export function toBookResult(doc: OpenLibraryDoc): BookResult | null {
  if (typeof doc.title !== "string") return null;
  const authors = Array.isArray(doc.author_name) ? doc.author_name.filter((a): a is string => typeof a === "string") : [];
  const pages = typeof doc.number_of_pages_median === "number" && doc.number_of_pages_median > 0 ? doc.number_of_pages_median : null;
  const isbns = Array.isArray(doc.isbn) ? doc.isbn.filter((i): i is string => typeof i === "string") : [];
  return {
    title: doc.title,
    authors,
    thumbnailUrl: typeof doc.cover_i === "number" ? COVER(doc.cover_i) : null,
    pageCount: pages,
    // a work lists every edition's ISBN; any one of them finds the work again (a picked candidate re-looks itself up)
    isbn: isbns.find((i) => i.length === 13) ?? isbns[0] ?? null,
    year: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
  };
}

/** Every hit that matches at least half of what was typed, best first (query coverage counts double, so a score of
 * 1.0 = half the typed words found). */
export function rankBooks(query: string, docs: OpenLibraryDoc[]): BookResult[] {
  return docs
    .map((doc) => ({ doc, score: scoreBook(query, doc) }))
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .map((x) => toBookResult(x.doc))
    .filter((b): b is BookResult => b !== null);
}

/** The best-matching hit of a title search, or null when nothing matches at least half of what was typed. */
export function pickBook(query: string, docs: OpenLibraryDoc[]): BookResult | null {
  return rankBooks(query, docs)[0] ?? null;
}

// Open Library answers the same query the same way for hours; the Add-source preview, the create after it and a
// second user adding the same textbook all hit this. Misses aren't kept, so a retry really retries.
const CACHE_TTL_MS = 60 * 60_000;
const cache = new Map<string, { at: number; docs: OpenLibraryDoc[] }>();

async function search(params: string): Promise<OpenLibraryDoc[] | null> {
  const hit = cache.get(params);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.docs;
  try {
    const res = await fetch(`${SEARCH}?${params}&fields=${FIELDS}`, {
      signal: AbortSignal.timeout(7_000),
      headers: { "User-Agent": "AzubiWeg/1.0 (study source lookup)" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { docs?: unknown };
    if (!Array.isArray(body.docs)) return null;
    const docs = body.docs as OpenLibraryDoc[];
    if (docs.length > 0) {
      cache.set(params, { at: Date.now(), docs });
      if (cache.size > 300) cache.delete(cache.keys().next().value!);
    }
    return docs;
  } catch {
    return null;
  }
}

/** A title search, ranked best first; empty on no match or any failure (callers fall back to Google Books, then manual). */
export async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  const docs = await search(`q=${encodeURIComponent(query)}&limit=15`);
  return docs ? rankBooks(query, docs) : [];
}

/** Exact lookup by ISBN. */
export async function openLibraryByIsbn(isbn: string): Promise<BookResult | null> {
  const docs = await search(`isbn=${encodeURIComponent(isbn)}&limit=1`);
  const doc = docs?.[0];
  return doc ? toBookResult(doc) : null;
}

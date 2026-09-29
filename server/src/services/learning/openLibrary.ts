/**
 * Book lookup via Open Library (openlibrary.org): no API key and no shared quota, unlike anonymous Google Books,
 * which returns 429 from the server (KNOWN_ISSUES #34). A title search ranks the hits by how well they match what
 * was typed — Open Library's own first hit is often an older edition or an unrelated title — and an ISBN (typed, or
 * read from a book link) is an exact lookup.
 */
import type { BookResult } from "./googleBooks.js";

const SEARCH = "https://openlibrary.org/search.json";
const FIELDS = "title,author_name,number_of_pages_median,cover_i,first_publish_year";
const COVER = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export interface OpenLibraryDoc {
  title?: unknown;
  author_name?: unknown;
  number_of_pages_median?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
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
  return { title: doc.title, authors, thumbnailUrl: typeof doc.cover_i === "number" ? COVER(doc.cover_i) : null, pageCount: pages };
}

/** The best-matching hit of a title search, or null when nothing matches at least half of what was typed. */
export function pickBook(query: string, docs: OpenLibraryDoc[]): BookResult | null {
  let best: { doc: OpenLibraryDoc; score: number } | null = null;
  for (const doc of docs) {
    const score = scoreBook(query, doc);
    if (!best || score > best.score) best = { doc, score };
  }
  // query coverage counts double, so 1.0 = half the typed words found
  return best && best.score >= 1 ? toBookResult(best.doc) : null;
}

/** An ISBN-10/13 typed on its own or inside a book link (Open Library, Google Books `isbn=`, Amazon `/dp/<ISBN-10>`). */
export function extractIsbn(input: string): string | null {
  const s = input.trim();
  const bare = s.replace(/[\s-]/g, "");
  if (/^(97[89])?\d{9}[\dXx]$/.test(bare)) return bare.toUpperCase();
  const inUrl = s.match(/(?:isbn[=/:]|\/dp\/|\/gp\/product\/)((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx])/i);
  return inUrl ? inUrl[1]!.replace(/[\s-]/g, "").toUpperCase() : null;
}

async function search(params: string): Promise<OpenLibraryDoc[] | null> {
  try {
    const res = await fetch(`${SEARCH}?${params}&fields=${FIELDS}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "AzubiWeg/1.0 (study source lookup)" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { docs?: unknown };
    return Array.isArray(body.docs) ? (body.docs as OpenLibraryDoc[]) : null;
  } catch {
    return null;
  }
}

/** A title search, ranked. null on no match or any failure (callers fall back to Google Books, then manual). */
export async function searchOpenLibrary(query: string): Promise<BookResult | null> {
  const docs = await search(`q=${encodeURIComponent(query)}&limit=15`);
  return docs ? pickBook(query, docs) : null;
}

/** Exact lookup by ISBN. */
export async function openLibraryByIsbn(isbn: string): Promise<BookResult | null> {
  const docs = await search(`isbn=${encodeURIComponent(isbn)}&limit=1`);
  const doc = docs?.[0];
  return doc ? toBookResult(doc) : null;
}

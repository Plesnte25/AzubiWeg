/**
 * One place that fills in a study source from what the user typed or pasted, for every source type (KNOWN_ISSUES
 * #34): a YouTube playlist's videos, a Nicos Weg course's lessons, a book (by ISBN, Google Books id or title — see
 * lookupBook), a podcast (iTunes), or any page's OpenGraph title and image — plus a default cover from the
 * link. Shared by POST /sources/preview (fetch before save, nothing stored), POST /sources and a saved source's
 * "Fetch details". Every lookup is best-effort: a failure returns outcome "failed" and the user types the details.
 */
import type { StudySourceType } from "@prisma/client";
import { fetchCoverUrl, youtubeThumbnail } from "./cover.js";
import { fetchGenericPreview } from "./genericPreview.js";
import { NO_LINK_INFO, extractIsbn, readBookLink } from "./bookLinks.js";
import { fetchBook, fetchVolume, type BookResult } from "./googleBooks.js";
import { fetchPodcast } from "./itunesPodcasts.js";
import { extractCourseId, fetchCourse } from "./nicosweg.js";
import { openLibraryByIsbn, searchOpenLibrary } from "./openLibrary.js";
import { buildCourseUnits, buildPlaylistUnits, type NewUnit } from "./units.js";
import { extractPlaylistId, extractVideoId, fetchPlaylist } from "./youtube.js";

export type FetchOutcome = "playlist" | "course" | "book" | "podcast" | "preview" | "manual" | "failed";

export interface SourceInput {
  type: StudySourceType;
  title?: string | null;
  url?: string | null;
  /** Books: an ISBN typed in the "Link or ISBN" field (a pasted book link comes in as `url`). */
  isbn?: string | null;
}

export interface SourceDetails {
  /** A "video" link that is really a YouTube playlist comes back as "youtube". */
  type: StudySourceType;
  title: string | null;
  provider: string | null;
  coverImageUrl: string | null;
  totalUnits: number | null;
  units: NewUnit[];
  outcome: FetchOutcome;
  /** Books: the page count, shown for information only — a book's units are its chapters, never its pages. */
  pageCount: number | null;
  /** Books found by a title search: the other close matches (other volumes, editions), to pick from. */
  candidates: BookResult[];
}

/**
 * Books. Everything that can identify the book runs at once rather than one after the other with a timeout each: an
 * ISBN (typed, or read off the link: Amazon's product id, a publisher or shop path), a Google Books link's volume id,
 * and a title search (what was typed, else the link's slug). An exact hit wins over the title search; a title search
 * also returns its runners-up so the user can pick the right volume (Menschen A1.1 vs A2 vs Arbeitsbuch).
 */
export async function lookupBook(input: SourceInput): Promise<{ book: BookResult | null; candidates: BookResult[] }> {
  const link = input.url ? await readBookLink(input.url) : NO_LINK_INFO;
  const isbn = (input.isbn && extractIsbn(input.isbn)) || link.isbn;
  const query = input.title?.trim() || link.titleHint;
  const [byIsbn, googleByIsbn, byGoogleId, ranked] = await Promise.all([
    isbn ? openLibraryByIsbn(isbn) : null,
    isbn ? fetchBook(`isbn:${isbn}`) : null, // null at once without a key
    link.googleId ? fetchVolume(link.googleId) : null,
    query ? searchOpenLibrary(query) : [],
  ]);
  const exact = byIsbn ?? byGoogleId ?? googleByIsbn;
  if (exact) return { book: exact, candidates: [] };
  if (ranked.length > 0) return { book: ranked[0]!, candidates: ranked.slice(1, 4) };
  return { book: query ? await fetchBook(query) : null, candidates: [] };
}

export async function fetchSourceDetails(input: SourceInput): Promise<SourceDetails> {
  const out: SourceDetails = {
    type: input.type,
    title: null,
    provider: null,
    coverImageUrl: null,
    totalUnits: null,
    units: [],
    outcome: "manual",
    pageCount: null,
    candidates: [],
  };
  const url = input.url?.trim() || null;
  const title = input.title?.trim() || null;

  // The Add-source type picker has no YouTube button: "Video" + a playlist link becomes "youtube" here.
  const playlistId = (input.type === "youtube" || input.type === "video") && url ? extractPlaylistId(url) : null;
  const courseId = input.type === "course" && url ? extractCourseId(url) : null;

  if (playlistId) {
    const playlist = await fetchPlaylist(playlistId);
    if (playlist) {
      out.units = buildPlaylistUnits(playlist.videos);
      out.title = playlist.title;
      out.type = "youtube";
      out.outcome = "playlist";
    } else out.outcome = "failed";
  } else if (courseId) {
    const course = await fetchCourse(courseId);
    if (course) {
      out.units = buildCourseUnits(course.lessons);
      out.title = course.title;
      out.provider = "DW"; // Deutsche Welle, the real org behind Nicos Weg
      out.outcome = "course";
    } else out.outcome = "failed";
  } else if (input.type === "book" && (title || url || input.isbn)) {
    const { book, candidates } = await lookupBook(input);
    if (book) {
      out.title = book.title;
      out.provider = book.authors.length > 0 ? book.authors.join(", ") : null;
      out.coverImageUrl = book.thumbnailUrl;
      out.pageCount = book.pageCount;
      out.candidates = candidates;
      out.outcome = "book";
    } else out.outcome = "failed";
  } else if (input.type === "audio" && title) {
    const podcast = await fetchPodcast(title);
    if (podcast) {
      out.title = podcast.trackName;
      out.provider = podcast.artistName;
      out.coverImageUrl = podcast.artworkUrl;
      out.totalUnits = podcast.trackCount;
      out.outcome = "podcast";
    } else out.outcome = "failed";
  } else if ((input.type === "youtube" || input.type === "video" || input.type === "article" || input.type === "link") && url) {
    // "youtube" lands here for a single video or a channel (no list= param)
    const preview = await fetchGenericPreview(url);
    if (preview) {
      out.title = preview.title;
      out.provider = preview.siteName;
      out.coverImageUrl = preview.imageUrl;
      out.outcome = "preview";
    } else out.outcome = "failed";
  }

  // Every source with a link gets a cover from it by default (a YouTube thumbnail, else the page's og:image); a
  // book's own cover wins over its shop page's image. Amazon answers server fetches with a bot check, so reading its
  // page only cost seconds and never found an image.
  const blockedShop = url ? /^https?:\/\/(?:[\w-]+\.)*(?:amazon\.[a-z.]+|amzn\.[a-z]+|a\.co)\//i.test(url) : false;
  if (url && !out.coverImageUrl && !blockedShop) out.coverImageUrl = await fetchCoverUrl(url, out.units);
  const videoId = url ? extractVideoId(url) : null;
  if (videoId) out.coverImageUrl = youtubeThumbnail(videoId);
  return out;
}

const PREVIEW_TTL_MS = 10 * 60_000;
const previewCache = new Map<string, { at: number; details: SourceDetails }>();
const cacheKey = (userId: string, input: SourceInput) =>
  [userId, input.type, input.url?.trim() ?? "", input.title?.trim().toLowerCase() ?? "", input.isbn?.trim() ?? ""].join("|");

/** fetchSourceDetails, remembered per user and input for a few minutes: the Add-source preview and the create that
 * follows it don't scrape the same playlist twice. Failures aren't remembered, so Fetch can retry. */
export async function fetchSourceDetailsCached(userId: string, input: SourceInput): Promise<SourceDetails> {
  const key = cacheKey(userId, input);
  const hit = previewCache.get(key);
  if (hit && Date.now() - hit.at < PREVIEW_TTL_MS) return hit.details;
  const details = await fetchSourceDetails(input);
  if (details.outcome !== "failed") previewCache.set(key, { at: Date.now(), details });
  for (const [k, v] of previewCache) if (Date.now() - v.at >= PREVIEW_TTL_MS) previewCache.delete(k);
  return details;
}

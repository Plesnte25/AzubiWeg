/**
 * One place that fills in a study source from what the user typed or pasted, for every source type (KNOWN_ISSUES
 * #34): a YouTube playlist's videos, a Nicos Weg course's lessons, a book (Open Library by ISBN or title, Google
 * Books as the fallback), a podcast (iTunes), or any page's OpenGraph title and image — plus a default cover from the
 * link. Shared by POST /sources/preview (fetch before save, nothing stored), POST /sources and a saved source's
 * "Fetch details". Every lookup is best-effort: a failure returns outcome "failed" and the user types the details.
 */
import type { StudySourceType } from "@prisma/client";
import { fetchCoverUrl, youtubeThumbnail } from "./cover.js";
import { fetchGenericPreview } from "./genericPreview.js";
import { fetchBook, type BookResult } from "./googleBooks.js";
import { fetchPodcast } from "./itunesPodcasts.js";
import { extractCourseId, fetchCourse } from "./nicosweg.js";
import { extractIsbn, openLibraryByIsbn, searchOpenLibrary } from "./openLibrary.js";
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
}

/** Books: exact by ISBN when there is one, else a ranked Open Library title search, else Google Books. */
async function lookupBook(input: SourceInput): Promise<BookResult | null> {
  const isbn = (input.isbn && extractIsbn(input.isbn)) || (input.url ? extractIsbn(input.url) : null);
  if (isbn) {
    const exact = await openLibraryByIsbn(isbn);
    if (exact) return exact;
  }
  const title = input.title?.trim();
  if (!title) return null;
  return (await searchOpenLibrary(title)) ?? (await fetchBook(title));
}

export async function fetchSourceDetails(input: SourceInput): Promise<SourceDetails> {
  const out: SourceDetails = { type: input.type, title: null, provider: null, coverImageUrl: null, totalUnits: null, units: [], outcome: "manual" };
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
    const book = await lookupBook(input);
    if (book) {
      out.title = book.title;
      out.provider = book.authors.length > 0 ? book.authors.join(", ") : null;
      out.coverImageUrl = book.thumbnailUrl;
      out.totalUnits = book.pageCount;
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
  // book's own cover wins over its shop page's image.
  if (url && !out.coverImageUrl) out.coverImageUrl = await fetchCoverUrl(url, out.units);
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

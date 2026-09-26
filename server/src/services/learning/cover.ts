import { fetchGenericPreview } from "./genericPreview.js";
import { extractVideoId } from "./youtube.js";

/** YouTube's own thumbnail for a video (hqdefault exists for every video; maxres doesn't). */
export const youtubeThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/**
 * A default cover for a source, from its link: the video's thumbnail for a YouTube video (or a playlist's first
 * video), else the page's og:image (a YouTube channel's avatar, a DW course's artwork, an article's lead image).
 * null when the page has none or can't be fetched. A cover the user uploads always wins over this.
 */
export async function fetchCoverUrl(url: string, units: { videoId?: string | null }[] = []): Promise<string | null> {
  const videoId = extractVideoId(url) ?? units.find((u) => u.videoId)?.videoId ?? null;
  if (videoId) return youtubeThumbnail(videoId);
  const preview = await fetchGenericPreview(url);
  // an http:// image is blocked as mixed content on the https app
  return preview?.imageUrl?.replace(/^http:\/\//, "https://") ?? null;
}

// YouTube playlist scraping — no API key. Playlist pages embed the video list
// in a `var ytInitialData = {...};` blob; we walk it for lockupViewModel
// nodes. Two caveats, both handled by callers via the manual fallback:
//   - pages embed only the first ~100 videos (longer playlists truncate);
//   - the blob is unversioned internals, and consent/region walls can serve a
//     page with no videos at all — 0 parsed videos is treated as failure.

export interface PlaylistVideo {
  videoId: string;
  title: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** list= param from playlist/watch URLs on youtube.com or youtu.be. */
export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host !== "youtube.com" && host !== "youtu.be") return null;
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

/** v= param or youtu.be/<id> path. */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host !== "youtube.com") return null;
    if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
      return u.pathname.split("/")[2] || null;
    }
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

interface LockupNode {
  contentId?: unknown;
  metadata?: { lockupMetadataViewModel?: { title?: { content?: unknown } } };
}

export function parsePlaylistHtml(html: string): { title: string | null; videos: PlaylistVideo[] } {
  const none = { title: null, videos: [] as PlaylistVideo[] };
  const start = html.indexOf("var ytInitialData = ");
  if (start === -1) return none;
  const jsonStart = start + "var ytInitialData = ".length;
  const end = html.indexOf(";</script>", jsonStart);
  if (end === -1) return none;

  let data: unknown;
  try {
    data = JSON.parse(html.slice(jsonStart, end));
  } catch {
    return none;
  }

  // generic key-walk instead of the exact tab path, so minor layout shuffles
  // in the blob don't break parsing
  const videos: PlaylistVideo[] = [];
  const seen = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.lockupViewModel && typeof obj.lockupViewModel === "object") {
      const lockup = obj.lockupViewModel as LockupNode;
      const videoId = lockup.contentId;
      const title = lockup.metadata?.lockupMetadataViewModel?.title?.content;
      if (typeof videoId === "string" && typeof title === "string" && !seen.has(videoId)) {
        seen.add(videoId);
        videos.push({ videoId, title });
      }
    }
    for (const value of Object.values(obj)) walk(value);
  };
  walk(data);

  const titleMatch = html.match(/<title>(.*?)(?: - YouTube)?<\/title>/s);
  return { title: titleMatch?.[1]?.trim() || null, videos };
}

/** null on any network/HTTP/parse failure — callers fall back to manual. */
export async function fetchPlaylist(
  playlistId: string,
): Promise<{ title: string | null; videos: PlaylistVideo[] } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const parsed = parsePlaylistHtml(await res.text());
    return parsed.videos.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

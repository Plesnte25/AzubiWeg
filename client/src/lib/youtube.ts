// client mirror of server/src/services/learning/youtube.ts URL helpers

export function youTubeVideoIdFromUrl(url: string): string | null {
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

export function youTubePlaylistIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host !== "youtube.com" && host !== "youtu.be") return null;
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

export function youTubeThumbUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function youTubeWatchUrl(videoId: string, playlistId?: string | null): string {
  const list = playlistId ? `&list=${encodeURIComponent(playlistId)}` : "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${list}`;
}

/**
 * Lesson descriptions for YouTube playlist sources (KNOWN_ISSUES #33). A playlist page has no per-video text, but
 * each watch page embeds the full description as "shortDescription" in its player JSON (no API key). Channels wrap
 * the useful part — the lesson heading, an overview paragraph, its bullets — in the same promo block, sign-off and
 * link lists on every video, so the boilerplate is found by comparing the playlist's videos, not by a hand-kept
 * blocklist: a line that appears in most of them is dropped. Parsing and cleaning are pure; the fetch runs in the
 * background after a playlist is added, and never overwrites a description the user already has or typed.
 *
 * Where the text comes from: with YOUTUBE_API_KEY set (free, Google Cloud → YouTube Data API v3), `videos.list`
 * returns 50 descriptions per request — the only way from the VPS, because YouTube answers a data-center IP's watch
 * page with "Sign in to confirm you're not a bot". Without a key it reads each watch page (~1.5 MB, one at a time),
 * which works from a home connection (local dev). Either way a failure leaves descriptions empty and nothing breaks.
 */
import { prisma } from "../../db.js";

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** The raw description from a watch page's player JSON, or null. */
export function parseShortDescription(html: string): string | null {
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  try {
    const text = JSON.parse(`"${m[1]}"`) as string;
    return text.trim() || null;
  } catch {
    return null;
  }
}

const norm = (line: string) => line.trim().replace(/\s+/g, " ").toLowerCase();
const URL_RE = /https?:\/\/|www\.\S+\.\S+|\b[a-z0-9-]+\.(?:com|de|me|gl|ly|be)\/\S*/i;
const JUNK_RE = [
  /^#\S+(\s+#\S+)*\s*$/, // hashtag-only lines
  /\bdownload\b.*\bhere\b/i, // "Download worksheet / TRANSCRIPT here:"
  /^(new!*|support us at:?|also visit us here:?|watch our playlists-?)$/i,
];

/**
 * The lesson part of each description: everything from "Related Videos:" on is cut; lines found in at least half of
 * the playlist's descriptions (with 3+ to compare) are boilerplate; hashtag lines, link lines and "Download … here"
 * lines go; bullets are tidied and blank runs collapsed. null when nothing useful is left.
 */
export function cleanDescriptions(raw: (string | null)[]): (string | null)[] {
  const cut = raw.map((d) => (d ? d.split(/\n\s*related videos\s*:?/i)[0]!.split("\n") : null));
  const present = cut.filter((l): l is string[] => l !== null);
  const counts = new Map<string, number>();
  for (const lines of present) for (const key of new Set(lines.map(norm).filter(Boolean))) counts.set(key, (counts.get(key) ?? 0) + 1);
  const threshold = present.length >= 3 ? Math.max(2, Math.ceil(present.length / 2)) : Infinity;

  return cut.map((lines) => {
    if (!lines) return null;
    const kept = lines
      .map((l) => l.replace(/[​‎‏]/g, "").replace(/^\s*(?:[•·▪◦*]|-{1,2})\s+/, "• ").trimEnd())
      .filter((l) => {
        const key = norm(l);
        if (!key) return true; // blank: kept for paragraph breaks, collapsed below
        if ((counts.get(key) ?? 0) >= threshold) return false;
        // a line that joins several boilerplate sentences ("Complement your learning … *Use Code A1LG10 …*") is
        // boilerplate too, even though that exact line appears only once
        const parts = l.split(/(?<=[.!?*])\s+(?=[*A-ZÄÖÜ])/).map(norm).filter(Boolean);
        if (parts.length > 1 && parts.every((p) => (counts.get(p) ?? 0) >= threshold)) return false;
        if (URL_RE.test(l)) return false;
        return !JUNK_RE.some((re) => re.test(key));
      });
    const text = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // same cap as a hand-edited lesson description (PATCH …/units/:unitId)
    return text.length >= 20 ? text.slice(0, 2000) : null;
  });
}

/** `videos.list?part=snippet` → description per video id. */
export function parseVideosResponse(body: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return out;
  for (const item of items as { id?: unknown; snippet?: { description?: unknown } }[]) {
    if (typeof item.id === "string" && typeof item.snippet?.description === "string" && item.snippet.description.trim()) {
      out.set(item.id, item.snippet.description);
    }
  }
  return out;
}

/** Descriptions via the YouTube Data API, 50 ids a request (1 quota unit each). */
async function fetchDescriptionsViaApi(videoIds: string[], key: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50).join(",");
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      for (const [id, d] of parseVideosResponse(await res.json())) out.set(id, d);
    } catch {
      // leave this batch empty
    }
  }
  return out;
}

async function fetchVideoDescription(videoId: string): Promise<string | null> {
  try {
    // a fixed youtube.com URL built from an 11-char id, never a user-supplied one
    if (!/^[\w-]{11}$/.test(videoId)) return null;
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return parseShortDescription(await res.text());
  } catch {
    return null;
  }
}

const running = new Set<string>();

/** Fills empty lesson descriptions of one YouTube playlist source. Safe to call more than once (one run per source
 * at a time); returns how many lessons got a description. */
export async function fillPlaylistDescriptions(sourceId: string, pauseMs = 800): Promise<number> {
  if (running.has(sourceId)) return 0;
  running.add(sourceId);
  try {
    const units = await prisma.studySourceUnit.findMany({
      where: { sourceId, videoId: { not: null } },
      orderBy: { position: "asc" },
      select: { id: true, videoId: true, description: true },
    });
    const todo = units.filter((u) => !u.description?.trim());
    if (todo.length === 0) return 0;
    const key = process.env.YOUTUBE_API_KEY?.trim();
    const raw: (string | null)[] = [];
    if (key) {
      const byId = await fetchDescriptionsViaApi(todo.map((u) => u.videoId!), key);
      for (const u of todo) raw.push(byId.get(u.videoId!) ?? null);
    } else {
      for (const u of todo) {
        raw.push(await fetchVideoDescription(u.videoId!));
        await new Promise((r) => setTimeout(r, pauseMs));
      }
    }
    const cleaned = cleanDescriptions(raw);
    let filled = 0;
    for (const [i, u] of todo.entries()) {
      const description = cleaned[i];
      if (!description) continue;
      // never overwrite a description typed while this ran
      const { count } = await prisma.studySourceUnit.updateMany({ where: { id: u.id, OR: [{ description: null }, { description: "" }] }, data: { description } });
      filled += count;
    }
    return filled;
  } finally {
    running.delete(sourceId);
  }
}

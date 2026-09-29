// Generic OpenGraph/meta-tag scrape for video/article/link sources — no API
// key, built on the same SSRF-safe fetch (blocked private/link-local/cloud-
// metadata IP ranges) already used for job-posting previews. Link cards
// render lighter than video/article ones (title+domain only, per the
// design spec — no thumbnail/progress), but the underlying fetch is the
// same for all three; the client just chooses what to display.

import { extractMetaTags, extractTitle, fetchHtml } from "../shared/safeFetch.js";

const USER_AGENT = "AzubiWeg/1.0 (source link preview)";

export interface GenericPreviewResult {
  title: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

function portalFromHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

/** Pure response parsing, split out for tests. */
export function parseGenericPreview(html: string, hostname: string): GenericPreviewResult {
  const meta = extractMetaTags(html);
  const title = meta.get("og:title")?.trim() || extractTitle(html);
  const imageUrl = meta.get("og:image")?.trim() || null;
  const siteName = meta.get("og:site_name")?.trim() || portalFromHostname(hostname);
  return { title: title || null, imageUrl, siteName };
}

// YouTube pages put their og: tags ~750 KB in (after the inline player JSON), past the usual 300 KB read: a channel
// link got no avatar as its cover (KNOWN_ISSUES #33). YouTube hosts get a bigger read.
const YOUTUBE_MAX_BYTES = 1_500_000;
const isYouTube = (rawUrl: string) => {
  try {
    return /(^|\.)youtube\.com$/.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
};

/** null on any network/HTTP/timeout/non-HTML failure — callers fall back to manual. */
export async function fetchGenericPreview(rawUrl: string): Promise<GenericPreviewResult | null> {
  const fetched = await fetchHtml(rawUrl, USER_AGENT, isYouTube(rawUrl) ? YOUTUBE_MAX_BYTES : undefined);
  if (!fetched) return null;
  return parseGenericPreview(fetched.html, new URL(fetched.finalUrl).hostname);
}

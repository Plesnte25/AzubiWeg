import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 300_000;
const MAX_REDIRECTS = 5;

/**
 * Blocks loopback/private/link-local ranges — including 169.254.169.254,
 * the cloud metadata IP every major provider uses — since a pasted URL is
 * the one place user input reaches an outbound server-side fetch. Shared by
 * every feature that fetches a user-pasted URL server-side (job postings,
 * source previews for video/article/link types) — the SSRF-safety logic
 * lives in exactly one place.
 */
function isBlockedIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const embedded = lower.slice("::ffff:".length);
    if (isIP(embedded) === 4) return isBlockedIp(embedded);
  }
  return false;
}

export async function hostIsSafe(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isBlockedIp(hostname);
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isBlockedIp(a.address));
  } catch {
    return false;
  }
}

/** Fetches with a manual redirect loop so every hop (not just the first) is DNS-checked. */
export async function safeFetch(startUrl: URL, signal: AbortSignal, userAgent: string): Promise<Response | null> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!(await hostIsSafe(url.hostname))) return null;

    const res = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { "User-Agent": userAgent },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    return res;
  }
  return null;
}

export function extractMetaTags(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  const tagRe = /<meta\b[^>]*>/gi;
  const attrRe = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g;
  for (const tagMatch of html.matchAll(tagRe)) {
    const attrs: Record<string, string> = {};
    for (const a of tagMatch[0].matchAll(attrRe)) {
      const key = (a[1] ?? a[3])?.toLowerCase();
      const val = a[2] ?? a[4];
      if (key !== undefined) attrs[key] = val;
    }
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content !== undefined) meta.set(key.toLowerCase(), attrs.content);
  }
  return meta;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() || null : null;
}

/** Fetches a URL's HTML with the shared SSRF-safe machinery, capped at
 * MAX_BYTES and FETCH_TIMEOUT_MS. Returns null on any failure (bad URL,
 * blocked host, timeout, non-HTML response) — never throws, so callers can
 * always fall back to manual entry. */
export async function fetchHtml(rawUrl: string, userAgent: string): Promise<{ html: string; finalUrl: string } | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await safeFetch(url, controller.signal, userAgent);
    if (!res || !res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    if (!res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks).toString("utf-8");
    return { html, finalUrl: res.url || url.toString() };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

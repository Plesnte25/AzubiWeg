import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface JobPreview {
  company: string | null;
  role: string | null;
  location: string | null;
  portal: string | null;
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 300_000;
const MAX_REDIRECTS = 5;

/**
 * Blocks loopback/private/link-local ranges — including 169.254.169.254,
 * the cloud metadata IP every major provider uses (this app runs on a GCP
 * VPS), since a pasted job-posting URL is the one place user input reaches
 * an outbound server-side fetch.
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

async function hostIsSafe(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isBlockedIp(hostname);
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isBlockedIp(a.address));
  } catch {
    return false;
  }
}

/** Fetches with a manual redirect loop so every hop (not just the first) is DNS-checked. */
async function safeFetch(startUrl: URL, signal: AbortSignal): Promise<Response | null> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!(await hostIsSafe(url.hostname))) return null;

    const res = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { "User-Agent": "AzubiWeg/1.0 (job posting preview)" },
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

function extractMetaTags(html: string): Map<string, string> {
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

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() || null : null;
}

/** Finds a JobPosting node (schema.org, embedded by most job boards for Google for Jobs). */
function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return obj;
  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const g of graph) {
      const found = findJobPosting(g);
      if (found) return found;
    }
  }
  return null;
}

function extractJobPosting(html: string): Record<string, unknown> | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(scriptRe)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const candidate of Array.isArray(parsed) ? parsed : [parsed]) {
      const found = findJobPosting(candidate);
      if (found) return found;
    }
  }
  return null;
}

function stringField(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) return stringField(v[0]);
  if (v && typeof v === "object") {
    const name = (v as Record<string, unknown>).name;
    if (typeof name === "string") return name.trim() || null;
  }
  return null;
}

function locationField(jobPosting: Record<string, unknown>): string | null {
  const jobLocation = jobPosting.jobLocation;
  const loc = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  if (!loc || typeof loc !== "object") return null;
  const address = (loc as Record<string, unknown>).address;
  if (typeof address === "string") return address.trim() || null;
  if (address && typeof address === "object") {
    const a = address as Record<string, unknown>;
    const locality = typeof a.addressLocality === "string" ? a.addressLocality : null;
    const region = typeof a.addressRegion === "string" ? a.addressRegion : null;
    return locality ?? region ?? null;
  }
  return null;
}

function portalFromHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

export function parseJobPreview(html: string, hostname: string): JobPreview {
  const meta = extractMetaTags(html);
  const portal = meta.get("og:site_name")?.trim() || portalFromHostname(hostname);

  const jobPosting = extractJobPosting(html);
  if (jobPosting) {
    return {
      role: stringField(jobPosting.title),
      company: stringField(jobPosting.hiringOrganization),
      location: locationField(jobPosting),
      portal,
    };
  }

  // fallback: no structured data, guess from the page title
  const title = meta.get("og:title")?.trim() || extractTitle(html);
  if (!title) return { role: null, company: null, location: null, portal };

  const parts = title
    .split(/\s+(?:bei|@)\s+|\s[-|–—]\s/)
    .map((s) => s.trim())
    .filter(Boolean);
  const role = parts[0] ?? null;
  const company = parts.length > 1 && parts[1].toLowerCase() !== portal.toLowerCase() ? parts[1] : null;
  return { role, company, location: null, portal };
}

/**
 * Best-effort scrape of a pasted job-posting URL. Never throws — any
 * failure (bad URL, blocked host, timeout, non-HTML response) resolves to
 * `null` so the caller can fall back to manual entry without a hard error.
 */
export async function fetchJobPreview(rawUrl: string): Promise<JobPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await safeFetch(url, controller.signal);
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
    return parseJobPreview(html, new URL(res.url || url).hostname);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

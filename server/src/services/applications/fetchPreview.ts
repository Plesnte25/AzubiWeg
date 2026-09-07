import { extractMetaTags, extractTitle, fetchHtml } from "../shared/safeFetch.js";

export interface JobPreview {
  company: string | null;
  role: string | null;
  location: string | null;
  portal: string | null;
}

const USER_AGENT = "AzubiWeg/1.0 (job posting preview)";

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
  const fetched = await fetchHtml(rawUrl, USER_AGENT);
  if (!fetched) return null;
  return parseJobPreview(fetched.html, new URL(fetched.finalUrl).hostname);
}

import type { GermanLevel } from "@prisma/client";
import { extractMetaTags, extractTitle, fetchHtml } from "../shared/safeFetch.js";

export interface JobPreview {
  company: string | null;
  role: string | null;
  location: string | null;
  portal: string | null;
  /** German level the posting asks for, when it says (detectGermanLevel); null = unknown, no badge. */
  germanLevel: GermanLevel | null;
}

const LEVELS: GermanLevel[] = ["a1", "a2", "b1", "b2", "c1", "c2"];
// Language mentions that decide whose level a CEFR token is. Generic "Sprachniveau"/"Niveau" count as German: a
// German posting that says "Sprachniveau B1" without naming the language means German.
const LANGUAGE_MENTION = /(deutsch|german|sprachniveau|sprachkenntnis|\bniveau\b|\bger\b)|(englisch|english)/g;

/** "german" | "english" | null for the language mention nearest to the token: the last one before it (postings
 * name the language first, "Deutsch B2"), else the first one shortly after ("B2-Deutschkenntnisse"). */
function tokenLanguage(before: string, after: string): "german" | "english" | null {
  const prev = [...before.matchAll(LANGUAGE_MENTION)].at(-1);
  if (prev) return prev[1] ? "german" : "english";
  const next = after.match(new RegExp(LANGUAGE_MENTION.source));
  if (next) return next[1] ? "german" : "english";
  return null;
}

/**
 * The German level a job posting asks for, or null when it doesn't say. Explicit CEFR levels win: an A1–C2 token
 * counts when the nearest language mention is German — the last one within ~80 characters before it, else the first
 * shortly after ("Deutsch B2 und Englisch C1" → B2); if several count, the lowest is the requirement
 * ("mindestens B1, B2 wünschenswert" → B1). Without one, common German phrasing maps to its usual level:
 * Muttersprache C2 · sehr gut / fließend / verhandlungssicher C1 · gute Deutschkenntnisse B2 · Grundkenntnisse A2.
 * Best-effort by design: the user can always override it.
 */
export function detectGermanLevel(rawText: string): GermanLevel | null {
  const text = rawText.replace(/\s+/g, " ");
  const lower = text.toLowerCase();

  const found: number[] = [];
  for (const m of text.matchAll(/\b([ABC][12])\b/g)) {
    const before = lower.slice(Math.max(0, m.index - 80), m.index);
    const after = lower.slice(m.index + 2, m.index + 42);
    if (tokenLanguage(before, after) === "german") found.push(LEVELS.indexOf(m[1]!.toLowerCase() as GermanLevel));
  }
  if (found.length > 0) return LEVELS[Math.min(...found)]!;

  if (/muttersprach|deutsch als erstsprache|native (german|speaker)/.test(lower)) return "c2";
  if (
    /(sehr gute|fließende|fliessende|fließend|fliessend|verhandlungssichere?|exzellente|excellent|fluent)[^.]{0,25}(deutsch|german)/.test(lower) ||
    /deutsch[^.]{0,25}(fließend|fliessend|verhandlungssicher)/.test(lower)
  )
    return "c1";
  if (/(?<!sehr )gute (deutschkenntnisse|deutsch|kenntnisse der deutschen sprache)|good (command of )?german/.test(lower)) return "b2";
  if (/(grund|basis)kenntnisse[^.]{0,15}deutsch|deutsch[^.]{0,20}grundkenntnisse|basic german/.test(lower)) return "a2";
  return null;
}

/** Visible text of an HTML fragment or page, for level detection. */
function htmlText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
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
    const postingText = ["description", "qualifications", "skills", "experienceRequirements"]
      .map((k) => (typeof jobPosting[k] === "string" ? (jobPosting[k] as string) : ""))
      .join(" ");
    return {
      role: stringField(jobPosting.title),
      company: stringField(jobPosting.hiringOrganization),
      location: locationField(jobPosting),
      portal,
      germanLevel: detectGermanLevel(htmlText(postingText)) ?? detectGermanLevel(htmlText(html)),
    };
  }
  const germanLevel = detectGermanLevel(htmlText(html));

  // fallback: no structured data, guess from the page title
  const title = meta.get("og:title")?.trim() || extractTitle(html);
  if (!title) return { role: null, company: null, location: null, portal, germanLevel };

  const parts = title
    .split(/\s+(?:bei|@)\s+|\s[-|–—]\s/)
    .map((s) => s.trim())
    .filter(Boolean);
  const role = parts[0] ?? null;
  const company = parts.length > 1 && parts[1].toLowerCase() !== portal.toLowerCase() ? parts[1] : null;
  return { role, company, location: null, portal, germanLevel };
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

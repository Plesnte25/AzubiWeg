/**
 * What a pasted book link tells us before any lookup: an ISBN, a Google Books volume id, and a title from the
 * link's own slug. Shop pages (Amazon above all) block server fetches, so nothing here reads the page itself; the
 * link alone is usually enough. Amazon's book links carry the ISBN-10 as the product id, Hueber / Klett / Thalia /
 * buecher.de put the ISBN-13 somewhere in the path, and Amazon and Google Books both put the title in the path.
 */

export interface BookLinkInfo {
  isbn: string | null;
  googleId: string | null;
  /** The title as the link's slug spells it ("Menschen-A2-Kursbuch-Sandra-Evans" → "Menschen A2 Kursbuch Sandra Evans"). */
  titleHint: string | null;
}

export const NO_LINK_INFO: BookLinkInfo = { isbn: null, googleId: null, titleHint: null };

/** Checksum test, so a random 10- or 13-digit run (an order number, a timestamp) isn't taken for an ISBN. */
export function isValidIsbn(raw: string): boolean {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (10 - i) * (s[i] === "X" ? 10 : Number(s[i]));
    return sum % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 ? 3 : 1);
    return sum % 10 === 0;
  }
  return false;
}

const clean = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

/** An ISBN-10/13 typed on its own or found anywhere in a link. Only checksum-valid numbers count. */
export function extractIsbn(input: string): string | null {
  const s = input.trim();
  if (isValidIsbn(s) && /^[\d\sXx-]+$/.test(s)) return clean(s);
  // labelled or product-id positions first: isbn=…, /isbn/…, Amazon /dp/…, /gp/product/…, /ASIN/…, Google vid=ISBN…
  const labelled = s.match(/(?:isbn[=/:]|vid=isbn|\/dp\/|\/gp\/product\/|\/asin\/|\/product\/)((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx])/i);
  if (labelled && isValidIsbn(labelled[1]!)) return clean(labelled[1]!);
  // then any 978/979 run in the link (shop and publisher pages: hueber.de/…/978-3-19-…, thalia.de/…/A1234?ean=…)
  for (const m of s.matchAll(/(?<!\d)(97[89](?:[-\s]?\d){10})(?!\d)/g)) if (isValidIsbn(m[1]!)) return clean(m[1]!);
  return null;
}

function slugToTitle(slug: string): string | null {
  let s = slug;
  try {
    s = decodeURIComponent(slug);
  } catch {
    /* keep the raw slug */
  }
  s = s.replace(/\.html?$/i, "").replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  // "_" (Google's placeholder) or a bare id isn't a title
  if (s.length < 3 || !/[a-zäöüß]{2}/i.test(s) || /^[A-Z0-9]{10}$/.test(s)) return null;
  return s;
}

export function parseBookLink(url: string): BookLinkInfo {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { ...NO_LINK_INFO, isbn: extractIsbn(url) };
  }
  const host = u.hostname.toLowerCase();
  const path = u.pathname;
  const isbn = extractIsbn(url);
  let googleId: string | null = null;
  let titleHint: string | null = null;

  if (/(^|\.)amazon\./.test(host)) {
    // /Menschen-A2-Kursbuch-Sandra-Evans/dp/3191019022 — the slug sits right before /dp/
    const m = path.match(/\/([^/]+)\/(?:dp|gp\/product)\//);
    if (m && m[1] !== "-") titleHint = slugToTitle(m[1]!);
  } else if (/(^|\.)(books\.google\.|google\.)/.test(host) || host === "play.google.com") {
    const id = u.searchParams.get("id");
    if (id && /^[\w-]{10,14}$/.test(id)) googleId = id;
    // google.com/books/edition/Menschen_A2_Kursbuch/AbCdEfGhIjK
    const edition = path.match(/\/books\/edition\/([^/]*)\/([\w-]{10,14})/);
    if (edition) {
      googleId ??= edition[2]!;
      titleHint = slugToTitle(edition[1]!);
    }
    // books.google.de/books/about/Menschen_A2.html?id=…
    const about = path.match(/\/books\/about\/([^/]+)/);
    if (about) titleHint = slugToTitle(about[1]!);
  }
  return { isbn, googleId, titleHint };
}

/** Amazon's share links (amzn.eu/d/…, a.co/d/…) say nothing until they're followed; only the redirect is read. */
const SHORT_LINK = /^https?:\/\/(?:www\.)?(?:amzn\.(?:eu|to|com|asia)|a\.co)\//i;

export async function resolveShortLink(url: string): Promise<string> {
  let current = url.trim();
  for (let hop = 0; hop < 3 && SHORT_LINK.test(current); hop++) {
    try {
      const res = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(4_000) });
      const next = res.headers.get("location");
      if (!next) break;
      current = new URL(next, current).toString();
    } catch {
      break;
    }
  }
  return current;
}

export async function readBookLink(url: string): Promise<BookLinkInfo> {
  return parseBookLink(await resolveShortLink(url));
}

/**
 * PONS Dictionary API — a live, in-memory, server-log-only diagnostic,
 * never a source of truth. Ported from add_word.py's PONS integration
 * (~/.claude/plans/your-current-pipeline-is-shiny-raven.md) with the same
 * Terms-of-Use finding driving the same constraint: PONS's ToS forbids
 * persisting/extending "tables or databases" from its output, and even
 * short of raw persistence, letting it influence a stored decision (sense
 * selection, the review flag) would still be a durable effect derived from
 * a response this app has no license to keep. So this module never selects
 * a sense, never sets/clears `curation`/`reviewNote`, never contributes
 * text to a `Word` row or the vault — `runPonsDiagnostic()` returns
 * nothing; the only observable effect is one sanitized line to the server
 * log, for whoever happens to be watching it.
 *
 * Request-scoped budget, not module-level: unlike the Python CLI (one
 * process per invocation, so a module-level counter naturally resets),
 * this is a long-lived, multi-user server — a module-level counter would
 * either never reset or incorrectly share its cap across unrelated users'
 * requests. Callers create one `PonsBudget` per incoming HTTP request (see
 * routes/words.ts) and thread it through every enrichResolved() call in
 * that request's word batch, exactly mirroring the Python script's
 * per-run cap but scoped to "one request" instead of "one process."
 */

const PONS_ENDPOINT = "https://api.pons.com/v1/dictionary";
const USER_AGENT = "AzubiWeg/1.0 (personal study tool)";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRY_AFTER_S = 10;
const MAX_CANDIDATES = 3;

// Counts every actual HTTP request, including a 5xx/429 retry -- not
// "eligible words" -- same convention as the Python version.
export const PONS_MAX_REQUESTS_PER_BATCH = 25;

export interface PonsBudget {
  remaining: number;
  disabled: boolean;
}

/** One per incoming HTTP request that adds words -- never reused across
 * requests or shared between users. `disabled` starts true whenever
 * `PONS_API_KEY` isn't set, so the whole module is a true no-op by default
 * on any deployment that hasn't opted in. */
export function createPonsBudget(): PonsBudget {
  return { remaining: PONS_MAX_REQUESTS_PER_BATCH, disabled: !process.env.PONS_API_KEY };
}

const HTML_TAG_RE = /<[^>]+>/g;
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/g;

/** Never trust PONS response text to be clean before printing/logging it —
 * strip HTML/control characters, collapse whitespace, cap length. */
export function ponsSanitize(text: string, maxLen = 60): string {
  return text
    .replace(HTML_TAG_RE, "")
    .replace(CONTROL_CHAR_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

interface PonsTranslation {
  target?: string;
}
interface PonsArab {
  translations?: PonsTranslation[];
}
interface PonsRom {
  arabs?: PonsArab[];
}
interface PonsHit {
  type?: string;
  primary_entry?: PonsHit;
  roms?: PonsRom[];
}

/** Up to 3 sanitized translation candidates from a PONS response's `hits`
 * array, same shape and cap as the Python version's _pons_lookup(). */
export function extractPonsCandidates(hits: PonsHit[]): string[] {
  const candidates: string[] = [];
  outer: for (const hit of hits) {
    const entry = hit.type === "entry_with_secondary_entries" ? (hit.primary_entry ?? hit) : hit;
    if (entry.type !== "entry" && entry.type !== "entry_with_secondary_entries") continue;
    for (const rom of entry.roms ?? []) {
      for (const arab of rom.arabs ?? []) {
        for (const t of arab.translations ?? []) {
          if (t.target) candidates.push(ponsSanitize(t.target));
          if (candidates.length >= MAX_CANDIDATES) break outer;
        }
      }
    }
  }
  return candidates;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ponsRequest(word: string): Promise<Response> {
  const params = new URLSearchParams({ q: word, l: "deen", in: "de", ref: "true", fm: "1" });
  return fetch(`${PONS_ENDPOINT}?${params}`, {
    headers: { "X-Secret": process.env.PONS_API_KEY!, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * Prints a live suggestion to the server log for whoever's watching it,
 * e.g. "[PONS diagnostic for Schloss: castle / lock]". Returns nothing —
 * callers must not use this for anything but the log line. Every failure
 * mode (timeout, malformed JSON, non-2xx) is swallowed here: PONS is a
 * bonus signal, and must never throw into or otherwise affect the real
 * enrichment path that called it.
 */
export async function runPonsDiagnostic(word: string, budget: PonsBudget): Promise<void> {
  if (budget.disabled || budget.remaining <= 0) return;

  let res: Response;
  try {
    budget.remaining--;
    res = await ponsRequest(word);
  } catch {
    return; // network error/timeout -- skip this word's diagnostic only
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    if (Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= MAX_RETRY_AFTER_S && budget.remaining > 0) {
      await delay(retryAfter * 1000);
      try {
        budget.remaining--;
        res = await ponsRequest(word);
      } catch {
        return;
      }
    } else {
      budget.disabled = true;
      return;
    }
  } else if (res.status >= 500 && res.status < 600) {
    if (budget.remaining <= 0) return;
    try {
      budget.remaining--;
      res = await ponsRequest(word);
    } catch {
      return;
    }
  }

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    console.warn(`[PONS disabled for this batch: HTTP ${res.status}]`);
    budget.disabled = true;
    return;
  }
  if (res.status === 204) return;
  if (res.status !== 200) return; // any remaining 5xx after the retry -- skip this word only
  if (!(res.headers.get("Content-Type") ?? "").includes("json")) return;

  let hits: PonsHit[];
  try {
    const data = (await res.json()) as { hits?: PonsHit[] };
    hits = data.hits ?? [];
  } catch {
    console.warn("[PONS disabled for this batch: malformed response]");
    budget.disabled = true;
    return;
  }

  const candidates = extractPonsCandidates(hits);
  if (candidates.length) {
    // `word` is usually a trusted Kaikki-DB headword, but when nothing was
    // found in the local dump at all, resolveViaKaikki's fallback carries
    // the raw typed string through as `headword` -- and that's exactly the
    // case that sets source: "translation", which makes this diagnostic
    // eligible. addSchema only bounds length, not character content, so a
    // direct API call (not just the UI's textarea) could smuggle a
    // newline/control character into the server log here. Sanitize it the
    // same as any other untrusted text before logging.
    console.log(`[PONS diagnostic for ${ponsSanitize(word, 60)}: ${candidates.join(" / ")}]`);
  }
}

/**
 * Broader than the review-flag signal alone — also worth a cheap, capped
 * PONS call whenever an inflected-form hop happened (`formNote`), since
 * that's a useful terminal hint even though it doesn't by itself warrant a
 * review flag. No `pos_block_not_found`-equivalent case here (unlike the
 * Python version): kaikki.org gives clean, already-separated per-POS
 * entries, so there's no wikitext-section-scoping failure mode to signal.
 * Deliberately NOT called for the `unresolved` outcome (no meaning found at
 * all) — same as the Python version, which only ever calls this on the
 * "a meaning was found" path.
 */
export function ponsDiagnosticEligible(needsReview: boolean, formNote: string | null): boolean {
  return needsReview || formNote !== null;
}

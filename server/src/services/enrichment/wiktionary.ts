/**
 * Wiktionary lookups, ported from add_word.py. Same endpoints, same
 * best-effort extraction rules, so app-added and script-added cards are
 * indistinguishable in the vault.
 */

const USER_AGENT = "DeutschlandCompanion/1.0 (personal study tool)";
const REQUEST_TIMEOUT_MS = 10_000;

/** Retries on HTTP 429 — Wiktionary rate-limits under normal batch use. */
async function getWithRetry(url: string): Promise<Response> {
  let delay = 2000;
  let res!: Response;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return res;
}

/** Short English meaning from the en.wiktionary REST API, or null. */
export async function getMeaning(word: string): Promise<string | null> {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  try {
    const res = await getWithRetry(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<
      string,
      { partOfSpeech?: string; definitions?: { definition?: string }[] }[]
    >;
    const deEntries = data.de;
    if (!deEntries) return null;
    const pieces: string[] = [];
    for (const entry of deEntries) {
      const pos = entry.partOfSpeech ?? "";
      for (const d of (entry.definitions ?? []).slice(0, 1)) {
        const text = (d.definition ?? "").replace(/<[^<]+?>/g, "").trim();
        if (text) pieces.push(pos ? `(${pos}) ${text}` : text);
      }
    }
    return pieces.length ? pieces.slice(0, 2).join("; ") : null;
  } catch {
    return null;
  }
}

/** Raw wikitext from de.wiktionary — source for IPA, audio, gender, grammar, example. */
export async function getDeWikitext(word: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: word,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    format: "json",
  });
  try {
    const res = await getWithRetry(`https://de.wiktionary.org/w/api.php?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, any> };
    };
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || "missing" in page) return null;
    return page.revisions?.[0]?.slots?.main?.["*"] ?? null;
  } catch {
    return null;
  }
}

export function extractIpa(wikitext: string | null): string | null {
  const m = wikitext?.match(/\{\{Lautschrift\|([^}|]+)/);
  return m ? m[1]!.trim() : null;
}

export function extractAudioFilename(wikitext: string | null): string | null {
  if (!wikitext) return null;
  let m = wikitext.match(/\{\{Audio\|([^|}]+)/);
  if (m) return m[1]!.trim();
  m = wikitext.match(/\[\[Datei:([^|\]]+\.(?:ogg|oga|mp3|wav))/i);
  return m ? m[1]!.trim() : null;
}

/** Best-effort: 'der', 'die', 'das', or null. */
export function extractGender(wikitext: string | null): string | null {
  const m = wikitext?.match(/\|Genus=(\w)/);
  if (!m) return null;
  return { m: "der", f: "die", n: "das" }[m[1]!.toLowerCase()] ?? null;
}

export function extractPlural(wikitext: string | null): string | null {
  const m = wikitext?.match(/\|Nominativ Plural=([^\n|]+)/);
  return m ? m[1]!.trim() : null;
}

/** Best-effort principal parts for verbs, e.g. 'sieht, sah, hat gesehen'. */
export function extractVerbForms(wikitext: string | null): string | null {
  if (!wikitext) return null;
  const present = wikitext.match(/\|Präsens_er, sie, es=([^\n|]+)/);
  const past = wikitext.match(/\|Präteritum_ich=([^\n|]+)/);
  const perfect = wikitext.match(/\|Partizip II=([^\n|]+)/);
  const aux = wikitext.match(/\|Hilfsverb=([^\n|]+)/);
  if (!present && !past && !perfect) return null;
  const parts: string[] = [];
  if (present) parts.push(present[1]!.trim());
  if (past) parts.push(past[1]!.trim());
  if (perfect) {
    const auxWord = aux ? aux[1]!.trim() : "hat";
    parts.push(`${auxWord} ${perfect[1]!.trim()}`);
  }
  return parts.length ? parts.join(", ") : null;
}

/**
 * Shortest example sentence from the '{{Beispiele}}' section — the section
 * scoping matters: '{{Bedeutungen}}' uses the same ':[1]' numbering and comes
 * first, so a whole-page search would match the definition gloss instead.
 */
export function extractExample(wikitext: string | null): string | null {
  if (!wikitext) return null;
  const section = wikitext.match(/\{\{Beispiele\}\}([\s\S]*?)(?=\n\{\{|$)/);
  if (!section) return null;
  const candidates = [...section[1]!.matchAll(/:\[1\]\s*(.+)/g)].map((m) => m[1]!);
  const cleaned: string[] = [];
  for (let text of candidates) {
    text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ""); // strip citations
    text = text.replace(/\{\{.*?\}\}/g, ""); // strip templates
    text = text.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1"); // strip wikilinks
    text = text.replaceAll("''", ""); // strip wiki-italic markers
    text = text.replace(/^[ '"„“]+|[ '"„“]+$/g, "");
    if (text) cleaned.push(text);
  }
  if (!cleaned.length) return null;
  return cleaned.reduce((a, b) => (b.length < a.length ? b : a));
}

export function buildGrammarNote(wikitext: string | null): string | null {
  const verbForms = extractVerbForms(wikitext);
  if (verbForms) return verbForms;
  const gender = extractGender(wikitext);
  if (gender) {
    const plural = extractPlural(wikitext);
    return plural ? `${gender}; Plural: die ${plural}` : gender;
  }
  return null;
}

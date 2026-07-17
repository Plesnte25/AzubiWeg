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

// ============================================================
// Word resolution + meaning (port of add_word.py's resolve_word pipeline).
// Two problems this solves beyond a bare definition fetch:
//  - Wiktionary titles are case-sensitive and iOS auto-capitalizes, so
//    "Bist" 404s while "bist" exists -> try case variants.
//  - Inflected forms ("bist", "schwamm", "Bücher") only carry a
//    "form of <lemma>" definition -> follow it and file the card under
//    the lemma, keeping a Form: note about what was actually typed.
// ============================================================

export interface Resolution {
  headword: string;
  typed: string;
  formNote: string | null;
  meaning: string | null;
}

type DefinitionEntry = { partOfSpeech?: string; definitions?: { definition?: string }[] };

/** German part-of-speech blocks for an exact page title, or null. */
export async function fetchDefinitionEntries(word: string): Promise<DefinitionEntry[] | null> {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  try {
    const res = await getWithRetry(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, DefinitionEntry[]>;
    return data.de?.length ? data.de : null;
  } catch {
    return null;
  }
}

function unescapeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

export function stripTags(html: string): string {
  // inline template CSS would survive tag stripping as literal text
  html = html.replace(/<style[\s\S]*?<\/style>/g, "");
  // list items ("inflection of wohnen: <ol><li>...</li>...") would run
  // together without a separator once tags go
  html = html.replace(/<\/li>\s*<li>/g, ", ");
  const text = html.replace(/<[^<]+?>/g, "");
  return unescapeEntities(text).split(/\s+/).filter(Boolean).join(" ").trim();
}

// Derivational relations stay their own words: "Lehrer = agent noun of
// lehren" must NOT collapse into a card for lehren the way "bist" -> "sein"
// does. Inflections (person/tense/case/plural/degree) do get followed.
const DERIVATIONAL_RE =
  /\b(agent noun|female equivalent|diminutive|augmentative|verbal noun|gerund) of\b/i;

/**
 * For inflected-form senses ("second-person singular present of sein"),
 * returns [lemma, plain-text form description]; null for regular senses.
 * Must run on the raw HTML -- the lemma link is only identifiable by its
 * form-of-definition-link class, which tag stripping would destroy.
 */
export function extractLemma(definitionHtml: string): [string, string] | null {
  if (!definitionHtml.includes("form-of-definition")) return null;
  const m = definitionHtml.match(/form-of-definition-link[\s\S]*?<a[^>]*\btitle="([^"]+)"/);
  if (!m) return null;
  const lemma = m[1]!.split("#")[0]!.trim();
  if (!lemma) return null;
  let desc = stripTags(definitionHtml);
  if (DERIVATIONAL_RE.test(desc)) return null;
  if (desc.length > 120) {
    const cut = desc.lastIndexOf(",", 120);
    desc = (cut > 0 ? desc.slice(0, cut) : desc.slice(0, 120).trimEnd()) + ", ...";
  }
  return [lemma, desc];
}

function cleanSenseText(html: string): string {
  let text = stripTags(html);
  // gloss parentheticals ("book (collection of sheets of paper...)") add
  // nothing once you know the headword -- drop them (loop: they nest)
  // unless they ARE the whole definition
  let withoutParens = text;
  for (;;) {
    const shrunk = withoutParens.replace(/\s*\([^()]*\)/g, "");
    if (shrunk === withoutParens) break;
    withoutParens = shrunk;
  }
  if (withoutParens.replace(/[ ;,.]/g, "").length) text = withoutParens;
  text = text.split(/\s+/).filter(Boolean).join(" ").replace(/^[ ;,]+|[ ;,]+$/g, "");
  // "As a copulative verb: to be" -> "to be" (use-with-mention preamble)
  text = text.replace(/^As an? [^:]{1,30}: /, "");
  if (text.length > 90) {
    const cut = Math.max(text.lastIndexOf(";", 90), text.lastIndexOf(",", 90));
    text = cut > 0 ? text.slice(0, cut) : text.slice(0, 90).trimEnd();
  }
  const opens = (text.match(/\(/g) ?? []).length;
  const closes = (text.match(/\)/g) ?? []).length;
  if (opens > closes) {
    text = text.slice(0, text.lastIndexOf("(")).replace(/[ ,;]+$/g, "");
  }
  return text;
}

/**
 * One sense's HTML -> a short plain gloss. A sense sometimes embeds its
 * sub-senses as a list ("center, centre <ol><li>central point...</li>...");
 * the part before the list is the gloss -- unless it's only a preamble
 * ("As a copulative verb:"), in which case clean the whole thing.
 */
export function cleanDefinition(definitionHtml: string): string {
  const beforeList = definitionHtml.split(/<[ou]l[\s>]/)[0]!;
  const text = cleanSenseText(beforeList);
  if (!text || text.endsWith(":")) return cleanSenseText(definitionHtml);
  return text;
}

const NAME_SENSE_RE = /^(a|an)\b.*\b(surname|given name)\b/i;

/**
 * Picks up to two short senses. Filters out the noise that used to bloat
 * cards: surname/given-name senses, Proper-noun senses shadowing a common
 * word (Apfel the fruit vs. Apfel the surname), and obscure long second
 * senses (Buch -> 'omasum, the third compartment of the stomach...').
 */
export function meaningFromEntries(entries: DefinitionEntry[]): string | null {
  let pieces: [string, string][] = [];
  for (const entry of entries) {
    const pos = entry.partOfSpeech ?? "";
    let best: string | null = null;
    let fallback: string | null = null;
    // prefer the first sense WITHOUT a usage-label marker: labeled senses
    // are context-restricted (auxiliary/dialect/technical), which is how
    // 'sein' used to gloss as "forms the present perfect..." over "to be"
    for (const d of (entry.definitions ?? []).slice(0, 4)) {
      const html = d.definition ?? "";
      if (!html) continue;
      if (html.includes("form-of-definition")) {
        if (extractLemma(html)) continue; // followable inflection -- resolveWord()'s job
        if (!html.includes("form-of-definition-link")) continue; // linkless sub-sense fragment
        // else derivational ("agent noun of lehren") -- keep as the sense text
      }
      const text = cleanDefinition(html);
      if (!text || NAME_SENSE_RE.test(text)) continue;
      if (fallback === null) fallback = text;
      if (!html.trimStart().startsWith('<span class="usage-label-sense"')) {
        best = text;
        break;
      }
    }
    const text = best ?? fallback;
    if (text) pieces.push([pos, text]);
  }
  if (pieces.some(([pos]) => pos !== "Proper noun")) {
    pieces = pieces.filter(([pos]) => pos !== "Proper noun");
  }
  pieces = pieces.slice(0, 2);
  if (pieces.length === 2 && pieces[1]![1].length > 40) pieces = pieces.slice(0, 1);
  let formatted = pieces.map(([pos, text]) => (pos ? `(${pos}) ${text}` : text));
  if (formatted.length === 2 && formatted.join("; ").length > 140) formatted = formatted.slice(0, 1);
  return formatted.length ? formatted.join("; ") : null;
}

export function candidateTitles(word: string): string[] {
  const candidates: string[] = [];
  // "Guten Tag." / "Hallo!" -- titles carry no trailing punctuation
  for (const base of [word, word.replace(/[.!?]+$/, "").trim()]) {
    if (!base) continue;
    candidates.push(
      base,
      base[0]!.toLowerCase() + base.slice(1), // iOS auto-capitalized a verb/adverb/phrase
      base[0]!.toUpperCase() + base.slice(1), // a noun typed lowercase
      base.toLowerCase(),
    );
  }
  return [...new Set(candidates)];
}

/** First-sense-per-block form-of hit, or null. */
function firstFormHit(entries: DefinitionEntry[]): [string, string] | null {
  for (const entry of entries) {
    for (const d of (entry.definitions ?? []).slice(0, 1)) {
      const hit = extractLemma(d.definition ?? "");
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Finds the Wiktionary entry for a typed word (trying case variants) and
 * follows inflected forms to their lemma: 'bist' resolves to 'sein' with
 * formNote 'bist = second-person singular present of sein'. Mixed entries
 * like 'weiß' (adjective 'white' + verb form of 'wissen') keep their own
 * headword and meaning but still get the form note.
 */
export async function resolveWord(word: string): Promise<Resolution> {
  const typed = word;
  let entries: DefinitionEntry[] | null = null;
  let resolved = word;
  for (const candidate of candidateTitles(word)) {
    entries = await fetchDefinitionEntries(candidate);
    if (entries) {
      resolved = candidate;
      break;
    }
  }
  if (!entries) return { headword: word, typed, formNote: null, meaning: null };

  const visited = new Set([resolved.toLowerCase()]);
  let formNote: string | null = null;
  for (let depth = 0; depth < 2; depth++) {
    // follow at most a 2-step form-of chain
    const meaning = meaningFromEntries(entries);
    const formHit = firstFormHit(entries);
    if (formHit && !formNote) formNote = `${typed} = ${formHit[1]}`;
    if (meaning !== null) return { headword: resolved, typed, formNote, meaning };
    if (!formHit) return { headword: resolved, typed, formNote, meaning: null };
    const lemma = formHit[0];
    if (visited.has(lemma.toLowerCase())) return { headword: resolved, typed, formNote, meaning: null };
    visited.add(lemma.toLowerCase());
    const nextEntries = await fetchDefinitionEntries(lemma);
    if (!nextEntries) return { headword: resolved, typed, formNote, meaning: null };
    resolved = lemma;
    entries = nextEntries;
  }
  return { headword: resolved, typed, formNote, meaning: meaningFromEntries(entries) };
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
    // de.wiktionary stores the auxiliary as an infinitive; the principal-
    // parts convention uses third person ("ist gewesen", "hat gesehen")
    const auxRaw = aux ? aux[1]!.trim() : "hat";
    const auxWord = { haben: "hat", sein: "ist" }[auxRaw] ?? auxRaw;
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

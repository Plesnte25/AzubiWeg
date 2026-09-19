/**
 * The card-file format contract, ported line-for-line from add_word.py in
 * "Ausbildung 27". Both that script and the Obsidian Spaced Repetition
 * plugin keep writing to the same file, so any deviation here (sort order,
 * heading placement, blank lines, SR-comment attachment) corrupts a live
 * study vault. Round-trip tests in tests/vault-roundtrip.test.ts enforce
 * byte-identical serialization.
 */

export const FLASHCARD_TAG_LINE = "#flashcards/German\n";

export interface SrState {
  due: string; // YYYY-MM-DD
  interval: number;
  ease: number;
}

// Curation/protection state for a card, mirroring add_word.py's
// <!--curated:...--> marker convention exactly so cards from either writer
// stay compatible. "generated" is never written as a marker -- absence of
// a marker on the line IS the generated state.
//  generated: produced by enrichment, safe to auto-replace
//  review:    enrichment flagged real ambiguity or an unresolved gap; protected
//  manual:    human-resolved or hand-edited via the app; protected
//  mt:        legacy Python-era machine-translation marker; protected --
//             real cards in this user's actual linked vault already carry this
export type CardCuration = "generated" | "review" | "manual" | "mt";

/** Single point of truth for "does re-enrichment get to replace this card's
 * content" -- every write path must call this rather than re-deriving the
 * check inline, or a future path will eventually forget "mt". */
export function shouldProtectCard(curation: CardCuration): boolean {
  return curation === "manual" || curation === "review" || curation === "mt";
}

/** Finds a protected card among a set of candidates -- used wherever a typed
 * word and its resolved headword might be TWO DIFFERENT existing cards
 * (e.g. typed "bist", resolved lemma "sein"). A single findFirst()/find()
 * over an "in [typedKey, resolvedKey]" query has no ordering guarantee, so
 * checking only whichever one comes back first can silently miss a
 * protected card at the OTHER key -- always gather every candidate first,
 * then check all of them for protection, never just one. */
export function firstProtected<T>(
  candidates: readonly T[],
  getCuration: (candidate: T) => CardCuration,
): T | null {
  return candidates.find((c) => shouldProtectCard(getCuration(c))) ?? null;
}

export interface CardFields {
  meaning: string | null;
  ipa: string | null;
  grammar: string | null;
  form: string | null; // inflected forms noted on a lemma card ("bist = second-person singular present of sein")
  example: string | null;
  audioPath: string | null;
  lesson: string | null;
  curation: CardCuration;
  reviewNote: string | null;
}

export interface Card {
  front: string;
  sortKey: string; // lowercased front — dedupe + sort key, same as the Python script
  cardLine: string; // full raw card line including "- " and trailing "\n"
  srLines: string[]; // raw <!--SR:...--> lines attached to this card
  fields: CardFields;
  sr: SrState | null;
}

const SR_LINE_RE = /^<!--SR:!(\d{4}-\d{2}-\d{2}),(\d+),(\d+)-->$/;

// Only the card's own trailing position -- never recognized mid-line, which
// risks misparsing real content as metadata.
export const CURATION_MARKER_RE = /\s*<!--curated:(review|manual|mt)-->\s*$/;

/** Strips ANY number of leading/trailing slashes -- both formatCardLine (write)
 * and parseCardFields (read) use this so a value that's already delimiter-
 * wrapped (Kaikki's own dump includes slashes for many entries) never gets
 * double-wrapped, and an already-double-wrapped value read back from an old
 * vault file fully heals in one round-trip instead of thinning by one layer. */
export function stripIpaSlashes(ipa: string): string {
  return ipa.replace(/^\/+|\/+$/g, "");
}

/** Removes trailing editorial/source notes from learner-facing card fields. */
export function stripEditorialMetadata(value: string): string {
  return value.replace(/\s+_\([^)]*\)_\s*$/g, "").trim();
}

/** @deprecated Use stripEditorialMetadata for all learner-facing fields. */
export function stripExampleMetadata(example: string): string {
  return stripEditorialMetadata(example);
}

export function stripBullet(text: string): string {
  return text.startsWith("- ") ? text.slice(2) : text;
}

export function cardFront(line: string): string {
  const content = stripBullet(line.split("::", 1)[0]!.trim());
  return content.replace(/^\*\*|\*\*$/g, "").trim();
}

export function isCardLine(line: string): boolean {
  const content = stripBullet(line.trim());
  return content.startsWith("**") && content.includes("::");
}

export function parseSrLine(line: string): SrState | null {
  const m = line.trim().match(SR_LINE_RE);
  if (!m) return null;
  return { due: m[1]!, interval: Number(m[2]), ease: Number(m[3]) };
}

export function formatSrLine(sr: SrState): string {
  return `<!--SR:!${sr.due},${sr.interval},${sr.ease}-->\n`;
}

/** Extracts the structured fields the app models from a raw card line. */
export function parseCardFields(cardLine: string): CardFields {
  const afterFront = cardLine.split("::").slice(1).join("::").trim();

  // The curation marker must be stripped BEFORE the lesson-tag match: the
  // lesson regex is itself $-anchored, so a trailing marker placed after
  // the lesson tag (the format_row()-matching position, see formatCardLine)
  // would otherwise stop it from matching at all.
  const curationMatch = afterFront.match(CURATION_MARKER_RE);
  const curation: CardCuration = curationMatch ? (curationMatch[1] as CardCuration) : "generated";
  const withoutCuration = curationMatch
    ? afterFront.slice(0, curationMatch.index).trim()
    : afterFront;

  // lesson tag sits at the very end of what's left
  const lessonMatch = withoutCuration.match(/#lesson\/([\w-]+)\s*$/);
  const back = lessonMatch ? withoutCuration.slice(0, lessonMatch.index).trim() : withoutCuration;

  const field = (name: string): string | null => {
    const m = back.match(new RegExp(`\\*\\*${name}:\\*\\* (.*?)(?:<br>|$)`));
    return m ? m[1]!.trim() : null;
  };
  const ipaRaw = field("IPA");
  const exampleRaw = field("Example");
  const audioMatch = back.match(/!\[\[([^\]]+)\]\]/);

  return {
    meaning: field("Meaning") ? stripEditorialMetadata(field("Meaning")!) : null,
    ipa: ipaRaw ? stripIpaSlashes(ipaRaw.trim()) : null,
    grammar: field("Grammar") ? stripEditorialMetadata(field("Grammar")!) : null,
    form: field("Form") ? stripEditorialMetadata(field("Form")!) : null,
    example: exampleRaw
      ? stripEditorialMetadata(exampleRaw).replace(/^\*([\s\S]*)\*$/, "$1").trim()
      : null,
    audioPath: audioMatch ? audioMatch[1]! : null,
    lesson: lessonMatch ? lessonMatch[1]! : null,
    curation,
    reviewNote: field("Review"),
  };
}

/** Collapses embedded newlines — same rationale as the Python _one_line().
 * NOTE: this only normalizes whitespace, it is not a sanitizer -- it does
 * not strip "<!--...-->", "<br>", or "#lesson/...". Fine today because
 * reviewNote is only ever server-generated (never accepted as PATCH input,
 * see routes/words.ts), never derived from arbitrary user text -- if that
 * ever changes, add real sanitization at the point reviewNote is accepted,
 * don't rely on this. */
function oneLine(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

/** Port of format_row(): renders a card line from structured fields. */
export function formatCardLine(fields: CardFields & { front: string }): string {
  const front = oneLine(fields.front);
  const meaning = fields.meaning
    ? oneLine(stripEditorialMetadata(fields.meaning))
    : "_(not found -- fill manually)_";
  const backParts = [`**Meaning:** ${meaning}`];
  if (fields.ipa) backParts.push(`**IPA:** /${stripIpaSlashes(oneLine(fields.ipa))}/`);
  if (fields.grammar) backParts.push(`**Grammar:** ${oneLine(stripEditorialMetadata(fields.grammar))}`);
  if (fields.form) backParts.push(`**Form:** ${oneLine(stripEditorialMetadata(fields.form))}`);
  if (fields.reviewNote) backParts.push(`**Review:** ${oneLine(fields.reviewNote)}`);
  if (fields.example) {
    const example = oneLine(stripEditorialMetadata(fields.example));
    if (example) backParts.push(`**Example:** *${example}*`);
  }
  if (fields.audioPath) backParts.push(`![[${fields.audioPath}]]`);
  const tag = fields.lesson ? ` #lesson/${fields.lesson}` : "";
  // Curation marker is always the very last thing on the line -- parseCardFields()
  // relies on that trailing position (see CURATION_MARKER_RE) to strip it before
  // the lesson-tag match. "generated" is never written -- absence IS that state.
  const marker = fields.curation && fields.curation !== "generated" ? ` <!--curated:${fields.curation}-->` : "";
  return `- **${front}** :: ${backParts.join("<br>")}${tag}${marker}\n`;
}

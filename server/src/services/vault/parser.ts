import {
  FLASHCARD_TAG_LINE,
  type Card,
  cardFront,
  isCardLine,
  parseCardFields,
  parseSrLine,
} from "./format.js";

export interface ParsedVaultFile {
  headerLines: string[];
  cards: Card[];
}

/** Splits content into lines that each keep their trailing "\n" (like Python readlines). */
function readLines(content: string): string[] {
  const lines = content.split("\n").map((l) => l + "\n");
  const last = lines.pop()!;
  if (last !== "\n") lines.push(last.slice(0, -1)); // no trailing newline on final line
  return lines;
}

/** Port of _split_header(). */
function splitHeader(lines: string[]): { header: string[]; rest: string[] } {
  if (lines.length && lines[0]!.trim().startsWith("#flashcards")) {
    return { header: [lines[0]!], rest: lines.slice(1) };
  }
  return { header: [FLASHCARD_TAG_LINE], rest: lines };
}

/**
 * Port of _read_cards(): groups card lines with their trailing SR-metadata
 * comments. Keeping the SR lines attached to their card is what preserves
 * review history across resorts.
 */
function readCards(lines: string[]): Card[] {
  const cards: Card[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isCardLine(lines[i]!)) {
      const cardLine = lines[i]!;
      const srLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim().startsWith("<!--SR:")) {
        srLines.push(lines[j]!);
        j += 1;
      }
      const front = cardFront(cardLine);
      cards.push({
        front,
        sortKey: front.toLowerCase(),
        cardLine,
        srLines,
        fields: parseCardFields(cardLine),
        sr: srLines.length ? parseSrLine(srLines[srLines.length - 1]!) : null,
      });
      i = j;
    } else {
      i += 1;
    }
  }
  return cards;
}

export function parseMasterFile(content: string): ParsedVaultFile {
  const lines = readLines(content);
  const { header, rest } = splitHeader(lines);
  return { headerLines: header, cards: readCards(rest) };
}

// Whole-content (not per-line) comment strip: a status comment torn across
// two physical lines by a sync/editor round-trip (observed 2026-08-08 on
// the Python side, see add_word.py's _INLINE_COMMENT_RE) has neither half
// containing both "<!--" and "-->", so a per-line strip can't catch it --
// this must run over the full string first. GARBAGE_WORD_RE/MAX_WORD_LEN
// are the same defense-in-depth backstop as add_word.py: never enrich a
// leftover comment fragment as if it were a typed word.
const INLINE_COMMENT_RE = /<!--[\s\S]*?-->/g;
const GARBAGE_WORD_RE = /<!--|-->/;
const MAX_WORD_LEN = 60;

// No local-file watcher can actually know you're still typing on the phone
// -- inbox.md only changes when Remotely Save happens to sync, not when you
// pause -- so processing requires this explicit "done" line instead of a
// time-based guess (case-sensitive, mirrors add_word.py's _DONE_MARKER_RE).
const DONE_MARKER_RE = /^GO$/;

/** Words in inbox.md — gated on an explicit "GO" marker line (port of add_word.py's cmd_enrich_inbox reading). */
export function parseInboxFile(content: string): string[] {
  const lines = content.replace(INLINE_COMMENT_RE, "").split("\n").map((l) => l.trim());
  if (!lines.some((l) => DONE_MARKER_RE.test(l))) return [];
  return lines.filter(
    (l) => l && !DONE_MARKER_RE.test(l) && !GARBAGE_WORD_RE.test(l) && l.length <= MAX_WORD_LEN,
  );
}

export const INBOX_PLACEHOLDER =
  "<!-- type one German word per line above, then run: vocab enrich-inbox -->\n";

/**
 * Placeholder plus a status comment that shows up on the phone after sync
 * (format matches add_word.py's _inbox_placeholder exactly).
 */
export function buildInboxPlaceholder(added?: string[], review?: string[], rejected?: string[]): string {
  let text = INBOX_PLACEHOLDER;
  if (added !== undefined) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    let summary = `${added.length} added`;
    if (added.length) {
      let listing = added.join(", ");
      if (listing.length > 150) {
        const cut = listing.slice(0, 150);
        listing = cut.slice(0, cut.lastIndexOf(",")) + ", ...";
      }
      summary += `: ${listing}`;
    }
    const parts = [`last processed ${stamp}`, summary];
    if (review?.length) parts.push(`${review.length} need review: ${review.join(", ")}`);
    if (rejected?.length) parts.push(`${rejected.length} rejected: ${rejected.join(", ")}`);
    text += `<!-- ${parts.join(" -- ")} -->\n`;
  }
  return text;
}

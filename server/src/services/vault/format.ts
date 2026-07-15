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

export interface CardFields {
  meaning: string | null;
  ipa: string | null;
  grammar: string | null;
  example: string | null;
  audioPath: string | null;
  lesson: string | null;
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
  // lesson tag sits at the very end of the line
  const lessonMatch = afterFront.match(/#lesson\/([\w-]+)\s*$/);
  const back = lessonMatch ? afterFront.slice(0, lessonMatch.index).trim() : afterFront;

  const field = (name: string): string | null => {
    const m = back.match(new RegExp(`\\*\\*${name}:\\*\\* (.*?)(?:<br>|$)`));
    return m ? m[1]!.trim() : null;
  };
  const ipaRaw = field("IPA");
  const exampleRaw = field("Example");
  const audioMatch = back.match(/!\[\[([^\]]+)\]\]/);

  return {
    meaning: field("Meaning"),
    ipa: ipaRaw ? ipaRaw.replace(/^\/|\/$/g, "") : null,
    grammar: field("Grammar"),
    example: exampleRaw ? exampleRaw.replace(/^\*|\*$/g, "") : null,
    audioPath: audioMatch ? audioMatch[1]! : null,
    lesson: lessonMatch ? lessonMatch[1]! : null,
  };
}

/** Collapses embedded newlines — same rationale as the Python _one_line(). */
function oneLine(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

/** Port of format_row(): renders a card line from structured fields. */
export function formatCardLine(fields: CardFields & { front: string }): string {
  const front = oneLine(fields.front);
  const meaning = fields.meaning ? oneLine(fields.meaning) : "_(not found -- fill manually)_";
  const backParts = [`**Meaning:** ${meaning}`];
  if (fields.ipa) backParts.push(`**IPA:** /${oneLine(fields.ipa)}/`);
  if (fields.grammar) backParts.push(`**Grammar:** ${oneLine(fields.grammar)}`);
  if (fields.example) backParts.push(`**Example:** *${oneLine(fields.example)}*`);
  if (fields.audioPath) backParts.push(`![[${fields.audioPath}]]`);
  const tag = fields.lesson ? ` #lesson/${fields.lesson}` : "";
  return `- **${front}** :: ${backParts.join("<br>")}${tag}\n`;
}

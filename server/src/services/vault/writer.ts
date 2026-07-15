import { mkdir, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { Card } from "./format.js";

/**
 * Port of _render_body(): cards sorted by lowercased front (code-point
 * order, matching Python string comparison — NOT locale order: the existing
 * file sorts "Büro" after "Bus"), under "## <Letter>" headings, one blank
 * line after every card block.
 */
export function renderBody(cards: Card[]): string {
  const sorted = [...cards].sort((a, b) =>
    a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0,
  );
  const out: string[] = [];
  let lastLetter: string | null = null;
  for (const card of sorted) {
    const letter = card.sortKey ? card.sortKey[0]!.toUpperCase() : "#";
    if (letter !== lastLetter) {
      out.push(`## ${letter}\n\n`);
      lastLetter = letter;
    }
    out.push(card.cardLine, ...card.srLines, "\n");
  }
  return out.join("");
}

export function serializeMasterFile(headerLines: string[], cards: Card[]): string {
  return headerLines.join("") + "\n" + renderBody(cards);
}

/**
 * Atomic write: Remotely Save (and the chokidar watcher) must never see a
 * half-written master.md. Same-directory temp file so rename() stays atomic.
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomBytes(4).toString("hex")}.tmp`,
  );
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, filePath);
}

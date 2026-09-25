import { readdir, readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Note } from "@prisma/client";
import { prisma } from "../../db.js";
import { atomicWrite } from "./writer.js";

/*
 * Settings → Obsidian sync → "Notes": each note is written one-way to `<vault>/Notizen/<title> (<id tail>).md`, a
 * markdown file with a small frontmatter. The app stays the source of truth (edits made to these files in Obsidian
 * aren't read back); a file is only ever touched if its frontmatter carries this note's `azubiweg-id`, so hand-made
 * notes in the same folder are never overwritten or removed.
 */

export const NOTES_DIR = "Notizen";
const ID_KEY = "azubiweg-id";

type VaultNote = Pick<Note, "id" | "title" | "body" | "category" | "skill" | "pinned" | "createdAt" | "updatedAt">;

const idTail = (id: string) => id.slice(-6);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const decode = (t: string) => t.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e]!);

/**
 * Note bodies are the Notes editor's HTML (TipTap StarterKit, no headings); older notes are plain text. This turns
 * that tag set into Obsidian markdown: paragraphs, bold/italic/strike/code, links, (nested) lists, quotes, code blocks
 * and rules. Anything else is dropped to its text.
 */
export function htmlToMarkdown(html: string): string {
  if (!/<[a-z][^>]*>/i.test(html)) return html.trim();
  let out = "";
  const lists: { ordered: boolean; n: number }[] = [];
  const hrefs: string[] = [];
  const quotes: number[] = [];
  let inPre = false;
  for (const token of html.split(/(<[^>]+>)/)) {
    const tag = /^<(\/?)([a-z0-9]+)([^>]*)>$/i.exec(token);
    if (!tag) {
      if (token) out += inPre ? decode(token) : decode(token).replace(/\s+/g, " ");
      continue;
    }
    const [, close, rawName, attrs] = tag;
    const name = rawName!.toLowerCase();
    const open = !close;
    switch (name) {
      case "p":
        if (!open && lists.length === 0) out += "\n\n";
        break;
      case "br":
        out += "\n";
        break;
      case "strong":
      case "b":
        out += "**";
        break;
      case "em":
      case "i":
        out += "*";
        break;
      case "s":
      case "del":
      case "strike":
        out += "~~";
        break;
      case "code":
        if (!inPre) out += "`";
        break;
      case "a":
        if (open) {
          hrefs.push(decode(/href="([^"]*)"/i.exec(attrs ?? "")?.[1] ?? ""));
          out += "[";
        } else out += `](${hrefs.pop() ?? ""})`;
        break;
      case "ul":
      case "ol":
        if (open) lists.push({ ordered: name === "ol", n: 0 });
        else {
          lists.pop();
          if (lists.length === 0) out += "\n\n";
        }
        break;
      case "li":
        if (open) {
          const list = lists[lists.length - 1];
          const marker = list?.ordered ? `${++list.n}. ` : "- ";
          out = out.replace(/[ \t]+$/, "");
          out += `${out && !out.endsWith("\n") ? "\n" : ""}${"  ".repeat(Math.max(0, lists.length - 1))}${marker}`;
        }
        break;
      case "blockquote":
        if (open) quotes.push(out.length);
        else {
          const start = quotes.pop() ?? 0;
          const body = out.slice(start).trim();
          out = `${out.slice(0, start)}${body
            .split("\n")
            .map((l) => (l ? `> ${l}` : ">"))
            .join("\n")}\n\n`;
        }
        break;
      case "pre":
        inPre = open;
        out += open ? "```\n" : "\n```\n\n";
        break;
      case "hr":
        out += "\n---\n\n";
        break;
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** "Dativ nach mit" → "Dativ nach mit (a1b2c3).md"; untitled notes take their first line. Safe on every OS. */
export function noteFileName(note: Pick<VaultNote, "id" | "title" | "body">): string {
  const firstLine = htmlToMarkdown(note.body ?? "").split("\n")[0]?.replace(/[*_`~>[\]]|^(?:- |\d+\. )/g, "") ?? "";
  const base = (note.title?.trim() || firstLine.trim() || "Untitled note")
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return `${base || "Untitled note"} (${idTail(note.id)}).md`;
}

export function renderNote(note: VaultNote): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const front = [
    "---",
    `${ID_KEY}: ${note.id}`,
    `category: ${note.category}`,
    ...(note.skill ? [`skill: ${note.skill}`] : []),
    ...(note.pinned ? ["pinned: true"] : []),
    `created: ${day(note.createdAt)}`,
    `updated: ${day(note.updatedAt)}`,
    "tags: [azubiweg]",
    "---",
    "",
  ];
  const title = note.title?.trim();
  return [...front, ...(title ? [`# ${title}`, ""] : []), htmlToMarkdown(note.body ?? ""), ""].join("\n");
}

/** This app's files in the folder, by note id (read from the frontmatter, never guessed from the name). */
async function ownFiles(dir: string): Promise<Map<string, string[]>> {
  const byId = new Map<string, string[]>();
  if (!existsSync(dir)) return byId;
  for (const name of await readdir(dir)) {
    if (!name.endsWith(".md")) continue;
    const head = (await readFile(path.join(dir, name), "utf-8")).slice(0, 200);
    const id = new RegExp(`^---\\n${ID_KEY}: (\\S+)`).exec(head)?.[1];
    if (id) byId.set(id, [...(byId.get(id) ?? []), name]);
  }
  return byId;
}

/** Writes one note, removing its old file if the title (and so the name) changed. */
async function writeInto(dir: string, note: VaultNote, existing: string[]): Promise<void> {
  const name = noteFileName(note);
  await atomicWrite(path.join(dir, name), renderNote(note));
  for (const old of existing) if (old !== name) await unlink(path.join(dir, old)).catch(() => {});
}

async function notesTarget(userId: string): Promise<string | null> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { vaultPath: true, vaultWriteNotes: true } });
  return user.vaultPath && user.vaultWriteNotes ? path.join(user.vaultPath, NOTES_DIR) : null;
}

/** After a note is created or edited. Best effort: a vault problem never fails the note itself. */
export async function writeNoteToVault(userId: string, note: VaultNote): Promise<void> {
  try {
    const dir = await notesTarget(userId);
    if (!dir) return;
    const tail = `(${idTail(note.id)}).md`;
    const candidates = existsSync(dir) ? (await readdir(dir)).filter((n) => n.endsWith(tail)) : [];
    const mine: string[] = [];
    for (const n of candidates) {
      if ((await readFile(path.join(dir, n), "utf-8")).startsWith(`---\n${ID_KEY}: ${note.id}\n`)) mine.push(n);
    }
    await writeInto(dir, note, mine);
  } catch (err) {
    console.error(`vault note write failed for ${note.id}:`, err);
  }
}

/** After a note is deleted. */
export async function removeNoteFromVault(userId: string, noteId: string): Promise<void> {
  try {
    const dir = await notesTarget(userId);
    if (!dir) return;
    for (const name of (await ownFiles(dir)).get(noteId) ?? []) await unlink(path.join(dir, name)).catch(() => {});
  } catch (err) {
    console.error(`vault note removal failed for ${noteId}:`, err);
  }
}

/** Sync now: writes every note and removes this app's files for notes that no longer exist. Returns notes written. */
export async function exportNotesToVault(userId: string): Promise<number> {
  const dir = await notesTarget(userId);
  if (!dir) return 0;
  const [notes, files] = await Promise.all([
    prisma.note.findMany({
      where: { userId, OR: [{ title: { not: null } }, { body: { not: null } }] },
      select: { id: true, title: true, body: true, category: true, skill: true, pinned: true, createdAt: true, updatedAt: true },
    }),
    ownFiles(dir),
  ]);
  for (const note of notes) {
    await writeInto(dir, note, files.get(note.id) ?? []);
    files.delete(note.id);
  }
  for (const names of files.values()) for (const name of names) await unlink(path.join(dir, name)).catch(() => {});
  return notes.length;
}

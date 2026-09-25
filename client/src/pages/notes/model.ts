import type { Icon } from "@phosphor-icons/react";
import { Briefcase, Cards, Path, VideoCamera } from "@phosphor-icons/react";
import type { CefrLevel, WallNote, Word } from "../../api/types";
import type { Station } from "../plan/journey/model";

/*
 * Notes sticky wall model (AzubiNotes.dc.html, dir a): link kinds, quick-note parsing, and display helpers.
 */

export type LinkKind = "word" | "station" | "source" | "job";

export const LINK_ICONS: Record<LinkKind, Icon> = { word: Cards, station: Path, source: VideoCamera, job: Briefcase };
export const LINK_KINDS: LinkKind[] = ["word", "station", "source", "job"];

/** "a2:Perfekt mit sein" → the theme, or "Station 8 · theme" when the station is known. */
export function stationLabel(key: string, stations: Station[]): string {
  const s = stations.find((x) => x.key === key);
  const theme = key.slice(key.indexOf(":") + 1);
  return s ? `Station ${s.index} · ${s.theme}` : theme;
}

/** The note's one link, as the sticky's chip shows it (a note links to one thing, like the prototype's `link`). */
export function noteLink(n: WallNote, stations: Station[]): { kind: LinkKind; label: string } | null {
  if (n.word) return { kind: "word", label: n.word.headword };
  if (n.stationKey) return { kind: "station", label: stationLabel(n.stationKey, stations) };
  if (n.studySource) return { kind: "source", label: n.studySource.title };
  if (n.application) return { kind: "job", label: n.application.company };
  return null;
}

/** Clearing every link field, then setting one — a note carries one link at a time. */
export const NO_LINK = { wordId: null, stationKey: null, studySourceId: null, applicationId: null } as const;

const ARTICLE = /^(der|die|das)\s+/i;

/** `/word die Kaution` → the matching word: exact headword first (article ignored), then a prefix match. */
export function findWord(words: Word[], query: string): Word | null {
  const q = query.trim().replace(ARTICLE, "").toLowerCase();
  if (!q) return null;
  return (
    words.find((w) => w.headword.replace(ARTICLE, "").toLowerCase() === q) ??
    words.find((w) => w.headword.replace(ARTICLE, "").toLowerCase().startsWith(q)) ??
    null
  );
}

/** `/station 8` (index in your active level) or `/station Perfekt` (theme match, active level first). */
export function findStation(stations: Station[], query: string, level: CefrLevel | null): Station | null {
  const q = query.trim().replace(/^station\s+/i, "").toLowerCase();
  if (!q) return null;
  const active = stations.filter((s) => s.level === level);
  if (/^\d+$/.test(q)) return active.find((s) => s.index === Number(q)) ?? null;
  const byTheme = (list: Station[]) => list.find((s) => s.theme.toLowerCase().includes(q));
  return byTheme(active) ?? byTheme(stations) ?? null;
}

const TOKEN = /\/(word|station)\s+([^\n]+)/i;

/**
 * Quick note → title/body/link token (README §7): the title is the first line with any `/…` token stripped, max 40
 * characters, else "Quick note"; the body is the full text.
 */
export function parseQuickNote(text: string): { title: string; body: string; token: { kind: "word" | "station"; query: string } | null } {
  const t = text.trim();
  const m = t.match(TOKEN);
  const first = t.split("\n")[0]!.replace(/\/(word|station)\s+.*/i, "").trim().slice(0, 40);
  return { title: first || "Quick note", body: t, token: m ? { kind: m[1]!.toLowerCase() as "word" | "station", query: m[2]!.trim() } : null };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text → the TipTap HTML Note.body stores (one paragraph per line). */
export const textToHtml = (text: string) =>
  text
    .split("\n")
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

/** "just now" · "3h ago" · "yesterday" · "Mon" (this week) · "12 Sept". */
export function relativeWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.ceil((startOfToday - d.getTime()) / 86_400_000);
  if (days <= 1) return "yesterday";
  if (days < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Still know it" toast: the returned due date (a UTC-midnight @db.Date) as "2 weeks" / "a month" / "N days". */
export function backIn(dueIso: string | null): string {
  if (!dueIso) return "later";
  const d = new Date(dueIso);
  const due = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const t = new Date();
  const days = Math.round((due - Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())) / 86_400_000);
  if (days === 14) return "2 weeks";
  if (days >= 28 && days <= 31) return "a month";
  if (days >= 56 && days <= 62) return "2 months";
  if (days >= 118 && days <= 122) return "4 months";
  return `${days} days`;
}

/** Sticky tilt cycle, literal from the prototype. */
export const STICKY_TILT = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.7, -2, 1.4];

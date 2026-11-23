import type { CourseLesson } from "./nicosweg.js";
import type { PlaylistVideo } from "./youtube.js";

export interface NewUnit {
  position: number;
  title: string;
  videoId?: string;
  url?: string;
  description?: string | null;
  grammarPoints?: string[];
  culturePoints?: string[];
  vocabCount?: number | null;
}

export type UnitLabel = "lessons" | "episodes" | "pages" | "chapters" | "modules";

const PLACEHOLDER: Record<UnitLabel, string> = { lessons: "Lesson", episodes: "Episode", pages: "Page", chapters: "Chapter", modules: "Module" };
const placeholder = (label: UnitLabel, i: number) => `${PLACEHOLDER[label]} ${i + 1}`;

/** "Lesson 1..N" (or "Chapter 1..N", …) placeholders for manual sources with a known total. */
export function buildManualUnits(total: number, label: UnitLabel = "lessons"): NewUnit[] {
  return Array.from({ length: total }, (_, i) => ({
    position: i,
    title: placeholder(label, i),
  }));
}

export const MAX_CONTENTS_UNITS = 300;
const CONTENTS_HEADER = /^(?:inhalt(?:sverzeichnis)?|contents|table of contents|inhaltsübersicht)\s*:?$/i;

/**
 * A pasted table of contents → one chapter title per line. Bullets, dot leaders and trailing page numbers go
 * ("Lektion 3: Im Café ........ 24" → "Lektion 3: Im Café"); a chapter's own number stays ("Lektion 12" keeps its
 * 12, because a page number only counts as one after a leader, a tab, a wide gap or "S."/"Seite").
 */
export function parseContents(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw
      .replace(/^\s*(?:[-•*·–]|\u25CF|\u25AA)\s+/, "")
      .replace(/(?:\s*[.·…_]{2,}\s*|\t+\s*|\s{2,})\d{1,4}\s*$/, "")
      .replace(/\s*[,–-]?\s*(?:S\.|Seite|p\.|pp\.|page)\s*\d{1,4}(?:\s*[-–]\s*\d{1,4})?\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!line || /^[\d\s.]+$/.test(line) || CONTENTS_HEADER.test(line)) continue;
    if (line.length > 200) line = `${line.slice(0, 199)}…`;
    out.push(line);
    if (out.length >= MAX_CONTENTS_UNITS) break;
  }
  return out;
}

export function buildPlaylistUnits(videos: PlaylistVideo[]): NewUnit[] {
  return videos.map((v, i) => ({ position: i, title: v.title, videoId: v.videoId }));
}

export function buildCourseUnits(lessons: CourseLesson[]): NewUnit[] {
  return lessons.map((l, i) => ({
    position: i,
    title: l.title,
    url: l.url,
    description: l.description,
    grammarPoints: l.grammarPoints,
    culturePoints: l.culturePoints,
    vocabCount: l.vocabCount,
  }));
}

export interface UnitLike {
  completedAt: Date | null;
}

/** Denormalized counters recomputed from units. */
export function unitProgress(units: UnitLike[]): { total: number; done: number } {
  return {
    total: units.length,
    done: units.filter((u) => u.completedAt !== null).length,
  };
}

/**
 * Plan for resizing a manual source's unit list to a new total: append
 * placeholder lessons or drop from the end (highest positions first, so
 * completed early lessons survive a shrink).
 */
export function resizeManualUnits(
  current: { position: number }[],
  newTotal: number,
  label: UnitLabel = "lessons",
): { create: NewUnit[]; deletePositions: number[] } {
  const max = current.reduce((m, u) => Math.max(m, u.position + 1), 0);
  if (newTotal > max) {
    return {
      create: Array.from({ length: newTotal - max }, (_, i) => ({
        position: max + i,
        title: placeholder(label, max + i),
      })),
      deletePositions: [],
    };
  }
  return {
    create: [],
    deletePositions: current
      .map((u) => u.position)
      .filter((p) => p >= newTotal)
      .sort((a, b) => b - a),
  };
}

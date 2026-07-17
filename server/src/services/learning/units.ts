import type { CourseLesson } from "./nicosweg.js";
import type { PlaylistVideo } from "./youtube.js";

export interface NewUnit {
  position: number;
  title: string;
  videoId?: string;
  url?: string;
}

/** "Lesson 1..N" placeholders for manual sources with a known total. */
export function buildManualUnits(total: number): NewUnit[] {
  return Array.from({ length: total }, (_, i) => ({
    position: i,
    title: `Lesson ${i + 1}`,
  }));
}

export function buildPlaylistUnits(videos: PlaylistVideo[]): NewUnit[] {
  return videos.map((v, i) => ({ position: i, title: v.title, videoId: v.videoId }));
}

export function buildCourseUnits(lessons: CourseLesson[]): NewUnit[] {
  return lessons.map((l, i) => ({ position: i, title: l.title, url: l.url }));
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
): { create: NewUnit[]; deletePositions: number[] } {
  const max = current.reduce((m, u) => Math.max(m, u.position + 1), 0);
  if (newTotal > max) {
    return {
      create: Array.from({ length: newTotal - max }, (_, i) => ({
        position: max + i,
        title: `Lesson ${max + i + 1}`,
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

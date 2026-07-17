// client mirror of extractCourseId in server/src/services/learning/nicosweg.ts

export function nicosWegCourseIdFromUrl(url: string): number | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "learngerman.dw.com") return null;
    const match = u.pathname.match(/\/c-(\d+)(?:\/|$)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

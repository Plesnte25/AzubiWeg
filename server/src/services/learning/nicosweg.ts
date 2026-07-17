// Nicos Weg (DW Learn German) lesson fetching. learngerman.dw.com is a SPA,
// but it exposes the same public GraphQL endpoint the site itself uses — no
// API key, no auth. Course overview URLs carry the course id as /c-<id>;
// lessons come back with per-lesson paths (namedUrl). Like the YouTube
// scraper, this is unversioned internals: any failure returns null and the
// route falls back to a manual lesson count.

const GRAPHQL_ENDPOINT = "https://learngerman.dw.com/graphql";
const BASE_URL = "https://learngerman.dw.com";
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export interface CourseLesson {
  title: string;
  url: string;
}

/** Course id from a learngerman.dw.com course URL (…/nicos-weg/c-36519789). */
export function extractCourseId(url: string): number | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "learngerman.dw.com") return null;
    const match = u.pathname.match(/\/c-(\d+)(?:\/|$)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

interface GraphQlLesson {
  name?: unknown;
  namedUrl?: unknown;
}

/** Pure response parsing, split out for tests. */
export function parseCourseResponse(body: unknown): { title: string | null; lessons: CourseLesson[] } {
  const none = { title: null, lessons: [] as CourseLesson[] };
  if (body === null || typeof body !== "object") return none;
  const content = (body as { data?: { content?: unknown } }).data?.content;
  if (content === null || content === undefined || typeof content !== "object") return none;
  const course = content as { name?: unknown; lessons?: unknown };
  if (!Array.isArray(course.lessons)) return none;

  const lessons: CourseLesson[] = [];
  for (const lesson of course.lessons as GraphQlLesson[]) {
    if (typeof lesson?.name !== "string" || typeof lesson?.namedUrl !== "string") continue;
    lessons.push({ title: lesson.name, url: BASE_URL + lesson.namedUrl });
  }
  return { title: typeof course.name === "string" ? course.name : null, lessons };
}

/** null on any network/HTTP/parse failure — callers fall back to manual. */
export async function fetchCourse(
  courseId: number,
): Promise<{ title: string | null; lessons: CourseLesson[] } | null> {
  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": BROWSER_UA },
      body: JSON.stringify({
        query: `{ content(id: ${courseId}, lang: ENGLISH) { ... on Course { name lessons { name namedUrl } } } }`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const parsed = parseCourseResponse(await res.json());
    return parsed.lessons.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

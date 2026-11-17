import type { StudySourceType, StudySourceUnitLabel } from "@prisma/client";
import { prisma } from "../../db.js";
import { extractCourseId, fetchCourse } from "./nicosweg.js";
import { defaultUnitMinutes, scheduleLessons, unitMinutes } from "./source-lessons.js";
import { type LessonTeaches, type MatchableTopic, lessonTeaches } from "./topic-match.js";

/** The user's syllabus topics, in the shape topic-match.ts needs, with what the client shows for a match. */
export async function loadTopics(userId: string): Promise<(MatchableTopic & { masteryState: string })[]> {
  return prisma.syllabusItem.findMany({
    where: { userId },
    select: { id: true, level: true, title: true, theme: true, description: true, category: true, masteryState: true },
    orderBy: { sortOrder: "asc" },
  });
}

export interface TeachesView extends Omit<LessonTeaches, "topicIds"> {
  topics: { id: string; title: string; level: string; theme: string | null; masteryState: string }[];
}

export function teachesView(
  unit: { grammarPoints: string[]; culturePoints: string[]; vocabCount: number | null },
  topics: (MatchableTopic & { masteryState: string })[],
  level: string | null,
): TeachesView {
  const { topicIds, ...rest } = lessonTeaches(unit, topics, level);
  const byId = new Map(topics.map((t) => [t.id, t]));
  return {
    ...rest,
    topics: topicIds.map((id) => byId.get(id)!).map((t) => ({ id: t.id, title: t.title, level: t.level, theme: t.theme, masteryState: t.masteryState })),
  };
}

export async function teachesFor(
  userId: string,
  unit: { grammarPoints: string[]; culturePoints: string[]; vocabCount: number | null },
  level: string | null,
): Promise<TeachesView> {
  return teachesView(unit, await loadTopics(userId), level);
}

const filling = new Set<string>();

/**
 * Nicos Weg sources added before lessons carried DW's grammar/culture/vocab tags: fetch the course again and fill
 * them in, matching lessons by URL (then by position). Background, once per source (topicsFetchedAt), never throws;
 * a failed fetch is retried on a later request.
 */
export async function fillCourseTopics(sourceId: string, url: string): Promise<void> {
  const courseId = extractCourseId(url);
  if (courseId === null || filling.has(sourceId)) return;
  filling.add(sourceId);
  try {
    const course = await fetchCourse(courseId);
    if (!course) return;
    const units = await prisma.studySourceUnit.findMany({ where: { sourceId }, select: { id: true, position: true, url: true } });
    const byUrl = new Map(course.lessons.map((l) => [l.url, l]));
    await prisma.$transaction(async (tx) => {
      for (const unit of units) {
        const lesson = (unit.url && byUrl.get(unit.url)) || course.lessons[unit.position];
        if (!lesson) continue;
        await tx.studySourceUnit.update({
          where: { id: unit.id },
          data: { grammarPoints: lesson.grammarPoints, culturePoints: lesson.culturePoints, vocabCount: lesson.vocabCount },
        });
      }
      await tx.studySource.update({ where: { id: sourceId }, data: { topicsFetchedAt: new Date() } });
    });
  } catch {
    // retried next time
  } finally {
    filling.delete(sourceId);
  }
}

/** Kicks off fillCourseTopics for any of the user's DW course sources that haven't been tagged yet. */
export async function fillMissingCourseTopics(userId: string): Promise<void> {
  const pending = await prisma.studySource.findMany({
    where: { userId, topicsFetchedAt: null, url: { contains: "learngerman.dw.com" } },
    select: { id: true, url: true },
  });
  for (const s of pending) if (s.url) void fillCourseTopics(s.id, s.url);
}

type SourceRow = {
  id: string;
  type: StudySourceType;
  unitLabel: StudySourceUnitLabel;
  minutesPerUnit: number | null;
  dailyLesson: boolean;
  level: string | null;
  units: { id: string; position: number; completedAt: Date | null; grammarPoints: string[]; culturePoints: string[]; vocabCount: number | null }[];
};

export interface SourcePlanView {
  /** Effective minutes per lesson (the source's own, or the type default). */
  minutesPerUnit: number;
  defaultMinutesPerUnit: number;
  /** The lesson on (or next for) the ticket. */
  nextUnitId: string | null;
  /** YYYY-MM-DD each unfinished lesson comes up, at one per study day; empty when daily lessons are off. */
  dates: Record<string, string>;
  finishDate: string | null;
  /** Syllabus topics the finished lessons covered, with how many lessons touched each. */
  covered: { id: string; title: string; level: string; theme: string | null; masteryState: string; lessons: number }[];
}

/**
 * What the Library shows for each source on top of its row: per-lesson `teaches` (grammar, culture, vocab and the
 * matched topics) and the `plan` (when each remaining lesson comes up, the finish date, topics covered so far).
 */
export async function sourceViews<S extends SourceRow & { completedUnits: number; totalUnits: number | null }>(
  userId: string,
  sources: S[],
  today: Date,
  percent: (done: number, total: number | null) => number | null,
) {
  if (sources.length === 0) return [];
  const [user, topics, todayTasks] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { studyDays: true } }),
    loadTopics(userId),
    prisma.roadmapTask.findMany({
      where: { day: { userId, date: today }, studySourceUnitId: { not: null } },
      select: { completedAt: true, droppedAt: true, studySourceUnit: { select: { sourceId: true } } },
    }),
  ]);
  const doneToday = new Set(todayTasks.filter((t) => t.completedAt || t.droppedAt).map((t) => t.studySourceUnit!.sourceId));
  return sources.map((s) => {
    const units = [...s.units].sort((a, b) => a.position - b.position);
    const views = units.map((u) => ({ ...u, teaches: teachesView(u, topics, s.level) }));
    const remaining = units.filter((u) => !u.completedAt);
    const dates: Record<string, string> = {};
    if (s.dailyLesson) {
      const schedule = scheduleLessons({ remaining: remaining.length, today, studyDays: user.studyDays, doneToday: doneToday.has(s.id) });
      remaining.forEach((u, i) => (dates[u.id] = schedule[i]!));
    }
    const coveredCount = new Map<string, number>();
    for (const v of views) if (v.completedAt) for (const t of v.teaches.topics) coveredCount.set(t.id, (coveredCount.get(t.id) ?? 0) + 1);
    const byId = new Map(topics.map((t) => [t.id, t]));
    const plan: SourcePlanView = {
      minutesPerUnit: unitMinutes(s),
      defaultMinutesPerUnit: defaultUnitMinutes(s.type, s.unitLabel),
      nextUnitId: remaining[0]?.id ?? null,
      dates,
      finishDate: remaining.length && s.dailyLesson ? dates[remaining[remaining.length - 1]!.id]! : null,
      covered: [...coveredCount].map(([id, lessons]) => {
        const t = byId.get(id)!;
        return { id, title: t.title, level: t.level, theme: t.theme, masteryState: t.masteryState, lessons };
      }),
    };
    return { ...s, units: views, plan, percent: percent(s.completedUnits, s.totalUnits) };
  });
}

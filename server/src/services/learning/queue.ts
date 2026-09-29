import type { Prisma, RoadmapSkill, RoadmapTaskType, SyllabusCategory } from "@prisma/client";
import { prisma } from "../../db.js";
import { levelHasExamContent } from "./exam.js";
import { MINUTES_PER_ITEM } from "./pace.js";
import { blockedTopicIds, gateThemeOf } from "./prerequisites.js";
import { levelStatesWithExamGate } from "./progress.js";
import { UNTHEMED, levelMastery, type StationLevel } from "./stations.js";
import { LINE_ORDER, projectDates, type Line, type QueueTopic } from "./ticket.js";

/**
 * DB side of the self-paced queue (plans/self-paced-queue.md): loads a user's syllabus, works out the active level,
 * what's locked, done and already taken, and which topics are open to take next. The pure rules live in
 * prerequisites.ts (locking) and ticket.ts (order, goal, projections).
 */

type Db = Prisma.TransactionClient | typeof prisma;

const LEVELS: StationLevel[] = ["a1", "a2", "b1"];

/** Per-level {hasContent, passed} for levelStatesWithExamGate(): a pass unlocks the next level. */
export async function examGateForUser(userId: string) {
  const passedRows = await prisma.examAttempt.findMany({ where: { userId, passed: true }, select: { level: true } });
  const passedLevels = new Set(passedRows.map((r) => r.level));
  return LEVELS.map((level) =>
    levelHasExamContent(level) ? { hasContent: true as const, passed: passedLevels.has(level) } : { hasContent: false as const },
  );
}

const QUEUE_SELECT = {
  id: true,
  level: true,
  category: true,
  theme: true,
  sortOrder: true,
  title: true,
  description: true,
  skill: true,
  masteryState: true,
  skippedAt: true,
  completedAt: true,
} satisfies Prisma.SyllabusItemSelect;

export type QueueItem = Prisma.SyllabusItemGetPayload<{ select: typeof QUEUE_SELECT }>;

const isDone = (i: QueueItem) => i.masteryState === "passed" || i.masteryState === "mastered" || i.skippedAt !== null;

export interface QueueState {
  items: QueueItem[];
  /** null once every level is done. */
  activeLevel: StationLevel | null;
  blocked: Set<string>;
  /** Items with an unfinished, undropped task (taken, in progress). */
  taken: Set<string>;
  /** Open to take: active level, unlocked, not done, not taken. */
  open: QueueTopic[];
  byId: Map<string, QueueItem>;
}

export async function loadQueue(db: Db, userId: string): Promise<QueueState> {
  const [items, examGate, openTasks] = await Promise.all([
    db.syllabusItem.findMany({ where: { userId }, select: QUEUE_SELECT }),
    examGateForUser(userId),
    db.roadmapTask.findMany({
      where: { day: { userId }, completedAt: null, droppedAt: null, syllabusItemId: { not: null } },
      select: { syllabusItemId: true },
    }),
  ]);
  const masteries = LEVELS.map((level) => levelMastery(items, level));
  const states = levelStatesWithExamGate(masteries.map((m) => ({ total: m.countedItems, percent: m.percent })), examGate);
  const activeIdx = states.indexOf("active");
  const activeLevel = activeIdx === -1 ? null : LEVELS[activeIdx]!;
  const blocked = blockedTopicIds(items);
  const taken = new Set(openTasks.map((t) => t.syllabusItemId!));
  const open = items
    .filter((i) => i.level === activeLevel && !blocked.has(i.id) && !isDone(i) && !taken.has(i.id))
    .map((i) => ({ id: i.id, category: i.category as Line, sortOrder: i.sortOrder }));
  return { items, activeLevel, blocked, taken, open, byId: new Map(items.map((i) => [i.id, i])) };
}

/** The topic each line is on right now (open or taken) — the three "you are here" stations and the hero line. */
export function currentByLine(q: QueueState): { line: Line; id: string; title: string; theme: string | null }[] {
  const live = q.items
    .filter((i) => i.level === q.activeLevel && !q.blocked.has(i.id) && !isDone(i))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return LINE_ORDER.flatMap((line) => {
    const item = live.find((i) => i.category === line);
    return item ? [{ line, id: item.id, title: item.title, theme: item.theme }] : [];
  });
}

const LINE_LABEL: Record<SyllabusCategory, string> = { grammar: "Grammar", vocab_theme: "Vocab", skill: "Skill" };
const SKILL_LABEL: Partial<Record<RoadmapSkill, string>> = { reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" };

/** The RoadmapTask a taken topic becomes (same title shape the calendar used: "Grammar: Dativ"). */
export function topicTaskData(item: QueueItem): {
  type: RoadmapTaskType;
  skill: RoadmapSkill;
  title: string;
  description: string | null;
  syllabusItemId: string;
} {
  const skill: RoadmapSkill = item.skill ?? (item.category === "vocab_theme" ? "vocab" : "grammar");
  const label = item.category === "skill" ? (SKILL_LABEL[skill] ?? LINE_LABEL.skill) : LINE_LABEL[item.category];
  return {
    type: item.category === "vocab_theme" ? "vocab" : "generic",
    skill,
    title: `${label}: ${item.title}`,
    description: item.description,
    syllabusItemId: item.id,
  };
}

const FOUR_WEEKS_MS = 28 * 86_400_000;

/** Projected date per remaining topic of the active level (see ticket.ts projectDates). */
export function forecastDates(q: QueueState, user: { studyCapacityMinutes: number; studyDays: boolean[] }, today: Date) {
  if (!q.activeLevel) return new Map<string, string>();
  const inLevel = q.items.filter((i) => i.level === q.activeLevel).sort((a, b) => a.sortOrder - b.sortOrder);
  const gate = gateThemeOf(inLevel);
  const isGate = (i: QueueItem) => (i.theme?.trim() || UNTHEMED) === gate;
  const remaining = inLevel.filter((i) => !isDone(i));
  const since = today.getTime() - FOUR_WEEKS_MS;
  // recent pace counts passes in any level, so a fresh level starts at the pace the user already had
  const recentPasses = q.items.filter((i) => isDone(i) && i.skippedAt === null && i.completedAt && i.completedAt.getTime() >= since).length;
  const sustainablePerWeek = (user.studyCapacityMinutes * user.studyDays.filter(Boolean).length) / MINUTES_PER_ITEM;
  return projectDates({
    lines: LINE_ORDER.map((line) => remaining.filter((i) => i.category === line && !isGate(i)).map((i) => i.id)),
    gate: remaining.filter(isGate).map((i) => i.id),
    perWeek: recentPasses > 0 ? recentPasses / 4 : sustainablePerWeek,
    today,
  });
}

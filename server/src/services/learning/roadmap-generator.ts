import type { CefrLevel, SyllabusCategory } from "@prisma/client";
import { DEFAULT_ROADMAP_DAYS, type DefaultRoadmapDay, type DefaultRoadmapTask } from "./roadmap-defaults.js";

export interface SyllabusRowForGeneration {
  id: string;
  level: CefrLevel;
  category: SyllabusCategory;
  sortOrder: number;
  title: string;
  description: string | null;
  completedAt: Date | null;
}

/** Which CEFR level's regular weeks fall in which phase — matches the week
 * ranges DEFAULT_ROADMAP_DAYS's buildRegularWeek/buildMilestoneWeek calls
 * already use (milestone weeks 8/16/25/26 excluded, they don't get generated
 * content). */
const PHASE_LEVELS: { level: CefrLevel; weekStart: number; weekEnd: number }[] = [
  { level: "a1", weekStart: 1, weekEnd: 7 },
  { level: "a2", weekStart: 9, weekEnd: 15 },
  { level: "b1", weekStart: 17, weekEnd: 24 },
];

/**
 * Balanced partition: splits `items` into exactly `buckets` groups whose
 * sizes differ by at most 1, earlier buckets front-loaded with the
 * remainder. Preserves the input's own order (the syllabus's pedagogical
 * sortOrder) within and across buckets.
 */
export function distributeEvenly<T>(items: T[], buckets: number): T[][] {
  if (buckets <= 0) return [];
  const base = Math.floor(items.length / buckets);
  const remainder = items.length % buckets;
  const result: T[][] = [];
  let cursor = 0;
  for (let b = 0; b < buckets; b++) {
    const size = base + (b < remainder ? 1 : 0);
    result.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}

function tasksFor(items: SyllabusRowForGeneration[], skill: "grammar" | "vocab", label: string): DefaultRoadmapTask[] {
  return items.map((item) => ({
    type: skill === "vocab" ? "vocab" : "generic",
    skill,
    title: `${label}: ${item.title}`,
    description: item.description ?? undefined,
    syllabusItemId: item.id,
    completedAt: item.completedAt,
  }));
}

/**
 * Distributes every grammar/vocab_theme syllabus item across the roadmap's
 * regular-week Mon(grammar)/Tue(grammar)/Wed(vocab) slots, per CEFR phase, in
 * the syllabus's own pedagogical order. Returns a dayOffset -> tasks map to
 * merge onto DEFAULT_ROADMAP_DAYS's hand-authored skeleton (see
 * buildUserRoadmapPlan) — skill-category items are never included here, they
 * stay Syllabus-tab-only (see roadmap-defaults.ts's v3 changelog).
 */
export function deriveSyllabusTasks(syllabusRows: SyllabusRowForGeneration[]): Map<number, DefaultRoadmapTask[]> {
  const byDayOffset = new Map<number, DefaultRoadmapTask[]>();

  for (const phase of PHASE_LEVELS) {
    const weeksInPhase = phase.weekEnd - phase.weekStart + 1;
    const levelItems = syllabusRows
      .filter((r) => r.level === phase.level)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const grammarByWeek = distributeEvenly(
      levelItems.filter((r) => r.category === "grammar"),
      weeksInPhase,
    );
    const vocabByWeek = distributeEvenly(
      levelItems.filter((r) => r.category === "vocab_theme"),
      weeksInPhase,
    );

    for (let w = 0; w < weeksInPhase; w++) {
      const weekNumber = phase.weekStart + w;
      const base = (weekNumber - 1) * 7;

      const [monItems, tueItems] = distributeEvenly(grammarByWeek[w] ?? [], 2);
      const monTasks = tasksFor(monItems ?? [], "grammar", "Grammar");
      const tueTasks = tasksFor(tueItems ?? [], "grammar", "Grammar");
      const vocabTasks = tasksFor(vocabByWeek[w] ?? [], "vocab", "Vocab");

      if (monTasks.length) byDayOffset.set(base + 0, monTasks);
      if (tueTasks.length) byDayOffset.set(base + 1, tueTasks);
      if (vocabTasks.length) byDayOffset.set(base + 2, vocabTasks);
    }
  }

  return byDayOffset;
}

/**
 * Merges the hand-authored roadmap skeleton with syllabus-derived Mon/Tue/Wed
 * tasks for a specific user's live syllabus rows. This — not
 * DEFAULT_ROADMAP_DAYS directly — is what activation/reseed in
 * routes/roadmap.ts should materialize.
 */
export function buildUserRoadmapPlan(syllabusRows: SyllabusRowForGeneration[]): DefaultRoadmapDay[] {
  const generated = deriveSyllabusTasks(syllabusRows);
  return DEFAULT_ROADMAP_DAYS.map((day) => {
    const extra = generated.get(day.dayOffset);
    if (!extra) return day;
    return { ...day, tasks: [...extra, ...day.tasks] };
  });
}

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

/** Mon–Sat are study days; Sunday (dayOffset base+6) is the rest / light-
 * immersion day and never receives generated grammar/vocab. */
const STUDY_DAYS = 6;

/**
 * Balanced partition: splits `items` into exactly `buckets` groups whose sizes
 * differ by at most 1, earlier buckets front-loaded with the remainder.
 * Preserves the input's own order (the syllabus's pedagogical sortOrder) within
 * and across buckets.
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

/** A study day with no *new* syllabus item still gets a same-skill
 * consolidation task, so every day touches grammar and vocab (the daily-
 * revision goal). These carry no syllabusItemId — they're practice, not a
 * checklist item, and so never affect SyllabusItem completion. */
const GRAMMAR_CONSOLIDATION: DefaultRoadmapTask = {
  type: "generic",
  skill: "grammar",
  title: "Grammar consolidation",
  description: "No new rule today — redo this week's trickiest exercises and firm up what's still shaky.",
};
const VOCAB_CONSOLIDATION: DefaultRoadmapTask = {
  type: "vocab",
  skill: "vocab",
  title: "Vocabulary review",
  description: "Review this week's words in your SRS queue and fill any gaps in the vault.",
};

/**
 * Spreads every grammar/vocab_theme syllabus item across the SIX study days of
 * each regular week (per CEFR phase, in the syllabus's own pedagogical order),
 * so each day carries a grammar task and a vocab task — a new item where one is
 * due, a consolidation task otherwise. Reading/listening/speaking/writing for
 * each day come from roadmap-defaults' buildRegularWeek; this function only
 * owns the syllabus-derived grammar/vocab. Skill-category syllabus items stay
 * Syllabus-tab-only (unchanged). Returns dayOffset -> tasks to merge onto the
 * hand-authored skeleton in buildUserRoadmapPlan.
 *
 * (v5: was Mon/Tue grammar + Wed vocab only — now every study day, so the
 * roadmap is all-skills-daily. Pairs with ROADMAP_VERSION 5.)
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

      // second-level split: this week's items across its six study days
      const grammarByDay = distributeEvenly(grammarByWeek[w] ?? [], STUDY_DAYS);
      const vocabByDay = distributeEvenly(vocabByWeek[w] ?? [], STUDY_DAYS);

      for (let d = 0; d < STUDY_DAYS; d++) {
        const dayTasks: DefaultRoadmapTask[] = [];
        const g = grammarByDay[d] ?? [];
        dayTasks.push(...(g.length ? tasksFor(g, "grammar", "Grammar") : [GRAMMAR_CONSOLIDATION]));
        const v = vocabByDay[d] ?? [];
        dayTasks.push(...(v.length ? tasksFor(v, "vocab", "Vocab") : [VOCAB_CONSOLIDATION]));
        byDayOffset.set(base + d, dayTasks);
      }
    }
  }

  return byDayOffset;
}

/**
 * Merges the hand-authored roadmap skeleton with syllabus-derived grammar/vocab
 * for each study day of a specific user's live syllabus rows. Generated
 * grammar/vocab are prepended so each day reads grammar → vocab → reading →
 * listening → speaking → writing. This — not DEFAULT_ROADMAP_DAYS directly — is
 * what activation/reseed in routes/roadmap.ts materializes.
 */
export function buildUserRoadmapPlan(syllabusRows: SyllabusRowForGeneration[]): DefaultRoadmapDay[] {
  const generated = deriveSyllabusTasks(syllabusRows);
  return DEFAULT_ROADMAP_DAYS.map((day) => {
    const extra = generated.get(day.dayOffset);
    if (!extra) return day;
    return { ...day, tasks: [...extra, ...day.tasks] };
  });
}

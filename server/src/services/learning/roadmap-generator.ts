import type { CefrLevel, RoadmapSkill, SyllabusCategory } from "@prisma/client";
import { DEFAULT_ROADMAP_DAYS, type DefaultRoadmapDay, type DefaultRoadmapTask } from "./roadmap-defaults.js";

export interface SyllabusRowForGeneration {
  id: string;
  level: CefrLevel;
  category: SyllabusCategory;
  sortOrder: number;
  title: string;
  description: string | null;
  completedAt: Date | null;
  skill: RoadmapSkill | null;
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

function tasksFor(items: SyllabusRowForGeneration[], skill: RoadmapSkill, label: string): DefaultRoadmapTask[] {
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

/** The 4 always-present daily slots buildRegularWeek puts on every study day
 * (reading/listening/speaking/writing), keyed by their exact title prefix —
 * used both to pull the matching syllabus pool and to identify which
 * hand-authored task in a day to override. Never matches the Thursday-pinned
 * resource task or Friday's bureaucracy task, whose titles use different
 * prefixes ("Deutschland Context: …", or the resource's own title). */
const DAILY_SLOT: Record<"reading" | "listening" | "speaking" | "writing", { label: string; prefix: string }> = {
  reading: { label: "Reading", prefix: "Reading: " },
  listening: { label: "Listening", prefix: "Listening: " },
  speaking: { label: "Speaking", prefix: "Speaking: " },
  writing: { label: "Writing", prefix: "Writing: " },
};
const DAILY_SLOT_PREFIXES = Object.values(DAILY_SLOT).map((s) => s.prefix);

/**
 * Mirrors deriveSyllabusTasks's two-level distributeEvenly split (items →
 * weeks → days), but scoped to category:"skill" syllabus items, bucketed by
 * their `skill` field, for the 4 always-present daily slots. Where a day has
 * a pool item for that skill, it's meant to OVERRIDE (not add to) that day's
 * hand-authored "Reading: {theme}" / etc. task — done by buildUserRoadmapPlan
 * below via the DAILY_SLOT_PREFIXES match. Where the pool has nothing for a
 * given day, the hand-authored week topic stands unchanged (no override
 * entry is set for that day/skill) — pools are still smaller than every
 * study day in a phase, so this fallback is the common case for any one day,
 * not an edge case.
 */
export function deriveDailySkillTasks(syllabusRows: SyllabusRowForGeneration[]): Map<number, DefaultRoadmapTask[]> {
  const byDayOffset = new Map<number, DefaultRoadmapTask[]>();

  for (const phase of PHASE_LEVELS) {
    const weeksInPhase = phase.weekEnd - phase.weekStart + 1;
    const levelItems = syllabusRows
      .filter((r) => r.level === phase.level && r.category === "skill")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const skillKey of Object.keys(DAILY_SLOT) as (keyof typeof DAILY_SLOT)[]) {
      const pool = levelItems.filter((r) => r.skill === skillKey);
      const byWeek = distributeEvenly(pool, weeksInPhase);

      for (let w = 0; w < weeksInPhase; w++) {
        const weekNumber = phase.weekStart + w;
        const base = (weekNumber - 1) * 7;
        const byDay = distributeEvenly(byWeek[w] ?? [], STUDY_DAYS);

        for (let d = 0; d < STUDY_DAYS; d++) {
          const items = byDay[d] ?? [];
          if (items.length === 0) continue;
          const existing = byDayOffset.get(base + d) ?? [];
          byDayOffset.set(base + d, [...existing, ...tasksFor(items, skillKey, DAILY_SLOT[skillKey].label)]);
        }
      }
    }
  }

  return byDayOffset;
}

/**
 * Merges the hand-authored roadmap skeleton with syllabus-derived content for
 * each study day of a specific user's live syllabus rows. Generated
 * grammar/vocab are prepended so each day reads grammar → vocab → reading →
 * listening → speaking → writing. The 4 daily reading/listening/speaking/
 * writing slots are then substituted (not added to) wherever the live
 * syllabus has a distinct topic for that day, via deriveDailySkillTasks —
 * matched by skill + the exact DAILY_SLOT_PREFIXES title prefix, so the
 * Thursday-pinned resource task and Friday's bureaucracy task are never
 * touched. This — not DEFAULT_ROADMAP_DAYS directly — is what
 * activation/reseed in routes/roadmap.ts materializes.
 */
export function buildUserRoadmapPlan(syllabusRows: SyllabusRowForGeneration[]): DefaultRoadmapDay[] {
  const generated = deriveSyllabusTasks(syllabusRows);
  const dailySkill = deriveDailySkillTasks(syllabusRows);

  return DEFAULT_ROADMAP_DAYS.map((day) => {
    const overrides = dailySkill.get(day.dayOffset) ?? [];
    const tasks = overrides.length
      ? day.tasks.map((t) => {
          const match = overrides.find(
            (o) => o.skill === t.skill && DAILY_SLOT_PREFIXES.some((p) => t.title.startsWith(p)),
          );
          return match ?? t;
        })
      : day.tasks;

    const extra = generated.get(day.dayOffset);
    if (!extra) return { ...day, tasks };
    return { ...day, tasks: [...extra, ...tasks] };
  });
}

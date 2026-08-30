import type { RoadmapSkill } from "../api/types";

// Every RoadmapSkill gets its own dedicated color so the day's tasks read as
// distinct sections at a glance, not just a plain list. Nocturne is a
// mono-accent-plus-warm system (no info/ok/multi-hue palette to draw 9
// distinct colors from), so this reuses the 3 genus hues (der/die/das —
// lavender/rose/teal, the only non-accent, non-amber hues the spec defines)
// alongside the accent and amber families rather than inventing new colors.
// With only ~4 real hue families for 9 categories, a few pairs (writing/
// speaking, grammar/milestone) are necessarily close — acceptable since
// most UI shows the 5-skill DISPLAY_SKILLS set, not all 9, and skill is
// always paired with a text label, never color alone.
export const SKILL_COLORS: Record<RoadmapSkill, string> = {
  reading: "var(--color-genus-das)",
  listening: "var(--color-genus-die)",
  writing: "var(--color-brand-500)",
  speaking: "var(--color-brand-700)",
  grammar: "var(--color-warning-500)",
  vocab: "var(--color-genus-der)",
  bureaucracy: "var(--color-ink-400)",
  milestone: "var(--color-warning-600)",
  reflection: "var(--color-ink-300)",
};

export const SKILL_LABELS: Record<RoadmapSkill, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  grammar: "Grammar",
  vocab: "Vocab",
  bureaucracy: "Bureaucracy",
  milestone: "Milestone",
  reflection: "Reflection",
};

/** The 6 skills syllabus/quiz content is tagged with — excludes the 3
 * non-skill roadmap tags (bureaucracy/milestone/reflection). Shared order
 * for the segmented bar, activity rings, and radar chart. */
export const CORE_SKILLS: RoadmapSkill[] = ["grammar", "vocab", "listening", "speaking", "reading", "writing"];

/**
 * Display-only merge: listening and speaking are shown as one combined
 * "Speaking & Listening" bucket everywhere skills are visualized (there
 * isn't enough distinct content for either to warrant its own axis/ring/
 * segment yet). The underlying data stays untouched — `listening` and
 * `speaking` remain separate real values in the database and in
 * `CORE_SKILLS`/`SKILL_COLORS`/`SKILL_LABELS` above (still used as-is by
 * anything that shows a single real task's skill, e.g. SkillTaskRow).
 * `displaySkill()` is the one place that folds them together; every chart
 * that groups by skill should key its buckets through this function instead
 * of using the raw skill value directly.
 */
export const DISPLAY_SKILLS: RoadmapSkill[] = ["grammar", "vocab", "speaking", "reading", "writing"];

export function displaySkill(skill: RoadmapSkill): RoadmapSkill {
  return skill === "listening" ? "speaking" : skill;
}

export const DISPLAY_SKILL_LABELS: Record<RoadmapSkill, string> = {
  ...SKILL_LABELS,
  speaking: "Speaking & Listening",
};

/** Same as `DISPLAY_SKILL_LABELS` but abbreviated for tight spaces (legend
 * rows in the Study Time chart and Tasks Completed bar) — only the merged
 * speaking/listening bucket is long enough to need shortening. */
export const DISPLAY_SKILL_LABELS_COMPACT: Record<RoadmapSkill, string> = {
  ...DISPLAY_SKILL_LABELS,
  speaking: "S/L",
};

export interface SkillProgressDatum {
  skill: RoadmapSkill;
  total: number;
  done: number;
  percent: number;
}

/** Folds the 9 raw skills down to the 5 display skills (via displaySkill())
 * and recomputes each bucket's percent from its summed done/total — shared
 * by every chart that shows per-skill overall progress (gauges, bars, …) so
 * the merge logic lives in exactly one place. */
export function mergeSkillProgress(
  skills: SkillProgressDatum[],
): { skill: RoadmapSkill; label: string; color: string; percent: number }[] {
  const totals = new Map<RoadmapSkill, { done: number; total: number }>();
  for (const d of skills) {
    const key = displaySkill(d.skill);
    const entry = totals.get(key) ?? { done: 0, total: 0 };
    entry.done += d.done;
    entry.total += d.total;
    totals.set(key, entry);
  }
  return DISPLAY_SKILLS.map((skill) => {
    const t = totals.get(skill);
    const percent = !t || t.total === 0 ? 0 : Math.round((t.done / t.total) * 100);
    return { skill, percent, label: DISPLAY_SKILL_LABELS[skill], color: SKILL_COLORS[skill] };
  });
}

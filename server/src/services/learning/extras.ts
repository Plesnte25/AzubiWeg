import type { CefrLevel, RoadmapSkill } from "@prisma/client";
import { DEFAULT_ROADMAP_DAYS } from "./roadmap-defaults.js";

/**
 * Plan's per-level "Extras": the curated practice the old calendar carried besides the syllabus — each week's one
 * input resource (Nicos Weg, DW, Nachrichtenleicht, a graded reader…) and the Deutschland Context items. Stations
 * are single-kind (grammar / vocab / skills), so these can't honestly sit on one; they're a level-wide list, and
 * "Add to today" makes an ordinary dated task. The calendar's generic daily Reading/Listening/Speaking/Writing tasks
 * are gone: each level's skills topics cover them with real exercises.
 */

export interface Extra {
  id: string;
  level: CefrLevel;
  kind: "resource" | "context";
  skill: RoadmapSkill;
  title: string;
  description: string | null;
}

/** The calendar's regular weeks per level (milestone weeks 8/16/25/26 only held reviews and tests). */
const LEVEL_WEEKS: { level: CefrLevel; from: number; to: number }[] = [
  { level: "a1", from: 1, to: 7 },
  { level: "a2", from: 9, to: 15 },
  { level: "b1", from: 17, to: 24 },
];

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const DAILY_PREFIX = /^(Reading|Listening|Speaking|Writing): /;

function buildExtras(): Extra[] {
  const out: Extra[] = [];
  for (const { level, from, to } of LEVEL_WEEKS) {
    for (let week = from; week <= to; week++) {
      const base = (week - 1) * 7;
      const thursday = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === base + 3);
      const friday = DEFAULT_ROADMAP_DAYS.find((d) => d.dayOffset === base + 4);
      for (const t of thursday?.tasks ?? []) {
        if (DAILY_PREFIX.test(t.title) || !t.skill) continue;
        out.push({ id: `${level}-${slug(t.title)}`, level, kind: "resource", skill: t.skill, title: t.title, description: t.description ?? null });
      }
      for (const t of friday?.tasks ?? []) {
        if (t.skill !== "bureaucracy") continue;
        out.push({ id: `${level}-${slug(t.title)}`, level, kind: "context", skill: t.skill, title: t.title, description: t.description ?? null });
      }
    }
  }
  return out;
}

export const EXTRAS: Extra[] = buildExtras();

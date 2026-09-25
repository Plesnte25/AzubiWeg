/**
 * Plan journey stations (Bento README §4). A station is a derived (level, theme) group of syllabus items, in
 * syllabus order — A1 and A2 have 22, B1 has 23 — and the level's last station ("Exam prep") is the gate. Nothing is
 * stored: stations are recomputed from SyllabusItem rows, and other rows point at one by its key ("level:theme",
 * StudySource.stationKey / Note.stationKey).
 */

export type StationLevel = "a1" | "a2" | "b1";
export type MasteryState = "not_started" | "learning" | "passed" | "mastered";
export type StationState = "done" | "cur" | "locked" | "gate";

export interface StationItem {
  id: string;
  level: StationLevel;
  theme: string | null;
  sortOrder: number;
  masteryState: MasteryState;
  skippedAt: Date | null;
}

export interface Station {
  key: string;
  level: StationLevel;
  theme: string;
  /** 1-based position within the level. */
  index: number;
  itemIds: string[];
  total: number;
  /** Items passed or mastered. */
  passed: number;
  /** Every item passed, mastered or skipped. */
  closed: boolean;
  state: StationState;
}

/** Items with no theme (older custom items) group under this station name. */
export const UNTHEMED = "More topics";

export function stationKey(level: StationLevel, theme: string): string {
  return `${level}:${theme}`;
}

export function parseStationKey(key: string): { level: StationLevel; theme: string } | null {
  const i = key.indexOf(":");
  const level = key.slice(0, i);
  if (i < 0 || !["a1", "a2", "b1"].includes(level) || i === key.length - 1) return null;
  return { level: level as StationLevel, theme: key.slice(i + 1) };
}

/** For API validation of a posted station key. */
export function isStationKey(key: string): boolean {
  return key.length <= 200 && parseStationKey(key) !== null;
}

const isPassed = (s: MasteryState) => s === "passed" || s === "mastered";

/**
 * One level's stations in order (by each theme's first item's sortOrder). State: closed stations are "done", the
 * first open one is "cur", later ones "locked"; the last station is always "gate" (the exam gate is its own rule —
 * see exam.ts — so it doesn't take part in done/cur).
 */
export function deriveStations(items: StationItem[], level: StationLevel): Station[] {
  const groups = new Map<string, StationItem[]>();
  for (const item of [...items].filter((i) => i.level === level).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const theme = item.theme?.trim() || UNTHEMED;
    const group = groups.get(theme) ?? [];
    group.push(item);
    groups.set(theme, group);
  }

  const stations: Station[] = [...groups.entries()].map(([theme, group], i) => {
    const passed = group.filter((g) => isPassed(g.masteryState)).length;
    return {
      key: stationKey(level, theme),
      level,
      theme,
      index: i + 1,
      itemIds: group.map((g) => g.id),
      total: group.length,
      passed,
      closed: group.every((g) => isPassed(g.masteryState) || g.skippedAt !== null),
      state: "locked" as StationState,
    };
  });

  let curAssigned = false;
  stations.forEach((s, i) => {
    if (i === stations.length - 1 && stations.length > 1) s.state = "gate";
    else if (s.closed) s.state = "done";
    else if (!curAssigned) {
      s.state = "cur";
      curAssigned = true;
    }
  });
  return stations;
}

export interface LevelMastery {
  level: StationLevel;
  /** Level % — the one app-wide definition (hero, altitude rail, Jobs nudge). */
  percent: number;
  passedItems: number;
  /** Items that count toward the level: all of them except skipped ones (skipping must not make 100% unreachable). */
  countedItems: number;
  closedStations: number;
  totalStations: number;
  current: Station | null;
}

/** Level % = passed + mastered items ÷ the level's (non-skipped) items, plus the "8/22 stations" counts. */
export function levelMastery(items: StationItem[], level: StationLevel): LevelMastery {
  const inLevel = items.filter((i) => i.level === level);
  const counted = inLevel.filter((i) => i.skippedAt === null || isPassed(i.masteryState));
  const passedItems = counted.filter((i) => isPassed(i.masteryState)).length;
  const stations = deriveStations(items, level);
  return {
    level,
    percent: counted.length === 0 ? 0 : Math.round((passedItems / counted.length) * 100),
    passedItems,
    countedItems: counted.length,
    closedStations: stations.filter((s) => s.closed).length,
    totalStations: stations.length,
    current: stations.find((s) => s.state === "cur") ?? null,
  };
}

/** Checkpoints sit after stations 7, 14 and 21 (README §4); checkpoint n covers the seven stations before it. */
export const CHECKPOINT_AFTER = [7, 14, 21] as const;

export function checkpointStations(stations: Station[], checkpointIndex: 1 | 2 | 3): Station[] {
  const last = CHECKPOINT_AFTER[checkpointIndex - 1]!;
  return stations.filter((s) => s.index > last - 7 && s.index <= last);
}

/** The five skills the Stats "Mastery by skill" tile lists, in the handoff's order. */
export const MASTERY_SKILLS = ["reading", "listening", "grammar", "writing", "speaking"] as const;
export type MasterySkill = (typeof MASTERY_SKILLS)[number];

export interface SkillMastery {
  skill: MasterySkill;
  passed: number;
  counted: number;
  /** null when the level has no counted items for this skill. */
  percent: number | null;
}

/** Level % split by skill — same counting rule as levelMastery (skipped items only count once passed). */
export function skillMastery(items: (StationItem & { skill: string | null })[], level: StationLevel): SkillMastery[] {
  const counted = items.filter((i) => i.level === level && (i.skippedAt === null || isPassed(i.masteryState)));
  return MASTERY_SKILLS.map((skill) => {
    const inSkill = counted.filter((i) => i.skill === skill);
    const passed = inSkill.filter((i) => isPassed(i.masteryState)).length;
    return {
      skill,
      passed,
      counted: inSkill.length,
      percent: inSkill.length === 0 ? null : Math.round((passed / inSkill.length) * 100),
    };
  });
}

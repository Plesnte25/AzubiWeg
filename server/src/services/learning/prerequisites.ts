import { UNTHEMED } from "./stations.js";

type OrderedTopic = {
  id: string;
  level: string;
  sortOrder: number;
  category: "grammar" | "vocab_theme" | "skill";
  theme: string | null;
  masteryState: "not_started" | "learning" | "passed" | "mastered";
  skippedAt: Date | null;
};

const isDone = (t: OrderedTopic) => t.masteryState === "passed" || t.masteryState === "mastered" || t.skippedAt !== null;

/**
 * Each level runs three independent lines (grammar, vocab themes, skills), each in syllabus order: a topic is open
 * only once every earlier topic *in its own line* is passed, mastered or skipped. So a vocab topic never waits on
 * the dative, while grammar still builds on grammar. The level's last station (Exam prep, the gate — see
 * deriveStations) is its own line that opens only after everything else in the level is done.
 */
export function blockedTopicIds(topics: OrderedTopic[]): Set<string> {
  const blocked = new Set<string>();
  const byLevel = new Map<string, OrderedTopic[]>();
  for (const topic of topics) byLevel.set(topic.level, [...(byLevel.get(topic.level) ?? []), topic]);

  for (const levelTopics of byLevel.values()) {
    levelTopics.sort((a, b) => a.sortOrder - b.sortOrder);
    const gateTheme = gateThemeOf(levelTopics);
    const isGate = (t: OrderedTopic) => (t.theme?.trim() || UNTHEMED) === gateTheme;

    const lines = new Map<string, OrderedTopic[]>();
    for (const topic of levelTopics) {
      if (isGate(topic)) continue;
      lines.set(topic.category, [...(lines.get(topic.category) ?? []), topic]);
    }
    for (const line of lines.values()) blockLine(line, true, blocked);

    const restDone = levelTopics.every((t) => isGate(t) || isDone(t));
    blockLine(levelTopics.filter(isGate), restDone, blocked);
  }
  return blocked;
}

/** A level's gate station theme (its last station by first-item order, as deriveStations has it); `levelTopics`
 * sorted by sortOrder. null for a single-station level. */
export function gateThemeOf(levelTopics: { theme: string | null }[]): string | null {
  const themes = [...new Set(levelTopics.map((t) => t.theme?.trim() || UNTHEMED))];
  return themes.length > 1 ? themes[themes.length - 1]! : null;
}

function blockLine(line: OrderedTopic[], open: boolean, blocked: Set<string>) {
  let prerequisitePassed = open;
  for (const topic of line) {
    if (!prerequisitePassed) blocked.add(topic.id);
    if (!isDone(topic)) prerequisitePassed = false;
  }
}

type OrderedTopic = {
  id: string;
  level: string;
  sortOrder: number;
  masteryState: "not_started" | "learning" | "passed" | "mastered";
};

const completedStates = new Set(["passed", "mastered"]);

/**
 * A topic is available only after all earlier topics in the same CEFR level
 * have reached a passing state. This keeps optional acceleration pedagogically
 * ordered without changing roadmap dates or completion records.
 */
export function blockedTopicIds(topics: OrderedTopic[]): Set<string> {
  const blocked = new Set<string>();
  const byLevel = new Map<string, OrderedTopic[]>();
  for (const topic of topics) {
    const levelTopics = byLevel.get(topic.level) ?? [];
    levelTopics.push(topic);
    byLevel.set(topic.level, levelTopics);
  }

  for (const levelTopics of byLevel.values()) {
    levelTopics.sort((a, b) => a.sortOrder - b.sortOrder);
    let prerequisitePassed = true;
    for (const topic of levelTopics) {
      if (!prerequisitePassed) blocked.add(topic.id);
      if (!completedStates.has(topic.masteryState)) prerequisitePassed = false;
    }
  }
  return blocked;
}

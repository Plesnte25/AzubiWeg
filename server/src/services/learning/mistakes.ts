export type MistakeAttempt = {
  mistakeCategory: string | null;
  syllabusItem: { title: string };
};

export type MistakeSummary = {
  category: string;
  count: number;
  topics: string[];
};

export function summarizeMistakes(attempts: MistakeAttempt[]): MistakeSummary[] {
  const counts = new Map<string, MistakeSummary>();
  for (const attempt of attempts) {
    if (!attempt.mistakeCategory) continue;
    const current = counts.get(attempt.mistakeCategory) ?? {
      category: attempt.mistakeCategory,
      count: 0,
      topics: [],
    };
    current.count += 1;
    if (!current.topics.includes(attempt.syllabusItem.title)) current.topics.push(attempt.syllabusItem.title);
    counts.set(attempt.mistakeCategory, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

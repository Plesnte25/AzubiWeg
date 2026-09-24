import type { BankQuestion } from "./question-bank.js";
import type { Station, StationLevel } from "./stations.js";

/**
 * Which Plan station each authored question-bank topic belongs to. Bank topics are German slugs ("dativ") and
 * station themes are the syllabus's English theme names ("Dative case"), so word overlap can't connect them; this
 * table does. Add a row whenever a new bank topic is authored.
 */
export const BANK_TOPIC_STATION: Record<string, string> = {
  "a1:akkusativ": "Cases: nominative & accusative",
  "a1:articles-gender": "Nouns & articles",
  "a1:negation": "Sentence structure",
  "a1:questions": "Sentence structure",
  "a1:modal-verbs": "Modal verbs",
  "a1:separable-verbs": "Separable verbs",
  "a1:numbers-time": "Numbers, time & dates",
  "a1:greetings": "Personal world",
  "a1:family": "Personal world",
  "a1:daily-routine": "Everyday life",
  "a1:food-ordering": "Everyday life",
  "a1:shopping": "Everyday life",
  "a1:directions": "Out & about",
  "a1:weather": "Out & about",
  "a2:dativ": "Dative case",
  "a2:wechselpraepositionen": "Two-way prepositions",
  "a2:perfekt": "Past tenses",
  "a2:praeteritum-modals": "Past tenses",
  "a2:komparativ": "Comparison",
  "a2:nebensaetze": "Subordinate clauses",
  "a2:reflexiv": "Reflexive verbs",
  "a2:arbeit": "Education & work",
  "a2:gesundheit": "Health",
  "a2:wohnen": "Housing",
  "a2:amt": "Money & services",
  "b1:passiv": "Passive voice",
  "b1:konjunktiv-ii": "Konjunktiv II",
  "b1:relativsaetze": "Relative clauses",
  "b1:konnektoren": "Connectors",
  "b1:praeteritum": "Narrative past",
  "b1:plusquamperfekt": "Narrative past",
  "b1:arbeit-ausbildung": "Applications & Ausbildung",
  "b1:buerokratie": "Bureaucracy",
  "b1:meinung": "Argumentation",
};

export function bankQuestionStation(q: Pick<BankQuestion, "level" | "topic">): string | null {
  return BANK_TOPIC_STATION[`${q.level}:${q.topic}`] ?? null;
}

/**
 * The bank questions for a checkpoint: those whose topic belongs to one of the checkpoint's stations first, then —
 * only if that leaves fewer than `minCount` (later stations like Speaking/Writing have no authored bank questions) —
 * the rest of the same level, so the mixed test still reaches its size. `scoped` tells the caller how many really
 * came from the checkpoint's stations.
 */
export function checkpointBank(
  bank: BankQuestion[],
  stations: Station[],
  level: StationLevel,
  minCount: number,
): { questions: BankQuestion[]; scoped: number } {
  const themes = new Set(stations.map((s) => s.theme));
  const scoped = bank.filter((q) => q.level === level && themes.has(bankQuestionStation(q) ?? ""));
  if (scoped.length >= minCount) return { questions: scoped, scoped: scoped.length };
  const scopedIds = new Set(scoped.map((q) => q.id));
  const topUp = bank.filter((q) => q.level === level && !scopedIds.has(q.id));
  return { questions: [...scoped, ...topUp], scoped: scoped.length };
}

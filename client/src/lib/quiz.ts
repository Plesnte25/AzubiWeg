// client mirror of normalizeAnswer in server/src/services/learning/engine.ts —
// keep the two in sync so fill-blank grading matches what the bank's accepted
// lists were written against

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[.,!?;:'"„"»«]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerAccepted(input: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(input);
  return accepted.some((a) => normalizeAnswer(a) === normalized);
}

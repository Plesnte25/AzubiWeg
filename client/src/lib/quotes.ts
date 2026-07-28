const QUOTES = [
  "Kleine Schritte, jeden Tag — small steps, every day.",
  "Every word you learn today is one less to learn tomorrow.",
  "Der Weg ist das Ziel — the journey is the destination.",
  "Consistency beats intensity. Show up, even for five minutes.",
  "Your Ausbildung starts with the habits you build right now.",
  "Fehler sind Lehrer — mistakes are teachers. Keep going.",
  "A little German today gets you a lot closer to Germany.",
  "Progress, not perfection — Übung macht den Meister.",
  "The applications you send today are the interviews of tomorrow.",
  "Every vocab card reviewed is a brick in the bridge to Germany.",
  "Ruhe bewahren — stay calm, stay steady, stay on track.",
  "You don't have to be fluent today. You just have to start today.",
];

/** Deterministic per-day pick — same quote all day, changes tomorrow. */
export function quoteOfTheDay(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length]!;
}

import type { ApplicationStatus } from "@prisma/client";

/**
 * Curated interview/Probetag phrase bank for the Jobs detail modal's "Phrases to rehearse" (Bento README §6). Each
 * phrase is tagged with the stages where it's useful; the modal shows the ones for the application's current stage
 * plus the user's own (ApplicationPhrase rows). "+" on a phrase adds a Speaking task to today's ticket — a plain
 * POST /api/roadmap/tasks with skill "speaking"; no phrase state is stored server-side.
 *
 * Written for an A2 learner heading to B1: short, standard, polite (Sie-form) sentences. "…" marks a slot to fill.
 * `id`s are stable so the client can remember which ones it has added today.
 */

export type PhraseContext = "call" | "intro" | "motivation" | "clarify" | "questions" | "probetag" | "closing" | "offer";

export interface CuratedPhrase {
  id: string;
  de: string;
  en: string;
  context: PhraseContext;
  stages: ApplicationStatus[];
}

const EARLY: ApplicationStatus[] = ["wishlist", "applied"];
const INTERVIEW: ApplicationStatus[] = ["interview"];
const ALL: ApplicationStatus[] = ["wishlist", "applied", "interview", "offer"];

export const CURATED_PHRASES: CuratedPhrase[] = [
  // calling about a posting / following up
  { id: "call-intro", context: "call", stages: EARLY, de: "Guten Tag, mein Name ist … Ich rufe wegen der Ausbildungsstelle als … an.", en: "Hello, my name is … I'm calling about the apprenticeship as …" },
  { id: "call-open", context: "call", stages: EARLY, de: "Ist die Stelle noch frei?", en: "Is the position still open?" },
  { id: "call-arrived", context: "call", stages: ["applied"], de: "Ich habe meine Bewerbung am … geschickt und wollte nachfragen, ob sie angekommen ist.", en: "I sent my application on … and wanted to check whether it arrived." },
  { id: "call-when", context: "call", stages: ["applied"], de: "Wann kann ich mit einer Rückmeldung rechnen?", en: "When can I expect to hear back?" },
  { id: "call-status", context: "call", stages: ["applied"], de: "Ich möchte mich nach dem Stand meiner Bewerbung erkundigen.", en: "I'd like to ask about the status of my application." },
  { id: "call-contact", context: "call", stages: EARLY, de: "Könnten Sie mir bitte den Namen der Ansprechperson nennen?", en: "Could you tell me the name of the contact person, please?" },
  { id: "call-bye", context: "call", stages: EARLY, de: "Vielen Dank für Ihre Zeit. Auf Wiederhören!", en: "Thank you for your time. Goodbye! (on the phone)" },

  // introducing yourself
  { id: "intro-thanks", context: "intro", stages: INTERVIEW, de: "Vielen Dank für die Einladung zum Vorstellungsgespräch.", en: "Thank you for inviting me to the interview." },
  { id: "intro-origin", context: "intro", stages: INTERVIEW, de: "Ich komme aus … und lebe seit … in Deutschland.", en: "I come from … and have lived in Germany since …" },
  { id: "intro-level", context: "intro", stages: INTERVIEW, de: "Zurzeit lerne ich Deutsch und habe das Niveau …", en: "I'm currently learning German and I'm at level …" },
  { id: "intro-plan", context: "intro", stages: INTERVIEW, de: "Ich lerne jeden Tag, damit ich bis … das Niveau B1 erreiche.", en: "I study every day so that I reach B1 by …" },
  { id: "intro-work", context: "intro", stages: INTERVIEW, de: "In meinem Heimatland habe ich als … gearbeitet.", en: "In my home country I worked as …" },

  // motivation and strengths
  { id: "mot-hands", context: "motivation", stages: INTERVIEW, de: "Ich interessiere mich für diesen Beruf, weil ich gern mit den Händen arbeite.", en: "I'm interested in this job because I like working with my hands." },
  { id: "mot-company", context: "motivation", stages: INTERVIEW, de: "Ihr Betrieb gefällt mir, weil …", en: "I like your company because …" },
  { id: "mot-strengths", context: "motivation", stages: INTERVIEW, de: "Meine Stärken sind Zuverlässigkeit und Pünktlichkeit.", en: "My strengths are reliability and punctuality." },
  { id: "mot-team", context: "motivation", stages: INTERVIEW, de: "Ich arbeite gern im Team.", en: "I like working in a team." },
  { id: "mot-ask", context: "motivation", stages: INTERVIEW, de: "Wenn ich etwas nicht verstehe, frage ich nach.", en: "If I don't understand something, I ask." },

  // when you didn't understand
  { id: "clar-repeat", context: "clarify", stages: ALL, de: "Entschuldigung, können Sie das bitte wiederholen?", en: "Sorry, could you repeat that, please?" },
  { id: "clar-slow", context: "clarify", stages: ALL, de: "Können Sie bitte etwas langsamer sprechen?", en: "Could you speak a little more slowly, please?" },
  { id: "clar-check", context: "clarify", stages: ALL, de: "Habe ich Sie richtig verstanden, dass …?", en: "Did I understand you correctly that …?" },

  // questions to ask
  { id: "q-day", context: "questions", stages: INTERVIEW, de: "Wie sieht ein typischer Arbeitstag für Auszubildende aus?", en: "What does a typical working day look like for apprentices?" },
  { id: "q-school", context: "questions", stages: INTERVIEW, de: "Wo ist die Berufsschule, und an welchen Tagen habe ich Unterricht?", en: "Where is the vocational school, and on which days do I have classes?" },
  { id: "q-mentor", context: "questions", stages: INTERVIEW, de: "Wer ist während der Ausbildung mein Ansprechpartner?", en: "Who is my contact person during the apprenticeship?" },
  { id: "q-keep", context: "questions", stages: INTERVIEW, de: "Gibt es die Möglichkeit, nach der Ausbildung übernommen zu werden?", en: "Is there a chance of being kept on after the apprenticeship?" },
  { id: "q-next", context: "questions", stages: INTERVIEW, de: "Wie geht es nach dem Gespräch weiter?", en: "What are the next steps after the interview?" },

  // the Probetag (trial day)
  { id: "pt-where", context: "probetag", stages: INTERVIEW, de: "Wo soll ich mich melden, und wann fange ich an?", en: "Where should I report, and when do I start?" },
  { id: "pt-bring", context: "probetag", stages: INTERVIEW, de: "Was soll ich zum Probetag mitbringen?", en: "What should I bring to the trial day?" },
  { id: "pt-show", context: "probetag", stages: INTERVIEW, de: "Können Sie mir zeigen, wie das geht?", en: "Can you show me how this works?" },
  { id: "pt-done", context: "probetag", stages: INTERVIEW, de: "Ich bin fertig. Was kann ich als Nächstes machen?", en: "I'm done. What can I do next?" },
  { id: "pt-thanks", context: "probetag", stages: INTERVIEW, de: "Danke, der Tag hat mir viel Spaß gemacht.", en: "Thank you, I really enjoyed the day." },

  // closing and the offer
  { id: "close-thanks", context: "closing", stages: INTERVIEW, de: "Vielen Dank für das Gespräch. Ich freue mich auf Ihre Rückmeldung.", en: "Thank you for the conversation. I look forward to hearing from you." },
  { id: "offer-accept", context: "offer", stages: ["offer"], de: "Ich nehme das Angebot sehr gern an.", en: "I'm very happy to accept the offer." },
  { id: "offer-read", context: "offer", stages: ["offer"], de: "Kann ich den Ausbildungsvertrag zu Hause in Ruhe lesen?", en: "Can I read the training contract at home first?" },
  { id: "offer-start", context: "offer", stages: ["offer"], de: "Wann beginnt die Ausbildung, und welche Unterlagen brauchen Sie noch von mir?", en: "When does the apprenticeship start, and which documents do you still need from me?" },
];

/** The curated phrases worth rehearsing at this stage (rejected shows none). */
export function phrasesForStage(stage: ApplicationStatus): CuratedPhrase[] {
  return CURATED_PHRASES.filter((p) => p.stages.includes(stage));
}

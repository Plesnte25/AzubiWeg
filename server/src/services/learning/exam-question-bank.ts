import type { CefrLevel } from "@prisma/client";

/** The 4 sections the Exam Gate breaks a level's final exam into (Vocabulary / Grammar / Gender drill / Listening).
 * "listening" questions carry an `audio` transcript: the client plays it through the server's cached Edge TTS
 * (services/learning/listening-audio.ts, GET /exam/:attemptId/audio/:qid) and the prompt asks about what was said.
 * The transcript is only shown as text if the audio can't be played. */
export type ExamSection = "vocabulary" | "grammar" | "gender_drill" | "listening";

export type ExamQuestion =
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "mcq";
      prompt: string;
      choices: string[];
      answerIndex: number;
      explanation?: string;
      /** Listening: German text spoken via TTS; never shown up front. */
      audio?: string;
    }
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "fill_blank";
      prompt: string;
      accepted: string[];
      explanation?: string;
      /** Listening: German text spoken via TTS; never shown up front. */
      audio?: string;
    }
  | {
      id: string;
      level: CefrLevel;
      section: ExamSection;
      type: "true_false";
      prompt: string;
      answer: boolean;
      explanation?: string;
      /** Listening: German text spoken via TTS; never shown up front. */
      audio?: string;
    };

/**
 * Dedicated, separately-authored exam content — deliberately NOT the same pool as question-bank.ts's practice
 * QUESTION_BANK (the real gating exam needs its own higher-stakes questions). Ids are stable and persist in
 * ExamAttempt.sectionBreakdown — never renumber or reuse an id; retire by deletion, add with fresh numbers.
 *
 * 20 questions per level, 5 per section. MCQs are authored with the right answer first; the session shuffles each
 * question's choices per attempt (exam.ts), so the order here never leaks the answer.
 */
export const EXAM_QUESTION_BANK: ExamQuestion[] = [
  // ═══ A1 · vocabulary ═══
  { id: "exam-a1-vocab-01", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Die Rechnung\" means:", choices: ["the bill/invoice", "the receipt", "the menu", "the tip"], answerIndex: 0 },
  { id: "exam-a1-vocab-02", level: "a1", section: "vocabulary", type: "fill_blank", prompt: "Ich brauche ein neues Handy, meins ist ___ . (broken)", accepted: ["kaputt"] },
  { id: "exam-a1-vocab-03", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Der Termin\" means:", choices: ["appointment", "term of a contract", "birthday", "weekend"], answerIndex: 0 },
  { id: "exam-a1-vocab-04", level: "a1", section: "vocabulary", type: "true_false", prompt: "\"Die Miete\" means the rent you pay for an apartment.", answer: true },
  { id: "exam-a1-vocab-05", level: "a1", section: "vocabulary", type: "mcq", prompt: "\"Die Ausbildung\" is best translated as:", choices: ["vocational training", "the exhibition", "the education fee", "the workplace"], answerIndex: 0 },

  // ═══ A1 · grammar ═══
  { id: "exam-a1-gram-01", level: "a1", section: "grammar", type: "fill_blank", prompt: "Ich ___ jeden Tag Deutsch. (lernen)", accepted: ["lerne"] },
  { id: "exam-a1-gram-02", level: "a1", section: "grammar", type: "mcq", prompt: "Wähle die richtige Form: Er ___ aus Deutschland.", choices: ["kommt", "kommst", "kommen", "komme"], answerIndex: 0 },
  { id: "exam-a1-gram-03", level: "a1", section: "grammar", type: "fill_blank", prompt: "Wir ___ heute keine Zeit. (haben)", accepted: ["haben"] },
  { id: "exam-a1-gram-04", level: "a1", section: "grammar", type: "true_false", prompt: "In a German yes/no question, the verb comes first: \"Kommst du morgen?\"", answer: true },
  { id: "exam-a1-gram-05", level: "a1", section: "grammar", type: "mcq", prompt: "Negate correctly: \"Ich habe ein Auto.\" → \"Ich habe ___ Auto.\"", choices: ["kein", "nicht", "keine", "nichts"], answerIndex: 0 },

  // ═══ A1 · gender drill ═══
  { id: "exam-a1-gen-01", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Wohnung ist sehr klein.", choices: ["Die", "Der", "Das", "Den"], answerIndex: 0 },
  { id: "exam-a1-gen-02", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Bahnhof ist gleich um die Ecke.", choices: ["Der", "Die", "Das", "Dem"], answerIndex: 0 },
  { id: "exam-a1-gen-03", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Kind spielt im Park.", choices: ["Das", "Der", "Die", "Den"], answerIndex: 0 },
  { id: "exam-a1-gen-04", level: "a1", section: "gender_drill", type: "true_false", prompt: "\"Das Schlüssel\" is correct — the key is neuter.", answer: false, explanation: "It's der Schlüssel (masculine)." },
  { id: "exam-a1-gen-05", level: "a1", section: "gender_drill", type: "mcq", prompt: "___ Vertrag muss unterschrieben werden.", choices: ["Der", "Die", "Das", "Den"], answerIndex: 0 },

  // ═══ A1 · listening ═══
  { id: "exam-a1-lis-01", level: "a1", section: "listening", type: "mcq", audio: "Entschuldigung, wo ist der Bahnhof? – Gehen Sie hier geradeaus und dann links.", prompt: "What are the directions to the station?", choices: ["Go straight, then turn left", "Go straight, then turn right", "Turn around", "Take the bus"], answerIndex: 0 },
  { id: "exam-a1-lis-02", level: "a1", section: "listening", type: "mcq", audio: "Möchten Sie noch etwas? – Nein danke, das war's.", prompt: "What does the customer say?", choices: ["No thanks, that's all", "Yes, one more please", "I don't understand", "Can I pay now?"], answerIndex: 0 },
  { id: "exam-a1-lis-03", level: "a1", section: "listening", type: "fill_blank", audio: "Wie war Ihr Wochenende? – Sehr schön, danke!", prompt: "How was the weekend? Type the word you hear: \"Sehr ___, danke!\"", accepted: ["schön"] },
  { id: "exam-a1-lis-04", level: "a1", section: "listening", type: "mcq", audio: "Haben Sie einen Termin? – Nein, aber es ist dringend.", prompt: "The person has no appointment. What do they say about their situation?", choices: ["It's urgent", "It's not important", "They'll come back tomorrow", "They cancelled"], answerIndex: 0 },
  { id: "exam-a1-lis-05", level: "a1", section: "listening", type: "true_false", audio: "Um wie viel Uhr öffnet die Bank? – Um halb neun.", prompt: "The bank opens at 9 o'clock.", answer: false, explanation: "Um halb neun = at half past eight." },

  // ═══ A2 · vocabulary ═══
  { id: "exam-a2-vocab-01", level: "a2", section: "vocabulary", type: "mcq", prompt: "\"Die Kündigung\" means:", choices: ["notice of termination", "the announcement", "customer service", "the receipt"], answerIndex: 0 },
  { id: "exam-a2-vocab-02", level: "a2", section: "vocabulary", type: "fill_blank", prompt: "Für die Bewerbung brauche ich einen ___ auf Deutsch. (CV)", accepted: ["Lebenslauf"] },
  { id: "exam-a2-vocab-03", level: "a2", section: "vocabulary", type: "mcq", prompt: "\"Sich um eine Stelle bewerben\" means:", choices: ["to apply for a job", "to complain about a job", "to quit a job", "to get used to a job"], answerIndex: 0 },
  { id: "exam-a2-vocab-04", level: "a2", section: "vocabulary", type: "true_false", prompt: "\"Überstunden\" are hours you work beyond your normal working time.", answer: true },
  { id: "exam-a2-vocab-05", level: "a2", section: "vocabulary", type: "true_false", prompt: "\"Pünktlich\" means polite.", answer: false, explanation: "Pünktlich = on time; polite is höflich." },

  // ═══ A2 · grammar ═══
  { id: "exam-a2-gram-01", level: "a2", section: "grammar", type: "fill_blank", prompt: "Gestern ___ ich bis 18 Uhr gearbeitet. (haben)", accepted: ["habe"] },
  { id: "exam-a2-gram-02", level: "a2", section: "grammar", type: "mcq", prompt: "Letzten Sommer ___ wir nach Hamburg gefahren.", choices: ["sind", "haben", "waren", "hatten"], answerIndex: 0, explanation: "fahren forms the Perfekt with sein." },
  { id: "exam-a2-gram-03", level: "a2", section: "grammar", type: "mcq", prompt: "Ich lerne Deutsch, ___ ich in Deutschland eine Ausbildung machen möchte.", choices: ["weil", "denn", "deshalb", "trotzdem"], answerIndex: 0, explanation: "Only weil sends the verb (möchte) to the end." },
  { id: "exam-a2-gram-04", level: "a2", section: "grammar", type: "fill_blank", prompt: "Ich helfe ___ Kollegin. (die, Dativ)", accepted: ["der"] },
  { id: "exam-a2-gram-05", level: "a2", section: "grammar", type: "true_false", prompt: "\"Ich stelle die Tasche auf den Tisch.\" uses the accusative because it answers \"wohin?\".", answer: true },

  // ═══ A2 · gender drill ═══
  { id: "exam-a2-gen-01", level: "a2", section: "gender_drill", type: "mcq", prompt: "___ Lebenslauf ist zwei Seiten lang.", choices: ["Der", "Die", "Das", "Den"], answerIndex: 0 },
  { id: "exam-a2-gen-02", level: "a2", section: "gender_drill", type: "mcq", prompt: "Ich schreibe heute Abend ___ Bewerbung.", choices: ["die", "der", "den", "das"], answerIndex: 0 },
  { id: "exam-a2-gen-03", level: "a2", section: "gender_drill", type: "mcq", prompt: "Wir treffen uns vor ___ Werkstatt.", choices: ["der", "die", "dem", "den"], answerIndex: 0, explanation: "die Werkstatt → vor + Dativ (wo?) → der." },
  { id: "exam-a2-gen-04", level: "a2", section: "gender_drill", type: "true_false", prompt: "\"Das Zeugnis\" (certificate, school report) is neuter.", answer: true },
  { id: "exam-a2-gen-05", level: "a2", section: "gender_drill", type: "mcq", prompt: "Er spricht mit ___ Chef.", choices: ["dem", "den", "der", "das"], answerIndex: 0, explanation: "der Chef → mit + Dativ → dem." },

  // ═══ A2 · listening ═══
  { id: "exam-a2-lis-01", level: "a2", section: "listening", type: "mcq", audio: "Guten Tag, hier ist die Praxis Doktor Weber. Ihr Termin am Dienstag muss leider ausfallen. Können Sie am Donnerstag um zehn Uhr kommen? Bitte rufen Sie uns zurück.", prompt: "Why is the doctor's practice calling?", choices: ["Tuesday's appointment is cancelled; they suggest Thursday at 10", "To confirm the appointment on Tuesday at 10", "Thursday's appointment is cancelled; come on Tuesday", "To ask you to pay a bill"], answerIndex: 0 },
  { id: "exam-a2-lis-02", level: "a2", section: "listening", type: "true_false", audio: "Achtung am Gleis drei: Der Regionalexpress nach Köln hat heute etwa zwanzig Minuten Verspätung. Wir bitten um Entschuldigung.", prompt: "The train to Cologne is about 20 minutes late.", answer: true },
  { id: "exam-a2-lis-03", level: "a2", section: "listening", type: "mcq", audio: "Hallo Tim, hier ist Lena. Ich bin krank und kann heute nicht zur Arbeit kommen. Kannst du bitte dem Chef Bescheid sagen? Danke!", prompt: "What does Lena ask Tim to do?", choices: ["Tell the boss she is sick", "Pick her up from work", "Buy her some medicine", "Swap shifts with her"], answerIndex: 0 },
  { id: "exam-a2-lis-04", level: "a2", section: "listening", type: "fill_blank", audio: "Liebe Kunden, unser Supermarkt schließt heute schon um achtzehn Uhr. Morgen sind wir wie immer von acht bis zwanzig Uhr für Sie da.", prompt: "Today the supermarket closes at ___ o'clock. (a number)", accepted: ["18", "achtzehn"] },
  { id: "exam-a2-lis-05", level: "a2", section: "listening", type: "true_false", audio: "Willkommen im Betrieb! Ihre Arbeitszeit ist von sieben bis halb vier. Die Mittagspause ist um zwölf Uhr und dauert dreißig Minuten.", prompt: "The lunch break lasts an hour.", answer: false, explanation: "Sie dauert dreißig Minuten." },

  // ═══ B1 · vocabulary ═══
  { id: "exam-b1-vocab-01", level: "b1", section: "vocabulary", type: "mcq", prompt: "\"Das Vorstellungsgespräch\" means:", choices: ["the job interview", "the introductory course", "the performance review", "the presentation"], answerIndex: 0 },
  { id: "exam-b1-vocab-02", level: "b1", section: "vocabulary", type: "fill_blank", prompt: "In der Ausbildung gehe ich zwei Tage pro Woche in die ___ . (vocational school)", accepted: ["Berufsschule"] },
  { id: "exam-b1-vocab-03", level: "b1", section: "vocabulary", type: "mcq", prompt: "\"Kündigen\" means:", choices: ["to hand in your notice", "to announce", "to apply", "to sign a contract"], answerIndex: 0 },
  { id: "exam-b1-vocab-04", level: "b1", section: "vocabulary", type: "true_false", prompt: "\"Die Probezeit\" is the trial period at the start of a job.", answer: true },
  { id: "exam-b1-vocab-05", level: "b1", section: "vocabulary", type: "true_false", prompt: "\"Das Gehalt\" means the working hours.", answer: false, explanation: "Das Gehalt = the salary; working hours are die Arbeitszeit." },

  // ═══ B1 · grammar ═══
  { id: "exam-b1-gram-01", level: "b1", section: "grammar", type: "fill_blank", prompt: "Als ich jung war, ___ ich jeden Tag Fußball. (spielen, Präteritum)", accepted: ["spielte"] },
  { id: "exam-b1-gram-02", level: "b1", section: "grammar", type: "mcq", prompt: "Das ist der Kollege, ___ mir immer hilft.", choices: ["der", "den", "dem", "dessen"], answerIndex: 0, explanation: "He is the subject of the relative clause → Nominativ der." },
  { id: "exam-b1-gram-03", level: "b1", section: "grammar", type: "mcq", prompt: "Wenn ich mehr Zeit ___, würde ich einen Sprachkurs machen.", choices: ["hätte", "habe", "hatte", "hat"], answerIndex: 0, explanation: "An unreal condition takes Konjunktiv II: hätte." },
  { id: "exam-b1-gram-04", level: "b1", section: "grammar", type: "fill_blank", prompt: "Das Auto wird morgen in der Werkstatt ___ . (reparieren, Passiv)", accepted: ["repariert"] },
  { id: "exam-b1-gram-05", level: "b1", section: "grammar", type: "true_false", prompt: "In \"Obwohl es regnet, gehen wir spazieren.\" the conjunction obwohl sends the verb to the end of its clause.", answer: true },

  // ═══ B1 · gender drill ═══
  { id: "exam-b1-gen-01", level: "b1", section: "gender_drill", type: "mcq", prompt: "Trotz ___ Regens fahren wir los.", choices: ["des", "dem", "den", "der"], answerIndex: 0, explanation: "der Regen → trotz + Genitiv → des Regens." },
  { id: "exam-b1-gen-02", level: "b1", section: "gender_drill", type: "mcq", prompt: "Ich habe mich über ___ Gehalt gefreut.", choices: ["das", "den", "dem", "der"], answerIndex: 0, explanation: "das Gehalt → sich freuen über + Akkusativ → das." },
  { id: "exam-b1-gen-03", level: "b1", section: "gender_drill", type: "mcq", prompt: "Wegen ___ Prüfung bin ich nervös.", choices: ["der", "die", "des", "dem"], answerIndex: 0, explanation: "die Prüfung → wegen + Genitiv → der." },
  { id: "exam-b1-gen-04", level: "b1", section: "gender_drill", type: "true_false", prompt: "\"Betrieb\" (company, workplace) is feminine: die Betrieb.", answer: false, explanation: "It's der Betrieb (masculine)." },
  { id: "exam-b1-gen-05", level: "b1", section: "gender_drill", type: "mcq", prompt: "Morgen spreche ich mit ___ Ausbilderin.", choices: ["der", "die", "dem", "den"], answerIndex: 0, explanation: "die Ausbilderin → mit + Dativ → der." },

  // ═══ B1 · listening ═══
  { id: "exam-b1-lis-01", level: "b1", section: "listening", type: "mcq", audio: "Hier ist die Personalabteilung der Firma Krause. Vielen Dank für Ihre Bewerbung. Wir möchten Sie gern zu einem Vorstellungsgespräch einladen, und zwar am Mittwoch um vierzehn Uhr. Bitte bringen Sie Ihre Zeugnisse mit.", prompt: "What should you bring to the interview?", choices: ["Your certificates and school reports", "Your passport", "A work sample", "A letter from your teacher"], answerIndex: 0 },
  { id: "exam-b1-lis-02", level: "b1", section: "listening", type: "true_false", audio: "Wegen Bauarbeiten fährt die Linie fünf ab Montag nur bis zum Hauptbahnhof. Fahrgäste in Richtung Flughafen nehmen bitte ab dort den Ersatzbus.", prompt: "From Monday, line 5 runs all the way to the airport.", answer: false, explanation: "Only as far as the main station; then a replacement bus." },
  { id: "exam-b1-lis-03", level: "b1", section: "listening", type: "mcq", audio: "Ich mache seit einem Jahr eine Ausbildung als Elektronikerin. Am Anfang war die Berufsschule schwer für mich, weil ich viele Fachwörter nicht kannte. Inzwischen verstehe ich fast alles, und meine Noten sind viel besser geworden.", prompt: "What was hard for her at first?", choices: ["The technical vocabulary at vocational school", "Getting up early", "The practical work in the company", "Finding an apprenticeship"], answerIndex: 0 },
  { id: "exam-b1-lis-04", level: "b1", section: "listening", type: "mcq", audio: "Die Bibliothek bleibt vom vierundzwanzigsten Dezember bis zum ersten Januar geschlossen. Bücher können Sie in dieser Zeit in den Rückgabekasten am Eingang werfen.", prompt: "What can you do while the library is closed?", choices: ["Return books through the box at the entrance", "Borrow books online", "Renew books by phone", "Nothing until January"], answerIndex: 0 },
  { id: "exam-b1-lis-05", level: "b1", section: "listening", type: "fill_blank", audio: "Hallo Frau Yilmaz, hier spricht Herr Braun aus der Werkstatt. Ihr Auto ist fertig, aber die Reparatur war teurer als geplant: Statt zweihundert kostet sie dreihundertfünfzig Euro. Sie können den Wagen ab sechzehn Uhr abholen.", prompt: "How much does the repair cost now, in euros? (a number)", accepted: ["350", "dreihundertfünfzig"] },
];

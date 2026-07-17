import type { CefrLevel } from "@prisma/client";

export type BankQuestion =
  | {
      id: string;
      level: CefrLevel;
      topic: string;
      type: "mcq";
      prompt: string;
      choices: string[];
      answerIndex: number;
    }
  | {
      id: string;
      level: CefrLevel;
      topic: string;
      type: "fill_blank";
      // prompt contains exactly one ___; accepted holds natural-form answers,
      // comparison normalizes both sides (see engine normalizeAnswer)
      prompt: string;
      accepted: string[];
    }
  | {
      id: string;
      level: CefrLevel;
      topic: string;
      type: "true_false";
      prompt: string;
      answer: boolean;
    };

/**
 * Authored question bank, aligned with the Goethe A1–B1 curricula and the
 * seeded syllabus topics. Ids are stable and persist in SelfTestResult
 * questionIds — never renumber or reuse an id; retire by deletion, add with
 * fresh numbers.
 */
export const QUESTION_BANK: BankQuestion[] = [
  // ═══ A1 · greetings & introductions ═══
  { id: "a1-greet-01", level: "a1", topic: "greetings", type: "mcq", prompt: "It's 9 in the morning and you enter the Bäckerei. What do you say?", choices: ["Guten Morgen!", "Gute Nacht!", "Guten Abend!", "Mahlzeit!"], answerIndex: 0 },
  { id: "a1-greet-02", level: "a1", topic: "greetings", type: "mcq", prompt: "\"Wie heißen Sie?\" — the polite answer is:", choices: ["Ich heiße Tanzeel.", "Du heißt Tanzeel.", "Er heißt Tanzeel.", "Heiße Tanzeel ich."], answerIndex: 0 },
  { id: "a1-greet-03", level: "a1", topic: "greetings", type: "fill_blank", prompt: "Woher kommst du? — Ich komme ___ Pakistan.", accepted: ["aus"] },
  { id: "a1-greet-04", level: "a1", topic: "greetings", type: "true_false", prompt: "\"Tschüss\" is a formal way to say goodbye in a business letter.", answer: false },
  { id: "a1-greet-05", level: "a1", topic: "greetings", type: "fill_blank", prompt: "Wie ___ es Ihnen? — Danke, gut!", accepted: ["geht"] },
  { id: "a1-greet-06", level: "a1", topic: "greetings", type: "mcq", prompt: "You are introduced to your new Chef. Which greeting fits?", choices: ["Freut mich, Sie kennenzulernen.", "Na, alles klar?", "Hi, wie geht's dir?", "Servus, Alter!"], answerIndex: 0 },

  // ═══ A1 · numbers, time & dates ═══
  { id: "a1-zahlen-01", level: "a1", topic: "numbers-time", type: "mcq", prompt: "Wie viel kostet das? — 67 € is:", choices: ["siebenundsechzig Euro", "sechsundsiebzig Euro", "sechzigsieben Euro", "siebzigsechs Euro"], answerIndex: 0 },
  { id: "a1-zahlen-02", level: "a1", topic: "numbers-time", type: "mcq", prompt: "Es ist 7:30 Uhr. Umgangssprachlich sagt man:", choices: ["halb acht", "halb sieben", "sieben halb", "acht halb"], answerIndex: 0 },
  { id: "a1-zahlen-03", level: "a1", topic: "numbers-time", type: "fill_blank", prompt: "Der Termin ist ___ Montag um 14 Uhr.", accepted: ["am"] },
  { id: "a1-zahlen-04", level: "a1", topic: "numbers-time", type: "fill_blank", prompt: "Ich habe ___ 15. Mai Geburtstag. (contraction of an + dem)", accepted: ["am"] },
  { id: "a1-zahlen-05", level: "a1", topic: "numbers-time", type: "true_false", prompt: "\"Viertel vor neun\" means 8:45.", answer: true },
  { id: "a1-zahlen-06", level: "a1", topic: "numbers-time", type: "mcq", prompt: "Which is the correct order? (days of the week)", choices: ["Montag, Dienstag, Mittwoch", "Montag, Mittwoch, Dienstag", "Dienstag, Montag, Mittwoch", "Mittwoch, Montag, Dienstag"], answerIndex: 0 },

  // ═══ A1 · ordering food ═══
  { id: "a1-essen-01", level: "a1", topic: "food-ordering", type: "mcq", prompt: "Im Restaurant. You want to order politely:", choices: ["Ich hätte gern ein Wasser, bitte.", "Gib mir Wasser!", "Wasser. Jetzt.", "Ich bin ein Wasser."], answerIndex: 0 },
  { id: "a1-essen-02", level: "a1", topic: "food-ordering", type: "fill_blank", prompt: "Die Rechnung, bitte! Ich möchte ___ . (pay)", accepted: ["zahlen", "bezahlen"] },
  { id: "a1-essen-03", level: "a1", topic: "food-ordering", type: "mcq", prompt: "The waiter asks: \"Zusammen oder getrennt?\" — they want to know:", choices: ["if you pay together or separately", "if you want dessert", "if the food was good", "if you want to sit outside"], answerIndex: 0 },
  { id: "a1-essen-04", level: "a1", topic: "food-ordering", type: "true_false", prompt: "\"Guten Appetit\" is said before eating.", answer: true },
  { id: "a1-essen-05", level: "a1", topic: "food-ordering", type: "fill_blank", prompt: "Was möchten Sie trinken? — Einen Kaffee, ___ .", accepted: ["bitte"] },
  { id: "a1-essen-06", level: "a1", topic: "food-ordering", type: "mcq", prompt: "\"Das schmeckt mir\" means:", choices: ["It tastes good to me", "It's too expensive", "I'm full", "I'm allergic"], answerIndex: 0 },
  { id: "a1-essen-07", level: "a1", topic: "food-ordering", type: "true_false", prompt: "In Germany, tap water is always brought to your table for free like in the US.", answer: false },

  // ═══ A1 · shopping ═══
  { id: "a1-eink-01", level: "a1", topic: "shopping", type: "fill_blank", prompt: "Entschuldigung, wie viel ___ das? (cost)", accepted: ["kostet"] },
  { id: "a1-eink-02", level: "a1", topic: "shopping", type: "mcq", prompt: "You need bread. Where do you go?", choices: ["zur Bäckerei", "zur Apotheke", "zur Bank", "zum Friseur"], answerIndex: 0 },
  { id: "a1-eink-03", level: "a1", topic: "shopping", type: "mcq", prompt: "\"Haben Sie das eine Nummer größer?\" — you are shopping for:", choices: ["clothes or shoes", "vegetables", "medicine", "train tickets"], answerIndex: 0 },
  { id: "a1-eink-04", level: "a1", topic: "shopping", type: "true_false", prompt: "Most German supermarkets are open on Sundays.", answer: false },
  { id: "a1-eink-05", level: "a1", topic: "shopping", type: "fill_blank", prompt: "An der Kasse: \"Möchten Sie eine ___ ?\" (bag)", accepted: ["tuete", "tüte", "tasche"] },

  // ═══ A1 · family & personal info ═══
  { id: "a1-fam-01", level: "a1", topic: "family", type: "mcq", prompt: "Die Schwester meiner Mutter ist meine:", choices: ["Tante", "Nichte", "Cousine", "Oma"], answerIndex: 0 },
  { id: "a1-fam-02", level: "a1", topic: "family", type: "fill_blank", prompt: "Ich bin nicht verheiratet, ich bin ___ . (single)", accepted: ["ledig", "single"] },
  { id: "a1-fam-03", level: "a1", topic: "family", type: "true_false", prompt: "\"Geschwister\" means siblings — brothers and sisters together.", answer: true },
  { id: "a1-fam-04", level: "a1", topic: "family", type: "mcq", prompt: "\"Meine Eltern\" are:", choices: ["my parents", "my grandparents", "my children", "my cousins"], answerIndex: 0 },

  // ═══ A1 · daily routine ═══
  { id: "a1-tag-01", level: "a1", topic: "daily-routine", type: "fill_blank", prompt: "Ich ___ um 6 Uhr auf. (aufstehen)", accepted: ["stehe"] },
  { id: "a1-tag-02", level: "a1", topic: "daily-routine", type: "mcq", prompt: "Was macht man zuerst am Morgen?", choices: ["frühstücken", "zu Abend essen", "schlafen gehen", "Feierabend machen"], answerIndex: 0 },
  { id: "a1-tag-03", level: "a1", topic: "daily-routine", type: "true_false", prompt: "\"Feierabend\" is the time after work ends.", answer: true },
  { id: "a1-tag-04", level: "a1", topic: "daily-routine", type: "fill_blank", prompt: "Am Wochenende ___ ich lange. (schlafen, ich-Form)", accepted: ["schlafe"] },
  { id: "a1-tag-05", level: "a1", topic: "daily-routine", type: "mcq", prompt: "\"Ich dusche mich und ziehe mich an.\" — the person is:", choices: ["getting ready", "cooking dinner", "going shopping", "doing homework"], answerIndex: 0 },

  // ═══ A1 · directions & city ═══
  { id: "a1-weg-01", level: "a1", topic: "directions", type: "mcq", prompt: "\"Gehen Sie geradeaus und dann links.\" means:", choices: ["straight ahead, then left", "straight ahead, then right", "back, then left", "left, then straight"], answerIndex: 0 },
  { id: "a1-weg-02", level: "a1", topic: "directions", type: "fill_blank", prompt: "Entschuldigung, wo ist ___ Bahnhof? (masculine article)", accepted: ["der"] },
  { id: "a1-weg-03", level: "a1", topic: "directions", type: "true_false", prompt: "\"Die Haltestelle\" is where you catch a bus or tram.", answer: true },
  { id: "a1-weg-04", level: "a1", topic: "directions", type: "mcq", prompt: "\"Ist es weit?\" — \"Nein, nur fünf Minuten ___ Fuß.\"", choices: ["zu", "mit", "am", "auf"], answerIndex: 0 },

  // ═══ A1 · weather ═══
  { id: "a1-wetter-01", level: "a1", topic: "weather", type: "fill_blank", prompt: "Nimm einen Regenschirm mit, es ___ . (rain, 3rd person)", accepted: ["regnet"] },
  { id: "a1-wetter-02", level: "a1", topic: "weather", type: "mcq", prompt: "Im Winter in Deutschland:", choices: ["schneit es oft", "ist es immer heiß", "regnet es nie", "scheint immer die Sonne"], answerIndex: 0 },
  { id: "a1-wetter-03", level: "a1", topic: "weather", type: "true_false", prompt: "\"Es ist bewölkt\" means the sky is cloudy.", answer: true },

  // ═══ A1 · articles & gender ═══
  { id: "a1-artikel-01", level: "a1", topic: "articles-gender", type: "mcq", prompt: "Which article? ___ Mädchen (girl)", choices: ["das", "der", "die", "den"], answerIndex: 0 },
  { id: "a1-artikel-02", level: "a1", topic: "articles-gender", type: "mcq", prompt: "Nouns ending in -ung (die Wohnung, die Zeitung) are usually:", choices: ["feminine", "masculine", "neuter", "plural only"], answerIndex: 0 },
  { id: "a1-artikel-03", level: "a1", topic: "articles-gender", type: "fill_blank", prompt: "___ Zug fährt um 8 Uhr ab. (article for der Zug)", accepted: ["der"] },
  { id: "a1-artikel-04", level: "a1", topic: "articles-gender", type: "true_false", prompt: "In German, every noun is written with a capital letter.", answer: true },
  { id: "a1-artikel-05", level: "a1", topic: "articles-gender", type: "mcq", prompt: "The plural of \"das Kind\" is:", choices: ["die Kinder", "die Kinds", "das Kinder", "die Kinden"], answerIndex: 0 },
  { id: "a1-artikel-06", level: "a1", topic: "articles-gender", type: "fill_blank", prompt: "Ich habe ___ Frage. (indefinite article, die Frage)", accepted: ["eine"] },
  { id: "a1-artikel-07", level: "a1", topic: "articles-gender", type: "mcq", prompt: "Which set is all feminine?", choices: ["die Frau, die Lampe, die Straße", "der Mann, die Frau, das Kind", "das Auto, das Haus, die Tür", "der Tisch, der Stuhl, die Bank"], answerIndex: 0 },
  { id: "a1-artikel-08", level: "a1", topic: "articles-gender", type: "true_false", prompt: "\"Die\" is also the article for all plural nouns in the nominative.", answer: true },

  // ═══ A1 · accusative ═══
  { id: "a1-akk-01", level: "a1", topic: "akkusativ", type: "fill_blank", prompt: "Ich sehe ___ Mann. (der Mann → accusative)", accepted: ["den"] },
  { id: "a1-akk-02", level: "a1", topic: "akkusativ", type: "mcq", prompt: "Which article changes in the accusative?", choices: ["only masculine (der → den)", "only feminine (die → der)", "all of them", "none of them"], answerIndex: 0 },
  { id: "a1-akk-03", level: "a1", topic: "akkusativ", type: "fill_blank", prompt: "Hast du ___ Bruder? (indefinite, der Bruder)", accepted: ["einen"] },
  { id: "a1-akk-04", level: "a1", topic: "akkusativ", type: "true_false", prompt: "In \"Ich trinke einen Kaffee\", \"einen Kaffee\" is the direct object.", answer: true },
  { id: "a1-akk-05", level: "a1", topic: "akkusativ", type: "mcq", prompt: "Ich kaufe ___ Apfel und ___ Banane.", choices: ["einen / eine", "ein / einen", "eine / ein", "einen / einen"], answerIndex: 0 },
  { id: "a1-akk-06", level: "a1", topic: "akkusativ", type: "fill_blank", prompt: "Wir besuchen ___ Freund in Berlin. (indefinite, der Freund)", accepted: ["einen"] },

  // ═══ A1 · modal verbs ═══
  { id: "a1-modal-01", level: "a1", topic: "modal-verbs", type: "fill_blank", prompt: "Ich ___ gut Deutsch sprechen. (können, ich-Form)", accepted: ["kann"] },
  { id: "a1-modal-02", level: "a1", topic: "modal-verbs", type: "mcq", prompt: "Where does the second verb go with a modal? \"Ich muss heute ...\"", choices: ["at the end: Ich muss heute arbeiten.", "right after the modal: Ich muss arbeiten heute.", "at the start: Arbeiten ich muss heute.", "anywhere"], answerIndex: 0 },
  { id: "a1-modal-03", level: "a1", topic: "modal-verbs", type: "fill_blank", prompt: "___ ich hier rauchen? (dürfen — asking permission)", accepted: ["darf"] },
  { id: "a1-modal-04", level: "a1", topic: "modal-verbs", type: "mcq", prompt: "\"Ich möchte einen Termin machen\" — möchte expresses:", choices: ["a polite wish", "an obligation", "a prohibition", "an ability"], answerIndex: 0 },
  { id: "a1-modal-05", level: "a1", topic: "modal-verbs", type: "true_false", prompt: "\"Du kannst\" and \"du musst\" mean the same thing.", answer: false },
  { id: "a1-modal-06", level: "a1", topic: "modal-verbs", type: "fill_blank", prompt: "Er ___ heute nicht arbeiten, er ist krank. (können, er-Form)", accepted: ["kann"] },

  // ═══ A1 · separable verbs ═══
  { id: "a1-trenn-01", level: "a1", topic: "separable-verbs", type: "fill_blank", prompt: "Der Zug fährt um 8 Uhr ___ . (abfahren)", accepted: ["ab"] },
  { id: "a1-trenn-02", level: "a1", topic: "separable-verbs", type: "mcq", prompt: "\"einkaufen\" in a sentence:", choices: ["Ich kaufe im Supermarkt ein.", "Ich einkaufe im Supermarkt.", "Ich kaufe ein im Supermarkt gehen.", "Ein ich kaufe im Supermarkt."], answerIndex: 0 },
  { id: "a1-trenn-03", level: "a1", topic: "separable-verbs", type: "fill_blank", prompt: "Ich rufe dich morgen ___ . (anrufen)", accepted: ["an"] },
  { id: "a1-trenn-04", level: "a1", topic: "separable-verbs", type: "true_false", prompt: "With separable verbs, the prefix moves to the end of the main clause.", answer: true },

  // ═══ A1 · questions ═══
  { id: "a1-frage-01", level: "a1", topic: "questions", type: "mcq", prompt: "___ wohnst du? — In Köln.", choices: ["Wo", "Wer", "Was", "Wann"], answerIndex: 0 },
  { id: "a1-frage-02", level: "a1", topic: "questions", type: "mcq", prompt: "A yes/no question starts with:", choices: ["the verb: Kommst du mit?", "the subject: Du kommst mit?", "a W-word: Wo kommst du mit?", "nicht: Nicht kommst du mit?"], answerIndex: 0 },
  { id: "a1-frage-03", level: "a1", topic: "questions", type: "fill_blank", prompt: "___ kommt der Bus? — Um 10 Uhr.", accepted: ["wann"] },
  { id: "a1-frage-04", level: "a1", topic: "questions", type: "fill_blank", prompt: "___ ist das? — Das ist meine Lehrerin.", accepted: ["wer"] },

  // ═══ A1 · negation ═══
  { id: "a1-neg-01", level: "a1", topic: "negation", type: "mcq", prompt: "How do you negate \"Ich habe ein Auto\"?", choices: ["Ich habe kein Auto.", "Ich habe nicht ein Auto.", "Ich nicht habe ein Auto.", "Ich habe ein Auto nein."], answerIndex: 0 },
  { id: "a1-neg-02", level: "a1", topic: "negation", type: "fill_blank", prompt: "Ich komme heute ___ . (negation of the verb)", accepted: ["nicht"] },

  // ═══ A2 · dative ═══
  { id: "a2-dativ-01", level: "a2", topic: "dativ", type: "fill_blank", prompt: "Ich helfe ___ Mann. (der Mann → dative)", accepted: ["dem"] },
  { id: "a2-dativ-02", level: "a2", topic: "dativ", type: "mcq", prompt: "Which verbs always take the dative?", choices: ["helfen, danken, gefallen", "sehen, kaufen, trinken", "haben, brauchen, essen", "machen, finden, suchen"], answerIndex: 0 },
  { id: "a2-dativ-03", level: "a2", topic: "dativ", type: "fill_blank", prompt: "Das Buch gefällt ___ . (ich → dative pronoun)", accepted: ["mir"] },
  { id: "a2-dativ-04", level: "a2", topic: "dativ", type: "mcq", prompt: "Ich fahre mit ___ Bus. (mit + Dativ, der Bus)", choices: ["dem", "den", "der", "das"], answerIndex: 0 },
  { id: "a2-dativ-05", level: "a2", topic: "dativ", type: "true_false", prompt: "The prepositions aus, bei, mit, nach, seit, von, zu always take the dative.", answer: true },
  { id: "a2-dativ-06", level: "a2", topic: "dativ", type: "fill_blank", prompt: "Wir schenken ___ Kind ein Buch. (das Kind → dative)", accepted: ["dem"] },

  // ═══ A2 · two-way prepositions ═══
  { id: "a2-wechsel-01", level: "a2", topic: "wechselpraepositionen", type: "mcq", prompt: "Wo ist die Katze? — Sie sitzt ___ dem Tisch.", choices: ["auf", "aufs", "auf den", "an den"], answerIndex: 0 },
  { id: "a2-wechsel-02", level: "a2", topic: "wechselpraepositionen", type: "mcq", prompt: "Wohin gehst du? — Ich gehe ___ Kino.", choices: ["ins", "im", "in dem", "beim"], answerIndex: 0 },
  { id: "a2-wechsel-03", level: "a2", topic: "wechselpraepositionen", type: "true_false", prompt: "Two-way prepositions take the accusative for movement (wohin?) and the dative for location (wo?).", answer: true },
  { id: "a2-wechsel-04", level: "a2", topic: "wechselpraepositionen", type: "fill_blank", prompt: "Ich hänge das Bild ___ die Wand. (movement → accusative)", accepted: ["an"] },
  { id: "a2-wechsel-05", level: "a2", topic: "wechselpraepositionen", type: "fill_blank", prompt: "Die Jacke hängt ___ Schrank. (location, in + dem, contraction)", accepted: ["im"] },

  // ═══ A2 · Perfekt ═══
  { id: "a2-perfekt-01", level: "a2", topic: "perfekt", type: "fill_blank", prompt: "Ich ___ gestern nach Berlin gefahren. (haben or sein?)", accepted: ["bin"] },
  { id: "a2-perfekt-02", level: "a2", topic: "perfekt", type: "mcq", prompt: "The participle of \"essen\" is:", choices: ["gegessen", "geesst", "esst", "geessen"], answerIndex: 0 },
  { id: "a2-perfekt-03", level: "a2", topic: "perfekt", type: "mcq", prompt: "Which verbs form the Perfekt with \"sein\"?", choices: ["movement/change verbs: fahren, gehen, aufstehen", "all reflexive verbs", "all verbs ending in -ieren", "verbs with objects"], answerIndex: 0 },
  { id: "a2-perfekt-04", level: "a2", topic: "perfekt", type: "fill_blank", prompt: "Hast du die Hausaufgaben ___ ? (machen → participle)", accepted: ["gemacht"] },
  { id: "a2-perfekt-05", level: "a2", topic: "perfekt", type: "true_false", prompt: "Verbs ending in -ieren (studieren, telefonieren) form their participle without ge-.", answer: true },
  { id: "a2-perfekt-06", level: "a2", topic: "perfekt", type: "fill_blank", prompt: "Der Zug ist schon ___ . (abfahren → participle)", accepted: ["abgefahren"] },

  // ═══ A2 · Präteritum of sein/haben/modals ═══
  { id: "a2-praet-01", level: "a2", topic: "praeteritum-modals", type: "fill_blank", prompt: "Gestern ___ ich krank. (sein, Präteritum)", accepted: ["war"] },
  { id: "a2-praet-02", level: "a2", topic: "praeteritum-modals", type: "fill_blank", prompt: "Als Kind ___ ich keinen Kaffee trinken. (dürfen, Präteritum)", accepted: ["durfte"] },
  { id: "a2-praet-03", level: "a2", topic: "praeteritum-modals", type: "mcq", prompt: "\"Wir hatten keine Zeit\" is the Präteritum of:", choices: ["haben", "sein", "werden", "halten"], answerIndex: 0 },
  { id: "a2-praet-04", level: "a2", topic: "praeteritum-modals", type: "true_false", prompt: "For sein, haben and the modals, spoken German prefers the Präteritum over the Perfekt.", answer: true },

  // ═══ A2 · comparative ═══
  { id: "a2-komp-01", level: "a2", topic: "komparativ", type: "fill_blank", prompt: "Berlin ist ___ als Bonn. (groß → comparative)", accepted: ["groesser", "größer"] },
  { id: "a2-komp-02", level: "a2", topic: "komparativ", type: "mcq", prompt: "gern — lieber — ___", choices: ["am liebsten", "am gernsten", "liebst", "gerner"], answerIndex: 0 },
  { id: "a2-komp-03", level: "a2", topic: "komparativ", type: "mcq", prompt: "The comparative of \"gut\" is:", choices: ["besser", "guter", "mehr gut", "güter"], answerIndex: 0 },
  { id: "a2-komp-04", level: "a2", topic: "komparativ", type: "true_false", prompt: "\"So groß wie\" expresses equality; \"größer als\" expresses difference.", answer: true },
  { id: "a2-komp-05", level: "a2", topic: "komparativ", type: "fill_blank", prompt: "Deutsch ist schwer, aber Finnisch ist noch ___ . (schwer → comparative)", accepted: ["schwerer", "schwieriger"] },

  // ═══ A2 · subordinate clauses ═══
  { id: "a2-neben-01", level: "a2", topic: "nebensaetze", type: "mcq", prompt: "Ich lerne Deutsch, ___ ich in Deutschland arbeiten möchte.", choices: ["weil", "denn", "aber", "oder"], answerIndex: 0 },
  { id: "a2-neben-02", level: "a2", topic: "nebensaetze", type: "mcq", prompt: "In a weil-clause, the conjugated verb goes:", choices: ["to the end", "second position", "first position", "before weil"], answerIndex: 0 },
  { id: "a2-neben-03", level: "a2", topic: "nebensaetze", type: "fill_blank", prompt: "Ich weiß, ___ du müde bist. (that)", accepted: ["dass"] },
  { id: "a2-neben-04", level: "a2", topic: "nebensaetze", type: "fill_blank", prompt: "___ es regnet, bleiben wir zu Hause. (if/when)", accepted: ["wenn"] },
  { id: "a2-neben-05", level: "a2", topic: "nebensaetze", type: "true_false", prompt: "\"Weil\" and \"denn\" both give reasons, but only \"weil\" sends the verb to the end.", answer: true },
  { id: "a2-neben-06", level: "a2", topic: "nebensaetze", type: "mcq", prompt: "Which sentence is correct?", choices: ["Ich hoffe, dass du morgen kommst.", "Ich hoffe, dass du kommst morgen.", "Ich hoffe, dass kommst du morgen.", "Ich hoffe, du dass morgen kommst."], answerIndex: 0 },

  // ═══ A2 · reflexive verbs ═══
  { id: "a2-reflex-01", level: "a2", topic: "reflexiv", type: "fill_blank", prompt: "Ich freue ___ auf das Wochenende.", accepted: ["mich"] },
  { id: "a2-reflex-02", level: "a2", topic: "reflexiv", type: "mcq", prompt: "\"sich anmelden\" — Du musst ___ beim Bürgeramt anmelden.", choices: ["dich", "dir", "sich", "euch"], answerIndex: 0 },
  { id: "a2-reflex-03", level: "a2", topic: "reflexiv", type: "true_false", prompt: "In \"Ich wasche mir die Hände\", the reflexive pronoun is dative because there's another object.", answer: true },

  // ═══ A2 · health & doctor ═══
  { id: "a2-arzt-01", level: "a2", topic: "gesundheit", type: "mcq", prompt: "You have a fever and a cough. You say:", choices: ["Ich habe Fieber und Husten.", "Ich bin Fieber und Husten.", "Mir ist Fieber.", "Ich mache Fieber."], answerIndex: 0 },
  { id: "a2-arzt-02", level: "a2", topic: "gesundheit", type: "fill_blank", prompt: "Ich möchte einen ___ beim Arzt vereinbaren. (appointment)", accepted: ["termin"] },
  { id: "a2-arzt-03", level: "a2", topic: "gesundheit", type: "mcq", prompt: "\"Gute Besserung!\" is said when someone:", choices: ["is ill", "has a birthday", "passed an exam", "is leaving on a trip"], answerIndex: 0 },
  { id: "a2-arzt-04", level: "a2", topic: "gesundheit", type: "true_false", prompt: "A \"Krankmeldung\" (sick note) must be given to your employer when you're ill.", answer: true },

  // ═══ A2 · housing ═══
  { id: "a2-wohnen-01", level: "a2", topic: "wohnen", type: "mcq", prompt: "\"Kaltmiete\" is:", choices: ["rent without heating/utility costs", "rent including everything", "the deposit", "a winter discount"], answerIndex: 0 },
  { id: "a2-wohnen-02", level: "a2", topic: "wohnen", type: "fill_blank", prompt: "Vor dem Einzug zahlt man meistens eine ___ . (deposit)", accepted: ["kaution"] },
  { id: "a2-wohnen-03", level: "a2", topic: "wohnen", type: "mcq", prompt: "\"3-Zimmer-Wohnung\" in Germany means:", choices: ["3 rooms total (living + bedrooms), kitchen/bath extra", "3 bedrooms plus living room", "3 floors", "3 tenants allowed"], answerIndex: 0 },
  { id: "a2-wohnen-04", level: "a2", topic: "wohnen", type: "true_false", prompt: "\"Nebenkosten\" are additional costs like water, heating, and garbage collection.", answer: true },

  // ═══ A2 · offices & bureaucracy ═══
  { id: "a2-amt-01", level: "a2", topic: "amt", type: "mcq", prompt: "Within 14 days of moving in Germany you must do the:", choices: ["Anmeldung at the Bürgeramt", "Abmeldung at the airport", "Ummeldung at the bank", "Anmeldung at the Finanzamt"], answerIndex: 0 },
  { id: "a2-amt-02", level: "a2", topic: "amt", type: "fill_blank", prompt: "Bitte füllen Sie das ___ aus. (form)", accepted: ["formular"] },
  { id: "a2-amt-03", level: "a2", topic: "amt", type: "mcq", prompt: "\"Welche Unterlagen brauche ich?\" asks about:", choices: ["required documents", "opening hours", "the address", "the fees"], answerIndex: 0 },
  { id: "a2-amt-04", level: "a2", topic: "amt", type: "true_false", prompt: "\"Termin\" appointments at German offices can usually be walked into without booking.", answer: false },

  // ═══ A2 · work ═══
  { id: "a2-arbeit-01", level: "a2", topic: "arbeit", type: "fill_blank", prompt: "Ich arbeite von 9 bis 17 Uhr. Das ist ___ . (full-time)", accepted: ["vollzeit"] },
  { id: "a2-arbeit-02", level: "a2", topic: "arbeit", type: "mcq", prompt: "\"der Feierabend\", \"die Überstunde\", \"der Urlaub\" — all relate to:", choices: ["working life", "school", "shopping", "cooking"], answerIndex: 0 },
  { id: "a2-arbeit-03", level: "a2", topic: "arbeit", type: "true_false", prompt: "\"Ich bin selbstständig\" means \"I am self-employed\".", answer: true },

  // ═══ B1 · Präteritum ═══
  { id: "b1-praet-01", level: "b1", topic: "praeteritum", type: "fill_blank", prompt: "Er ___ nach Hause und machte das Licht an. (gehen, Präteritum)", accepted: ["ging"] },
  { id: "b1-praet-02", level: "b1", topic: "praeteritum", type: "mcq", prompt: "The Präteritum of \"wissen\" (er-Form) is:", choices: ["wusste", "wisste", "weißte", "gewusst"], answerIndex: 0 },
  { id: "b1-praet-03", level: "b1", topic: "praeteritum", type: "true_false", prompt: "The Präteritum is preferred in written narration (news, novels); Perfekt dominates in speech.", answer: true },
  { id: "b1-praet-04", level: "b1", topic: "praeteritum", type: "fill_blank", prompt: "Es ___ einmal eine Prinzessin. (geben, Präteritum — fairy-tale opening)", accepted: ["gab"] },

  // ═══ B1 · Plusquamperfekt ═══
  { id: "b1-plusq-01", level: "b1", topic: "plusquamperfekt", type: "fill_blank", prompt: "Nachdem ich gegessen ___ , ging ich schlafen. (haben, Präteritum)", accepted: ["hatte"] },
  { id: "b1-plusq-02", level: "b1", topic: "plusquamperfekt", type: "mcq", prompt: "The Plusquamperfekt describes:", choices: ["an action before another past action", "a future action", "a present habit", "a polite request"], answerIndex: 0 },
  { id: "b1-plusq-03", level: "b1", topic: "plusquamperfekt", type: "true_false", prompt: "\"Nachdem\" clauses typically use Plusquamperfekt + Präteritum in the main clause.", answer: true },

  // ═══ B1 · passive ═══
  { id: "b1-passiv-01", level: "b1", topic: "passiv", type: "fill_blank", prompt: "Das Haus ___ 1950 gebaut. (werden, Präteritum)", accepted: ["wurde"] },
  { id: "b1-passiv-02", level: "b1", topic: "passiv", type: "mcq", prompt: "Active: \"Man spricht hier Deutsch.\" → Passive:", choices: ["Hier wird Deutsch gesprochen.", "Hier ist Deutsch gesprochen.", "Hier hat Deutsch gesprochen.", "Deutsch spricht hier."], answerIndex: 0 },
  { id: "b1-passiv-03", level: "b1", topic: "passiv", type: "fill_blank", prompt: "Der Antrag muss bis Freitag eingereicht ___ . (passive with modal)", accepted: ["werden"] },
  { id: "b1-passiv-04", level: "b1", topic: "passiv", type: "true_false", prompt: "In the passive, the agent (doer) is introduced with \"von\".", answer: true },
  { id: "b1-passiv-05", level: "b1", topic: "passiv", type: "mcq", prompt: "\"Die Formulare werden gerade bearbeitet\" means:", choices: ["The forms are being processed right now", "The forms were lost", "The forms must be printed", "The forms have been rejected"], answerIndex: 0 },

  // ═══ B1 · Konjunktiv II ═══
  { id: "b1-konj-01", level: "b1", topic: "konjunktiv-ii", type: "fill_blank", prompt: "Wenn ich mehr Zeit ___ , würde ich mehr Deutsch lernen. (haben, Konjunktiv II)", accepted: ["haette", "hätte"] },
  { id: "b1-konj-02", level: "b1", topic: "konjunktiv-ii", type: "mcq", prompt: "\"An deiner Stelle ___ ich zum Arzt gehen.\"", choices: ["würde", "werde", "wurde", "will"], answerIndex: 0 },
  { id: "b1-konj-03", level: "b1", topic: "konjunktiv-ii", type: "fill_blank", prompt: "Ich ___ gern reich. (sein, Konjunktiv II — wish)", accepted: ["waere", "wäre"] },
  { id: "b1-konj-04", level: "b1", topic: "konjunktiv-ii", type: "true_false", prompt: "\"Könnten Sie mir bitte helfen?\" is more polite than \"Können Sie mir helfen?\"", answer: true },
  { id: "b1-konj-05", level: "b1", topic: "konjunktiv-ii", type: "mcq", prompt: "An unreal condition about the past: \"Wenn ich das gewusst hätte, ...\"", choices: ["wäre ich nicht gekommen.", "bin ich nicht gekommen.", "komme ich nicht.", "war ich nicht gekommen."], answerIndex: 0 },

  // ═══ B1 · relative clauses ═══
  { id: "b1-relativ-01", level: "b1", topic: "relativsaetze", type: "mcq", prompt: "Der Mann, ___ dort steht, ist mein Chef.", choices: ["der", "den", "dem", "dessen"], answerIndex: 0 },
  { id: "b1-relativ-02", level: "b1", topic: "relativsaetze", type: "mcq", prompt: "Das ist die Frau, ___ Auto ich gekauft habe.", choices: ["deren", "dessen", "die", "der"], answerIndex: 0 },
  { id: "b1-relativ-03", level: "b1", topic: "relativsaetze", type: "fill_blank", prompt: "Das Buch, ___ ich gestern gelesen habe, war spannend. (das Buch → accusative)", accepted: ["das"] },
  { id: "b1-relativ-04", level: "b1", topic: "relativsaetze", type: "true_false", prompt: "A relative pronoun's gender/number comes from the noun it refers to; its case comes from its role in the relative clause.", answer: true },
  { id: "b1-relativ-05", level: "b1", topic: "relativsaetze", type: "mcq", prompt: "Die Kollegin, mit ___ ich arbeite, kommt aus Spanien.", choices: ["der", "die", "dem", "den"], answerIndex: 0 },

  // ═══ B1 · connectors ═══
  { id: "b1-konnekt-01", level: "b1", topic: "konnektoren", type: "mcq", prompt: "___ er krank war, ging er zur Arbeit. (although)", choices: ["Obwohl", "Weil", "Damit", "Deshalb"], answerIndex: 0 },
  { id: "b1-konnekt-02", level: "b1", topic: "konnektoren", type: "fill_blank", prompt: "Ich lerne Deutsch, ___ ich eine Ausbildung in Deutschland machen kann. (so that)", accepted: ["damit", "sodass"] },
  { id: "b1-konnekt-03", level: "b1", topic: "konnektoren", type: "mcq", prompt: "\"Er war müde, trotzdem ...\" — the correct continuation:", choices: ["arbeitete er weiter.", "er arbeitete weiter.", "weiterarbeitete er.", "er weiter arbeitete."], answerIndex: 0 },
  { id: "b1-konnekt-04", level: "b1", topic: "konnektoren", type: "fill_blank", prompt: "Ich spare Geld, ___ einen Sprachkurs zu bezahlen. (um ... zu)", accepted: ["um"] },
  { id: "b1-konnekt-05", level: "b1", topic: "konnektoren", type: "true_false", prompt: "\"Um ... zu\" can only be used when both clauses share the same subject; otherwise use \"damit\".", answer: true },

  // ═══ B1 · bureaucracy ═══
  { id: "b1-buro-01", level: "b1", topic: "buerokratie", type: "mcq", prompt: "\"Der Bescheid\" from a German authority is:", choices: ["an official written decision", "a complaint", "an invoice", "an apology"], answerIndex: 0 },
  { id: "b1-buro-02", level: "b1", topic: "buerokratie", type: "fill_blank", prompt: "Für das Visum brauche ich eine ___ über 11.904 €. (blocked account — one German compound word)", accepted: ["sperrkonto", "sperrkontobestaetigung", "sperrkontobestätigung"] },
  { id: "b1-buro-03", level: "b1", topic: "buerokratie", type: "mcq", prompt: "\"Die Frist läuft am 31. März ab\" means:", choices: ["the deadline expires on March 31", "the office opens on March 31", "the fee is due March 31", "the contract starts March 31"], answerIndex: 0 },
  { id: "b1-buro-04", level: "b1", topic: "buerokratie", type: "true_false", prompt: "\"Der Aufenthaltstitel\" is the German residence permit.", answer: true },
  { id: "b1-buro-05", level: "b1", topic: "buerokratie", type: "fill_blank", prompt: "Ich möchte Widerspruch gegen den Bescheid ___ . (einlegen — set phrase)", accepted: ["einlegen"] },

  // ═══ B1 · work & Ausbildung ═══
  { id: "b1-ausb-01", level: "b1", topic: "arbeit-ausbildung", type: "mcq", prompt: "The \"duale Ausbildung\" combines:", choices: ["work in a company and Berufsschule", "two different jobs", "study and travel", "two universities"], answerIndex: 0 },
  { id: "b1-ausb-02", level: "b1", topic: "arbeit-ausbildung", type: "fill_blank", prompt: "Nach der Ausbildung macht man die ___ vor der IHK. (final exam)", accepted: ["abschlusspruefung", "abschlussprüfung", "pruefung", "prüfung"] },
  { id: "b1-ausb-03", level: "b1", topic: "arbeit-ausbildung", type: "mcq", prompt: "\"die Ausbildungsvergütung\" is:", choices: ["the trainee salary", "the training contract", "the final certificate", "the application fee"], answerIndex: 0 },
  { id: "b1-ausb-04", level: "b1", topic: "arbeit-ausbildung", type: "true_false", prompt: "An Azubi (Auszubildender) has a right to paid vacation days.", answer: true },

  // ═══ B1 · opinions & discussion ═══
  { id: "b1-meinung-01", level: "b1", topic: "meinung", type: "mcq", prompt: "A balanced argument often starts:", choices: ["Einerseits ..., andererseits ...", "Niemals ..., immer ...", "Erstens ..., niemand ...", "Entweder ..., trotzdem ..."], answerIndex: 0 },
  { id: "b1-meinung-02", level: "b1", topic: "meinung", type: "fill_blank", prompt: "Ich bin der ___ , dass Deutschlernen wichtig ist. (opinion — set phrase)", accepted: ["meinung", "ansicht", "auffassung"] },
  { id: "b1-meinung-03", level: "b1", topic: "meinung", type: "mcq", prompt: "To politely disagree you say:", choices: ["Da bin ich anderer Meinung.", "Das ist dumm.", "Nein. Ende.", "Du liegst immer falsch."], answerIndex: 0 },
  { id: "b1-meinung-04", level: "b1", topic: "meinung", type: "true_false", prompt: "\"Meiner Meinung nach kommt das Verb an Position zwei\" — and indeed it does in that sentence.", answer: true },
];

import type { CefrLevel, SyllabusCategory } from "@prisma/client";

export interface DefaultSyllabusItem {
  level: CefrLevel;
  category: SyllabusCategory;
  /** topic heading the subtopic is grouped under */
  theme: string;
  /** the subtopic itself — one concrete, checkable thing to master */
  title: string;
  description?: string;
}

/**
 * Bump when DEFAULT_SYLLABUS_ITEMS changes shape or content. Users on an
 * older version get reseeded on their next syllabus load; completions are
 * preserved by (level, normalized title) match.
 *
 * v3: added the "Alphabet & pronunciation" item below — the roadmap's Week 1
 * grammar slot referenced this topic before the syllabus/roadmap merge but
 * had no syllabus counterpart to link to. Any bump here must ship with a
 * paired ROADMAP_VERSION bump in roadmap-defaults.ts, since grammar/vocab
 * roadmap content is now generated FROM this list, not hand-authored.
 */
export const SYLLABUS_VERSION = 3;

/**
 * The 2027 syllabus: full CEFR A1–B1 topic/subtopic map aligned with the
 * Goethe-Institut curricula. Grouped by theme within each level+category;
 * array order is pedagogical order — array index becomes sortOrder and "next
 * up" is the first incomplete item.
 */
export const DEFAULT_SYLLABUS_ITEMS: DefaultSyllabusItem[] = [
  // ════════════════════ A1 ════════════════════
  // ── grammar ──
  { level: "a1", category: "grammar", theme: "Alphabet & pronunciation", title: "The German alphabet & sound system", description: "Letters, umlauts, ß, and how German spelling maps to sound." },
  { level: "a1", category: "grammar", theme: "Verbs: present tense", title: "sein & haben", description: "The two anchor verbs, all persons." },
  { level: "a1", category: "grammar", theme: "Verbs: present tense", title: "Regular conjugation", description: "Stem + endings: wohnen, lernen, machen, kommen." },
  { level: "a1", category: "grammar", theme: "Verbs: present tense", title: "Stem-changing verbs", description: "e→i/ie (sprechen, lesen), a→ä (fahren, schlafen)." },
  { level: "a1", category: "grammar", theme: "Verbs: present tense", title: "wissen & möchten", description: "Irregular presents you meet constantly." },
  { level: "a1", category: "grammar", theme: "Nouns & articles", title: "Gender: der / die / das", description: "Learning every noun with its article; common gender clues (-ung, -chen…)." },
  { level: "a1", category: "grammar", theme: "Nouns & articles", title: "Indefinite articles: ein / eine", description: "And when German uses no article at all." },
  { level: "a1", category: "grammar", theme: "Nouns & articles", title: "Plural forms", description: "-e, -en, -er, -s, umlaut patterns." },
  { level: "a1", category: "grammar", theme: "Nouns & articles", title: "Negation with kein / keine", description: "kein for nouns vs. nicht for everything else." },
  { level: "a1", category: "grammar", theme: "Cases: nominative & accusative", title: "Nominative: the subject case", description: "Wer oder was macht etwas?" },
  { level: "a1", category: "grammar", theme: "Cases: nominative & accusative", title: "Accusative articles: den / einen", description: "Only masculine changes." },
  { level: "a1", category: "grammar", theme: "Cases: nominative & accusative", title: "Accusative pronouns", description: "mich, dich, ihn, sie, es, uns, euch." },
  { level: "a1", category: "grammar", theme: "Pronouns & possessives", title: "Personal pronouns", description: "ich/du/er/sie/es/wir/ihr/sie/Sie; du vs. Sie." },
  { level: "a1", category: "grammar", theme: "Pronouns & possessives", title: "Possessive articles", description: "mein, dein, sein, ihr, unser, euer + endings." },
  { level: "a1", category: "grammar", theme: "Sentence structure", title: "Verb in second position", description: "Statements, incl. time-first: Heute lerne ich Deutsch." },
  { level: "a1", category: "grammar", theme: "Sentence structure", title: "Yes/no questions", description: "Verb first: Kommst du mit?" },
  { level: "a1", category: "grammar", theme: "Sentence structure", title: "W-questions", description: "wer, was, wo, woher, wohin, wann, wie, warum." },
  { level: "a1", category: "grammar", theme: "Sentence structure", title: "Position of nicht", description: "Ich komme nicht. / Ich komme heute nicht mit." },
  { level: "a1", category: "grammar", theme: "Modal verbs", title: "können, müssen, möchten", description: "Meaning + conjugation." },
  { level: "a1", category: "grammar", theme: "Modal verbs", title: "dürfen, wollen, sollen", description: "Permission, intention, advice." },
  { level: "a1", category: "grammar", theme: "Modal verbs", title: "The sentence bracket", description: "Modal in position 2, infinitive at the end." },
  { level: "a1", category: "grammar", theme: "Separable verbs", title: "Common separable verbs", description: "aufstehen, einkaufen, anrufen, fernsehen, mitkommen." },
  { level: "a1", category: "grammar", theme: "Separable verbs", title: "Prefix to the end", description: "Ich stehe um 6 Uhr auf." },
  { level: "a1", category: "grammar", theme: "Imperative", title: "Sie-imperative", description: "Kommen Sie bitte mit!" },
  { level: "a1", category: "grammar", theme: "Imperative", title: "du- and ihr-imperative", description: "Komm! / Kommt! — incl. irregular forms (Nimm!, Lies!)." },
  { level: "a1", category: "grammar", theme: "Prepositions", title: "Time: am, um, im, von … bis", description: "am Montag, um 8 Uhr, im Mai." },
  { level: "a1", category: "grammar", theme: "Prepositions", title: "Place: in, aus, nach, bei, zu", description: "Wohnort, Herkunft, Ziel." },
  { level: "a1", category: "grammar", theme: "Prepositions", title: "mit & für", description: "mit dem Bus, für dich." },
  { level: "a1", category: "grammar", theme: "Past tense (intro)", title: "Perfekt with haben", description: "Ich habe gemacht / gekauft / gelernt." },
  { level: "a1", category: "grammar", theme: "Past tense (intro)", title: "Perfekt with sein", description: "Ich bin gefahren / gegangen / geblieben." },
  { level: "a1", category: "grammar", theme: "Past tense (intro)", title: "war & hatte", description: "The Präteritum you need at A1." },

  // ── vocab themes ──
  { level: "a1", category: "vocab_theme", theme: "Personal world", title: "Introducing yourself", description: "Name, Alter, Herkunft, Wohnort, Beruf, Sprachen." },
  { level: "a1", category: "vocab_theme", theme: "Personal world", title: "Family", description: "Eltern, Geschwister, Großeltern, Familienstand." },
  { level: "a1", category: "vocab_theme", theme: "Personal world", title: "Countries, nationalities & languages", description: "Ich komme aus …, ich spreche …" },
  { level: "a1", category: "vocab_theme", theme: "Numbers, time & dates", title: "Numbers 0–1000", description: "Prices, phone numbers, addresses." },
  { level: "a1", category: "vocab_theme", theme: "Numbers, time & dates", title: "Telling the time", description: "Official + colloquial (halb acht, Viertel vor…)." },
  { level: "a1", category: "vocab_theme", theme: "Numbers, time & dates", title: "Days, months & seasons", description: "Plus am/im for dates and Wann-questions." },
  { level: "a1", category: "vocab_theme", theme: "Everyday life", title: "Daily routine", description: "aufstehen, frühstücken, arbeiten, schlafen gehen." },
  { level: "a1", category: "vocab_theme", theme: "Everyday life", title: "Food & drink", description: "Lebensmittel, Mahlzeiten, im Café bestellen." },
  { level: "a1", category: "vocab_theme", theme: "Everyday life", title: "Shopping & prices", description: "Supermarkt, Mengen, bezahlen, Was kostet…?" },
  { level: "a1", category: "vocab_theme", theme: "Everyday life", title: "Clothing & colors", description: "Kleidung, Größen, Farben." },
  { level: "a1", category: "vocab_theme", theme: "Living", title: "Home & rooms", description: "Wohnung, Zimmer, Adresse." },
  { level: "a1", category: "vocab_theme", theme: "Living", title: "Furniture & household", description: "Möbel, Geräte, Alltagsgegenstände." },
  { level: "a1", category: "vocab_theme", theme: "Out & about", title: "Places in the city", description: "Bahnhof, Apotheke, Bank, Supermarkt, Post." },
  { level: "a1", category: "vocab_theme", theme: "Out & about", title: "Directions", description: "links, rechts, geradeaus, weit, zu Fuß." },
  { level: "a1", category: "vocab_theme", theme: "Out & about", title: "Transport & travel", description: "Zug, Bus, Ticket, Gleis, Fahrplan, Abfahrt." },
  { level: "a1", category: "vocab_theme", theme: "Out & about", title: "Weather & seasons", description: "Es regnet/schneit, sonnig, kalt, warm." },
  { level: "a1", category: "vocab_theme", theme: "Work & free time", title: "Professions", description: "Berufe + Was sind Sie von Beruf?" },
  { level: "a1", category: "vocab_theme", theme: "Work & free time", title: "Hobbies & free time", description: "Sport, Musik, lesen, reisen, Verabredungen." },
  { level: "a1", category: "vocab_theme", theme: "Health (basics)", title: "Body parts", description: "Kopf, Bauch, Rücken…" },
  { level: "a1", category: "vocab_theme", theme: "Health (basics)", title: "Saying what hurts", description: "Ich habe Kopfschmerzen / Fieber; beim Arzt." },

  // ── skills ──
  { level: "a1", category: "skill", theme: "Speaking", title: "Introduce yourself fluently", description: "60 seconds about yourself without notes." },
  { level: "a1", category: "skill", theme: "Speaking", title: "Order in a café or restaurant", description: "Bestellen, bitten, bezahlen." },
  { level: "a1", category: "skill", theme: "Speaking", title: "Handle a shopping dialogue", description: "Nach Preis, Größe, Ort fragen." },
  { level: "a1", category: "skill", theme: "Speaking", title: "Make and change appointments", description: "Termine vereinbaren, Uhrzeiten verstehen." },
  { level: "a1", category: "skill", theme: "Writing", title: "Fill in official forms", description: "Anmeldeformulare: Name, Adresse, Geburtsdatum." },
  { level: "a1", category: "skill", theme: "Writing", title: "Short messages & postcards", description: "Anrede, 2–3 Sätze, Gruß." },
  { level: "a1", category: "skill", theme: "Listening & reading", title: "Announcements & signs", description: "Bahnhofsdurchsagen, Schilder, Aushänge." },
  { level: "a1", category: "skill", theme: "Listening & reading", title: "Short everyday dialogues", description: "Hauptinformation aus Alltagsgesprächen." },
  { level: "a1", category: "skill", theme: "Exam prep", title: "Goethe A1 task types", description: "Know every Hören/Lesen/Schreiben/Sprechen part." },
  { level: "a1", category: "skill", theme: "Exam prep", title: "One full A1 Modellsatz", description: "Under exam timing." },

  // ════════════════════ A2 ════════════════════
  // ── grammar ──
  { level: "a2", category: "grammar", theme: "Dative case", title: "Dative articles", description: "dem, der, dem, den (+n); einem/einer." },
  { level: "a2", category: "grammar", theme: "Dative case", title: "Dative pronouns", description: "mir, dir, ihm, ihr, uns, euch, ihnen." },
  { level: "a2", category: "grammar", theme: "Dative case", title: "Verbs with dative", description: "helfen, danken, gefallen, gehören, schmecken." },
  { level: "a2", category: "grammar", theme: "Dative case", title: "Dative prepositions", description: "aus, bei, mit, nach, seit, von, zu." },
  { level: "a2", category: "grammar", theme: "Two-way prepositions", title: "wo? + dative", description: "Location: Die Katze sitzt auf dem Tisch." },
  { level: "a2", category: "grammar", theme: "Two-way prepositions", title: "wohin? + accusative", description: "Movement: Ich gehe ins Kino." },
  { level: "a2", category: "grammar", theme: "Two-way prepositions", title: "Position verbs", description: "stellen/stehen, legen/liegen, setzen/sitzen, hängen." },
  { level: "a2", category: "grammar", theme: "Past tenses", title: "Irregular participles", description: "gegessen, getrunken, genommen, geschrieben…" },
  { level: "a2", category: "grammar", theme: "Past tenses", title: "Participles of separable & -ieren verbs", description: "eingekauft, angerufen; studiert (no ge-)." },
  { level: "a2", category: "grammar", theme: "Past tenses", title: "haben or sein?", description: "Movement & change verbs take sein." },
  { level: "a2", category: "grammar", theme: "Past tenses", title: "Präteritum of modals", description: "konnte, musste, wollte, durfte, sollte." },
  { level: "a2", category: "grammar", theme: "Comparison", title: "Comparative", description: "größer als, lieber, besser, mehr." },
  { level: "a2", category: "grammar", theme: "Comparison", title: "Superlative", description: "am größten, am liebsten, der/die/das beste." },
  { level: "a2", category: "grammar", theme: "Comparison", title: "so … wie / als", description: "Equality vs. difference." },
  { level: "a2", category: "grammar", theme: "Adjective endings", title: "After definite articles", description: "der große Mann, das kleine Kind." },
  { level: "a2", category: "grammar", theme: "Adjective endings", title: "After indefinite articles", description: "ein großer Mann, eine kleine Wohnung." },
  { level: "a2", category: "grammar", theme: "Subordinate clauses", title: "weil & denn", description: "Reasons — verb-end vs. position 2." },
  { level: "a2", category: "grammar", theme: "Subordinate clauses", title: "dass-clauses", description: "Ich glaube, dass …" },
  { level: "a2", category: "grammar", theme: "Subordinate clauses", title: "wenn-clauses", description: "Conditions and repeated time." },
  { level: "a2", category: "grammar", theme: "Subordinate clauses", title: "Main-clause connectors", description: "deshalb, trotzdem, dann, außerdem." },
  { level: "a2", category: "grammar", theme: "Reflexive verbs", title: "Accusative reflexives", description: "sich freuen, sich treffen, sich anmelden." },
  { level: "a2", category: "grammar", theme: "Reflexive verbs", title: "Dative reflexives", description: "Ich wasche mir die Hände." },
  { level: "a2", category: "grammar", theme: "Verbs with prepositions", title: "Common verb + preposition pairs", description: "warten auf, sich interessieren für, denken an." },
  { level: "a2", category: "grammar", theme: "Polite & future forms", title: "würde, könnte, hätte", description: "Polite requests and wishes." },
  { level: "a2", category: "grammar", theme: "Polite & future forms", title: "Future with werden", description: "Pläne und Vorhersagen." },
  { level: "a2", category: "grammar", theme: "Genitive (intro)", title: "Recognizing the genitive", description: "des Mannes, wegen des Wetters — recognition first." },

  // ── vocab themes ──
  { level: "a2", category: "vocab_theme", theme: "Education & work", title: "School & courses", description: "Schulsystem, Kurse, Prüfungen, Noten." },
  { level: "a2", category: "vocab_theme", theme: "Education & work", title: "Office life", description: "Kollegen, Aufgaben, Termine, Besprechungen." },
  { level: "a2", category: "vocab_theme", theme: "Education & work", title: "Working conditions", description: "Vollzeit/Teilzeit, Überstunden, Urlaub, Gehalt." },
  { level: "a2", category: "vocab_theme", theme: "Health", title: "At the doctor", description: "Symptome, Untersuchung, Rezept." },
  { level: "a2", category: "vocab_theme", theme: "Health", title: "Pharmacy & medicine", description: "Apotheke, Medikamente, Dosierung." },
  { level: "a2", category: "vocab_theme", theme: "Health", title: "Krankmeldung & insurance basics", description: "Krankschreibung, Versichertenkarte." },
  { level: "a2", category: "vocab_theme", theme: "Housing", title: "Apartment search", description: "Anzeigen, Besichtigung, Vermieter." },
  { level: "a2", category: "vocab_theme", theme: "Housing", title: "Rent & costs", description: "Kaltmiete, Nebenkosten, Kaution." },
  { level: "a2", category: "vocab_theme", theme: "Housing", title: "Moving & living together", description: "Umzug, Nachbarn, Hausordnung." },
  { level: "a2", category: "vocab_theme", theme: "Money & services", title: "Banking", description: "Konto eröffnen, überweisen, Karte, Gebühren." },
  { level: "a2", category: "vocab_theme", theme: "Money & services", title: "Offices & paperwork", description: "Formulare, Unterlagen, Termin beim Amt, Bescheid." },
  { level: "a2", category: "vocab_theme", theme: "Media & technology", title: "Phone & internet", description: "Handy, Apps, E-Mails, WLAN." },
  { level: "a2", category: "vocab_theme", theme: "Feelings & opinions", title: "Expressing feelings", description: "froh, ärgerlich, enttäuscht, zufrieden." },
  { level: "a2", category: "vocab_theme", theme: "Feelings & opinions", title: "Giving opinions", description: "Ich finde/glaube/meine, dass …" },
  { level: "a2", category: "vocab_theme", theme: "Social life", title: "Invitations & celebrations", description: "einladen, zusagen/absagen, Feste, Geschenke." },
  { level: "a2", category: "vocab_theme", theme: "Social life", title: "Eating out", description: "Reservierung, Speisekarte, reklamieren, Trinkgeld." },
  { level: "a2", category: "vocab_theme", theme: "Travel & environment", title: "Holidays & booking", description: "Hotel, buchen, Sehenswürdigkeiten." },
  { level: "a2", category: "vocab_theme", theme: "Travel & environment", title: "Nature & recycling", description: "Landschaft, Wetter extremes, Mülltrennung." },

  // ── skills ──
  { level: "a2", category: "skill", theme: "Speaking", title: "Phone conversations", description: "Anrufen, verbinden, Nachricht hinterlassen." },
  { level: "a2", category: "skill", theme: "Speaking", title: "Talk about your past", description: "Wochenende, Urlaub, Lebenslauf im Perfekt." },
  { level: "a2", category: "skill", theme: "Speaking", title: "Doctor's appointment", description: "Symptome beschreiben, Empfehlungen verstehen." },
  { level: "a2", category: "skill", theme: "Speaking", title: "Apartment viewing", description: "Fragen zu Miete, Kaution, Übergabe." },
  { level: "a2", category: "skill", theme: "Speaking", title: "Make plans together", description: "Vorschlagen, zustimmen, ablehnen, verschieben." },
  { level: "a2", category: "skill", theme: "Writing", title: "Semi-formal emails", description: "Anfrage, Entschuldigung, Terminverschiebung." },
  { level: "a2", category: "skill", theme: "Writing", title: "Short reports of events", description: "Was ist passiert? — im Perfekt schreiben." },
  { level: "a2", category: "skill", theme: "Listening & reading", title: "Ads & short articles", description: "Anzeigen, Aushänge, kurze Zeitungstexte." },
  { level: "a2", category: "skill", theme: "Listening & reading", title: "Everyday conversations", description: "Detailinformationen aus Gesprächen." },
  { level: "a2", category: "skill", theme: "Exam prep", title: "Goethe A2 task types", description: "Every module's format." },
  { level: "a2", category: "skill", theme: "Exam prep", title: "One full A2 Modellsatz", description: "Under exam timing." },

  // ════════════════════ B1 ════════════════════
  // ── grammar ──
  { level: "b1", category: "grammar", theme: "Adjective declension", title: "All cases with definite articles", description: "Incl. genitive." },
  { level: "b1", category: "grammar", theme: "Adjective declension", title: "All cases with indefinite & no article", description: "ein alter Freund; frisches Brot." },
  { level: "b1", category: "grammar", theme: "Narrative past", title: "Präteritum: regular verbs", description: "machte, lernte, arbeitete." },
  { level: "b1", category: "grammar", theme: "Narrative past", title: "Präteritum: irregular & mixed verbs", description: "ging, kam, wusste, brachte, dachte." },
  { level: "b1", category: "grammar", theme: "Narrative past", title: "Plusquamperfekt", description: "hatte/war + Partizip II." },
  { level: "b1", category: "grammar", theme: "Narrative past", title: "nachdem, als, während", description: "Tense sequence in time clauses." },
  { level: "b1", category: "grammar", theme: "Passive voice", title: "Present & past passive", description: "wird gebaut / wurde gebaut." },
  { level: "b1", category: "grammar", theme: "Passive voice", title: "Passive with modals", description: "muss eingereicht werden." },
  { level: "b1", category: "grammar", theme: "Passive voice", title: "Agent with von / durch", description: "And when to drop it." },
  { level: "b1", category: "grammar", theme: "Konjunktiv II", title: "wäre, hätte, würde, könnte", description: "Forms and polite use." },
  { level: "b1", category: "grammar", theme: "Konjunktiv II", title: "Unreal conditions (present)", description: "Wenn ich Zeit hätte, würde ich …" },
  { level: "b1", category: "grammar", theme: "Konjunktiv II", title: "Unreal conditions (past)", description: "Wenn ich das gewusst hätte, wäre ich …" },
  { level: "b1", category: "grammar", theme: "Konjunktiv II", title: "Wishes & advice", description: "Ich wünschte …; An deiner Stelle würde ich …" },
  { level: "b1", category: "grammar", theme: "Relative clauses", title: "Nominative, accusative & dative", description: "der/den/dem, die/die/der, das/das/dem." },
  { level: "b1", category: "grammar", theme: "Relative clauses", title: "Genitive: dessen / deren", description: "Die Frau, deren Auto …" },
  { level: "b1", category: "grammar", theme: "Relative clauses", title: "With prepositions", description: "Die Kollegin, mit der ich arbeite." },
  { level: "b1", category: "grammar", theme: "Infinitive clauses", title: "Infinitive with zu", description: "Es ist wichtig, … zu …; vergessen zu …" },
  { level: "b1", category: "grammar", theme: "Infinitive clauses", title: "um / statt / ohne … zu", description: "Purpose and contrast constructions." },
  { level: "b1", category: "grammar", theme: "Connectors", title: "obwohl & trotzdem", description: "Concession, both word orders." },
  { level: "b1", category: "grammar", theme: "Connectors", title: "damit & sodass", description: "Purpose vs. result; damit vs. um…zu." },
  { level: "b1", category: "grammar", theme: "Connectors", title: "je … desto", description: "Je mehr ich lerne, desto besser …" },
  { level: "b1", category: "grammar", theme: "Connectors", title: "Two-part connectors", description: "entweder…oder, weder…noch, sowohl…als auch." },
  { level: "b1", category: "grammar", theme: "Indirect speech & questions", title: "Indirect questions", description: "Ich weiß nicht, ob/wann/warum …" },
  { level: "b1", category: "grammar", theme: "Indirect speech & questions", title: "Reporting statements", description: "Er sagt, dass …; Präsens vs. Konjunktiv I awareness." },
  { level: "b1", category: "grammar", theme: "Genitive", title: "Genitive forms", description: "des Mannes, der Frau, meines Bruders." },
  { level: "b1", category: "grammar", theme: "Genitive", title: "Genitive prepositions", description: "wegen, trotz, während, innerhalb, außerhalb." },
  { level: "b1", category: "grammar", theme: "Special noun & verb forms", title: "n-declension", description: "der Kunde/den Kunden, der Name, der Kollege." },
  { level: "b1", category: "grammar", theme: "Special noun & verb forms", title: "Pronominal adverbs", description: "darauf, damit, worüber — with fixed prepositions." },
  { level: "b1", category: "grammar", theme: "Special noun & verb forms", title: "Participles as adjectives", description: "die lachenden Kinder, das reparierte Auto." },
  { level: "b1", category: "grammar", theme: "Word order", title: "TeKaMoLo", description: "Temporal – kausal – modal – lokal in the Mittelfeld." },
  { level: "b1", category: "grammar", theme: "Word order", title: "Pronoun order", description: "Accusative before dative pronoun: Ich gebe es ihm." },
  { level: "b1", category: "grammar", theme: "Future", title: "Futur I & II", description: "Pläne, Vermutungen: Er wird wohl … sein." },

  // ── vocab themes ──
  { level: "b1", category: "vocab_theme", theme: "Applications & Ausbildung", title: "Bewerbung vocabulary", description: "Anschreiben, Lebenslauf, Zeugnis, Vorstellungsgespräch." },
  { level: "b1", category: "vocab_theme", theme: "Applications & Ausbildung", title: "The dual training system", description: "Berufsschule, Betrieb, IHK, Ausbildungsvertrag, Vergütung." },
  { level: "b1", category: "vocab_theme", theme: "Applications & Ausbildung", title: "Rights & duties as an Azubi", description: "Probezeit, Urlaub, Berichtsheft, Abschlussprüfung." },
  { level: "b1", category: "vocab_theme", theme: "Bureaucracy", title: "Amtsdeutsch survival kit", description: "Antrag, Frist, Bescheid, Widerspruch, Nachweis." },
  { level: "b1", category: "vocab_theme", theme: "Bureaucracy", title: "Visa & residence", description: "Aufenthaltstitel, Anmeldung, Sperrkonto, VIDEX." },
  { level: "b1", category: "vocab_theme", theme: "Bureaucracy", title: "Contracts & insurance", description: "Krankenversicherung, Haftpflicht, kündigen, Klauseln." },
  { level: "b1", category: "vocab_theme", theme: "Working life", title: "Workplace communication", description: "Anweisungen, Feedback, Konflikte, Small Talk." },
  { level: "b1", category: "vocab_theme", theme: "Working life", title: "Money & taxes", description: "brutto/netto, Steuerklasse, Gehaltsabrechnung." },
  { level: "b1", category: "vocab_theme", theme: "Health & society", title: "The health system", description: "Hausarzt, Facharzt, Überweisung, Vorsorge." },
  { level: "b1", category: "vocab_theme", theme: "Health & society", title: "Environment & sustainability", description: "Umweltschutz, Energie, Nachhaltigkeit." },
  { level: "b1", category: "vocab_theme", theme: "Health & society", title: "News & politics basics", description: "Schlagzeilen, Wahlen, Parteien, Meinungsfreiheit." },
  { level: "b1", category: "vocab_theme", theme: "Digital life", title: "Media & data", description: "Datenschutz, soziale Medien, Online-Dienste." },
  { level: "b1", category: "vocab_theme", theme: "Culture & integration", title: "Living in Germany", description: "Traditionen, Feiertage, interkulturelle Situationen." },
  { level: "b1", category: "vocab_theme", theme: "Culture & integration", title: "Mobility", description: "ÖPNV-Abos, Führerschein, Deutschlandticket, Umzug." },
  { level: "b1", category: "vocab_theme", theme: "Argumentation", title: "Opinion phrases", description: "Meiner Meinung nach, einerseits/andererseits, im Gegensatz dazu." },
  { level: "b1", category: "vocab_theme", theme: "Argumentation", title: "Agreeing & disagreeing", description: "Da stimme ich zu / Da bin ich anderer Meinung, weil …" },

  // ── skills ──
  { level: "b1", category: "skill", theme: "Speaking", title: "Job interview practice", description: "Stärken, Schwächen, Werdegang, Rückfragen." },
  { level: "b1", category: "skill", theme: "Speaking", title: "Give a short presentation", description: "Goethe B1 Sprechen Teil 2: Thema strukturiert vorstellen." },
  { level: "b1", category: "skill", theme: "Speaking", title: "Discuss & defend an opinion", description: "Argumentieren, widersprechen, Kompromisse finden." },
  { level: "b1", category: "skill", theme: "Speaking", title: "Phone calls with offices", description: "Auskünfte einholen, Probleme klären, Termine verschieben." },
  { level: "b1", category: "skill", theme: "Writing", title: "Formal letters & emails", description: "Bewerbung, Beschwerde, Kündigung — Aufbau + feste Wendungen." },
  { level: "b1", category: "skill", theme: "Writing", title: "Forum posts & opinions", description: "Goethe B1 Schreiben Teil 2 style." },
  { level: "b1", category: "skill", theme: "Listening & reading", title: "Radio & TV news", description: "Hauptinformationen aus Nachrichten entnehmen." },
  { level: "b1", category: "skill", theme: "Listening & reading", title: "Summarize articles", description: "Kernaussagen mündlich und schriftlich wiedergeben." },
  { level: "b1", category: "skill", theme: "Exam prep", title: "Goethe B1 task types", description: "Every module — the B1 exam is modular; know each cold." },
  { level: "b1", category: "skill", theme: "Exam prep", title: "One full B1 Modellsatz", description: "Under exam timing." },
];

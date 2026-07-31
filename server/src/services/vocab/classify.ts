import type { CefrLevel, Themenfeld } from "@prisma/client";

export type Wortart = "Nomen" | "Verb" | "Adjektiv" | "Adverb" | "Funktionswort" | "Wendung";
export type Genus = "der" | "die" | "das" | null;
export type SrsState = "new" | "due" | "learning" | "mastered";

/** The frozen 14-value Themenfeld list, for zod validation at the API boundary. */
export const THEMENFELD_VALUES = [
  "person_familie",
  "alltag_zuhause",
  "essen_einkaufen",
  "arbeit_ausbildung",
  "bildung",
  "gesundheit",
  "reise_verkehr",
  "freizeit_kultur",
  "medien_technik",
  "geld",
  "amt_buerokratie",
  "gefuehle_meinung",
  "natur_umwelt",
  "gesellschaft",
] as const satisfies readonly Themenfeld[];

const MASTERED_INTERVAL_DAYS = 21;

/**
 * `meaning` carries a Wiktionary POS tag when enrichment found one
 * ("(Noun) train station", see meaningFromEntries() in
 * services/enrichment/wiktionary.ts) — never persisted separately, so this
 * re-derives Wortart from it on every read instead of storing it.
 */
const POS_TO_WORTART: Record<string, Wortart> = {
  noun: "Nomen",
  "proper noun": "Nomen",
  verb: "Verb",
  adjective: "Adjektiv",
  adverb: "Adverb",
  preposition: "Funktionswort",
  postposition: "Funktionswort",
  conjunction: "Funktionswort",
  pronoun: "Funktionswort",
  determiner: "Funktionswort",
  article: "Funktionswort",
  particle: "Funktionswort",
  interjection: "Funktionswort",
  numeral: "Funktionswort",
  prefix: "Funktionswort",
  suffix: "Funktionswort",
  phrase: "Wendung",
  idiom: "Wendung",
};

/** Best-effort — a manually-typed or machine-translated meaning/grammar may carry no POS tag at all. */
export function deriveWortart(meaning: string | null, grammar: string | null): Wortart {
  const posMatch = meaning?.match(/^\(([\w\s]+)\)/);
  if (posMatch) {
    const wortart = POS_TO_WORTART[posMatch[1]!.trim().toLowerCase()];
    if (wortart) return wortart;
  }
  // grammar starting with a gendered article ("der; Plural: ...") only happens for nouns
  // (see buildGrammarNote() in wiktionary.ts); principal parts ("sieht, sah, hat gesehen") are verb-only
  if (grammar && /^(der|die|das)\b/i.test(grammar)) return "Nomen";
  if (grammar && /,.*\bhat\b|,.*\bist\b/.test(grammar)) return "Verb";
  const headwordLike = meaning ?? "";
  if (/\s/.test(headwordLike.trim()) === false && /^[A-ZÄÖÜ]/.test(headwordLike)) return "Nomen";
  return "Funktionswort";
}

/** Best-effort — mirrors extractGender()'s der/die/das convention, but reads the already-formatted `grammar` string, not raw wikitext. */
export function deriveGenus(grammar: string | null): Genus {
  if (!grammar) return null;
  const m = grammar.match(/^(der|die|das)\b/i);
  if (m) return m[1]!.toLowerCase() as Genus;
  const fallback = grammar.match(/\b(masc|fem|neut)\b/i);
  if (fallback) return { masc: "der", fem: "die", neut: "das" }[fallback[1]!.toLowerCase()] as Genus;
  return null;
}

export function deriveSrsState(word: { srDue: Date | null; srInterval: number | null }): SrsState {
  if (word.srDue === null) return "new";
  if (word.srDue.getTime() <= Date.now()) return "due";
  if (word.srInterval !== null && word.srInterval >= MASTERED_INTERVAL_DAYS) return "mastered";
  return "learning";
}

interface LessonThemeEntry {
  themenfeld: Themenfeld[];
  level: CefrLevel;
}

/**
 * `Word.lesson` is constrained (both by the API's zod schema here and by
 * the vault card format's `#lesson/([\w-]+)` tag, see services/vault/
 * format.ts) to `\w-` only — no spaces, no "&". So this can't key off the
 * human-readable strings elsewhere in the app (SyllabusItem.theme,
 * roadmap-defaults.ts's week `theme`) — a lesson value can never literally
 * equal "money & services". Instead it extracts a **week number** from
 * whatever slug shape the lesson was typed in ("week-5", "week05", "w5", …)
 * and looks that up against the same week ranges roadmap-generator.ts's
 * PHASE_LEVELS uses, plus a per-week Themenfeld table transcribed from each
 * regular week's `theme` in roadmap-defaults.ts's DEFAULT_ROADMAP_DAYS.
 * Lessons with no extractable week number fall through to the keyword
 * heuristic below. Milestone weeks (8/16/25/26) aren't in the table: no
 * vocab is programmatically tied to them.
 */
const WEEK_THEMENFELD: Record<number, Themenfeld[]> = {
  1: ["alltag_zuhause"],
  2: ["alltag_zuhause"],
  3: ["essen_einkaufen"],
  4: ["alltag_zuhause"],
  5: ["reise_verkehr"],
  6: ["person_familie"],
  7: ["alltag_zuhause"],
  9: ["freizeit_kultur"],
  10: ["alltag_zuhause"],
  11: ["gesundheit"],
  12: ["gesellschaft"],
  13: ["alltag_zuhause"],
  14: ["geld", "essen_einkaufen"],
  15: ["alltag_zuhause"],
  17: ["reise_verkehr"],
  18: ["amt_buerokratie"],
  19: ["gefuehle_meinung"],
  20: ["arbeit_ausbildung"],
  21: ["bildung"],
  22: ["medien_technik", "freizeit_kultur"],
  23: ["amt_buerokratie"],
  24: ["arbeit_ausbildung", "gefuehle_meinung"],
};

function levelForWeek(week: number): CefrLevel | null {
  if (week >= 1 && week <= 7) return "a1";
  if (week >= 9 && week <= 15) return "a2";
  if (week >= 17 && week <= 24) return "b1";
  return null;
}

function weekNumberFromLesson(lesson: string): number | null {
  const m = lesson.match(/(?:week|wk|w)[-_]?(\d{1,2})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 26 ? n : null;
}

function lessonThemeEntry(lesson: string): LessonThemeEntry | null {
  const week = weekNumberFromLesson(lesson);
  if (week === null) return null;
  const level = levelForWeek(week);
  const themenfeld = WEEK_THEMENFELD[week];
  if (!level || !themenfeld) return null;
  return { themenfeld, level };
}

// Word-boundary match, not substring — a plain `.includes()` let short
// keywords like "app" false-positive inside unrelated words ("apple",
// "application"), e.g. Apfel/Bewerbung both wrongly landing in
// medien_technik because their English glosses contain "app".
const KEYWORDS: [Themenfeld, string[]][] = [
  [
    "person_familie",
    [
      "familie", "eltern", "mutter", "vater", "elternteil", "kind", "kinder", "geschwister", "bruder", "schwester",
      "sohn", "tochter", "oma", "opa", "großmutter", "großvater", "ehemann", "ehefrau", "partner", "partnerin",
      "verwandte", "tante", "onkel", "cousin", "cousine", "baby", "geburtstag", "verheiratet", "ledig", "geschieden",
      "family", "parent", "parents", "mother", "father", "child", "children", "sibling", "brother", "sister",
      "son", "daughter", "grandmother", "grandfather", "husband", "wife", "relative", "aunt", "uncle", "cousin",
      "baby", "birthday", "married", "single", "divorced",
    ],
  ],
  [
    "alltag_zuhause",
    [
      "zuhause", "wohnung", "haus", "zimmer", "küche", "bad", "badezimmer", "schlafzimmer", "wohnzimmer", "möbel",
      "tisch", "stuhl", "bett", "schrank", "sofa", "lampe", "fenster", "tür", "haushalt", "alltag", "routine",
      "putzen", "aufräumen", "wäsche", "miete", "vermieter", "nachbar", "mitbewohner", "wg", "toilette",
      "home", "apartment", "flat", "house", "room", "kitchen", "bathroom", "bedroom", "living room", "furniture",
      "table", "chair", "bed", "closet", "wardrobe", "sofa", "lamp", "window", "door", "household", "everyday",
      "routine", "clean", "tidy", "laundry", "rent", "landlord", "neighbor", "neighbour", "roommate", "chores",
      "toilet",
    ],
  ],
  [
    "essen_einkaufen",
    [
      "essen", "trinken", "lebensmittel", "supermarkt", "einkaufen", "restaurant", "café", "brot", "wasser",
      "kaffee", "tee", "milch", "obst", "gemüse", "fleisch", "fisch", "käse", "eier", "zucker", "salz",
      "speisekarte", "kellner", "bestellen", "kochen", "rezept", "frühstück", "mittagessen", "abendessen", "hungrig",
      "durstig", "süß", "bäckerei", "metzgerei", "apfel", "birne", "banane", "kartoffel", "reis", "nudeln",
      "suppe", "wurst", "schokolade", "kuchen", "pizza", "obstart", "frucht",
      "food", "drink", "grocery", "groceries", "shop", "shopping", "restaurant", "cafe", "bread", "water",
      "coffee", "tea", "milk", "fruit", "vegetable", "meat", "fish", "cheese", "egg", "eggs", "sugar", "salt",
      "menu", "waiter", "order", "cook", "recipe", "meal", "breakfast", "lunch", "dinner", "hungry", "thirsty",
      "bakery", "butcher", "apple", "pear", "banana", "potato", "rice", "pasta", "noodles", "soup", "sausage",
      "chocolate", "cake", "pizza",
    ],
  ],
  [
    "arbeit_ausbildung",
    [
      "arbeit", "beruf", "ausbildung", "betrieb", "kollege", "kollegin", "chef", "chefin", "gehalt", "lohn",
      "bewerbung", "lebenslauf", "vorstellungsgespräch", "vertrag", "praktikum", "schicht", "überstunden",
      "kündigung", "arbeitgeber", "arbeitnehmer", "unternehmen", "firma", "büro", "azubi", "geselle",
      "job", "work", "career", "apprenticeship", "employer", "employee", "colleague", "boss", "salary", "wage",
      "application", "resume", "cv", "interview", "contract", "internship", "shift", "overtime", "resignation",
      "company", "firm", "office", "trainee", "workplace",
    ],
  ],
  [
    "bildung",
    [
      "schule", "kurs", "prüfung", "studium", "universität", "klasse", "lehrer", "lehrerin", "schüler", "student",
      "studentin", "hausaufgaben", "note", "zeugnis", "unterricht", "lernen", "studieren", "vorlesung", "seminar",
      "abschluss", "diplom",
      "school", "exam", "course", "university", "college", "class", "teacher", "student", "homework", "grade",
      "certificate", "lesson", "learn", "study", "lecture", "seminar", "degree", "diploma", "curriculum",
    ],
  ],
  [
    "gesundheit",
    [
      "gesund", "krank", "arzt", "ärztin", "apotheke", "schmerz", "medikament", "krankheit", "krankenhaus",
      "termin", "fieber", "husten", "erkältung", "verletzung", "behandlung", "symptom", "impfung", "zahnarzt",
      "notaufnahme", "rezept",
      "health", "doctor", "sick", "ill", "pharmacy", "pain", "medicine", "illness", "hospital", "appointment",
      "fever", "cough", "cold", "injury", "treatment", "symptom", "vaccine", "dentist", "emergency room",
      "prescription",
    ],
  ],
  [
    "reise_verkehr",
    [
      "reise", "zug", "bahnhof", "bus", "auto", "fahren", "flug", "flughafen", "flugzeug", "pilot", "passagier",
      "ticket", "fahrkarte", "straße", "ampel", "verkehr", "stau", "fahrrad", "u-bahn", "s-bahn", "straßenbahn",
      "taxi", "gepäck", "urlaub", "haltestelle", "abfahrt", "ankunft", "verspätung",
      "travel", "train", "station", "bus", "car", "drive", "flight", "airport", "plane", "airplane", "pilot",
      "passenger", "ticket", "street", "road", "traffic", "traffic light", "jam", "bike", "bicycle", "subway",
      "tram", "taxi", "luggage", "baggage", "vacation", "holiday", "trip", "departure", "arrival", "delay",
    ],
  ],
  [
    "freizeit_kultur",
    [
      "hobby", "freizeit", "sport", "musik", "film", "kino", "buch", "lesen", "kultur", "museum", "theater",
      "konzert", "party", "feier", "tanzen", "spielen", "spiel", "fußball", "schwimmen", "wandern", "ausstellung",
      "gitarre", "klavier", "instrument", "lied", "lagerfeuer",
      "leisure", "hobby", "sport", "music", "movie", "cinema", "book", "read", "culture", "museum", "theater",
      "concert", "party", "celebration", "dance", "play", "game", "football", "soccer", "swim", "hike",
      "exhibition", "guitar", "piano", "instrument", "song", "campfire",
    ],
  ],
  [
    "medien_technik",
    [
      "handy", "smartphone", "internet", "computer", "app", "medien", "fernsehen", "fernseher", "radio",
      "zeitung", "nachrichten", "webseite", "software", "laptop", "tablet", "digital", "sozial", "technologie",
      "drucker", "telefon", "e-mail",
      "phone", "internet", "computer", "media", "television", "tv", "radio", "newspaper", "news", "website",
      "software", "laptop", "tablet", "wifi", "digital", "online", "technology", "social media", "printer",
      "telephone", "e-mail", "email",
    ],
  ],
  [
    "geld",
    [
      "geld", "bank", "konto", "preis", "bezahlen", "rechnung", "kredit", "sparen", "gebühr", "überweisung",
      "bargeld", "kreditkarte", "kosten", "teuer", "billig", "sparkonto", "gehaltsabrechnung",
      "money", "bank", "account", "price", "pay", "bill", "invoice", "credit", "save", "fee", "transfer",
      "cash", "credit card", "cost", "expensive", "cheap", "savings", "payslip",
    ],
  ],
  [
    "amt_buerokratie",
    [
      "amt", "antrag", "formular", "behörde", "anmeldung", "abmeldung", "bescheid", "ausweis", "pass", "visum",
      "aufenthaltstitel", "meldebescheinigung", "unterschrift", "stempel", "frist", "dokument", "bürgeramt",
      "office", "form", "authority", "registration", "deregistration", "notice", "id", "passport", "visa",
      "residence permit", "signature", "stamp", "deadline", "bureaucracy", "document",
    ],
  ],
  [
    "gefuehle_meinung",
    [
      "gefühl", "meinung", "glücklich", "traurig", "wütend", "ängstlich", "nervös", "zufrieden", "stolz",
      "überrascht", "hoffen", "denken", "glauben", "lieben", "hassen", "enttäuscht", "aufgeregt",
      "feeling", "opinion", "happy", "sad", "angry", "afraid", "nervous", "satisfied", "proud", "surprised",
      "hope", "think", "believe", "love", "hate", "disappointed", "excited",
    ],
  ],
  [
    "natur_umwelt",
    [
      "natur", "umwelt", "wetter", "tier", "pflanze", "baum", "blume", "wald", "berg", "see", "meer", "fluss",
      "klima", "sonne", "regen", "schnee", "wind", "umweltschutz",
      "nature", "environment", "weather", "animal", "plant", "tree", "flower", "forest", "mountain", "lake",
      "sea", "river", "climate", "sun", "rain", "snow", "wind", "conservation",
    ],
  ],
  [
    "gesellschaft",
    [
      "gesellschaft", "politik", "wahl", "regierung", "gesetz", "recht", "religion", "tradition", "gemeinschaft",
      "integration", "migration", "gleichberechtigung", "demokratie",
      "society", "politics", "election", "government", "law", "religion", "tradition", "community",
      "integration", "migration", "equality", "democracy",
    ],
  ],
];

/**
 * Best-effort keyword classifier for lesson-less (ad-hoc inbox) words —
 * deliberately isolated from classifyTheme()'s caller so a later one-off
 * backfill script can swap in an LLM call here without touching the live
 * add/edit path (never wire an LLM call into that path).
 */
export function classifyThemeHeuristic(
  headword: string,
  meaning: string | null,
  example: string | null = null,
): Themenfeld[] {
  const haystack = `${headword} ${meaning ?? ""} ${example ?? ""}`.toLowerCase();
  // Score by keyword-hit count per theme (not "first theme in list order that
  // matches at all") — a word whose meaning/example mentions several
  // Krankenhaus/Arzt/Termin-type terms should outrank one with a single
  // incidental hit in an earlier-listed theme.
  const scored = KEYWORDS.map(([themenfeld, keywords]) => {
    const hits = keywords.filter((k) => new RegExp(`\\b${k}\\b`, "i").test(haystack)).length;
    return { themenfeld, hits };
  }).filter((s) => s.hits > 0);
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 2).map((s) => s.themenfeld);
}

/** Attaches the read-time-derived facets (never persisted) to any word-shaped row. */
export function withComputedFields<
  T extends { meaning: string | null; grammar: string | null; srDue: Date | null; srInterval: number | null },
>(word: T): T & { wortart: Wortart; genus: Genus; state: SrsState } {
  return {
    ...word,
    wortart: deriveWortart(word.meaning, word.grammar),
    genus: deriveGenus(word.grammar),
    state: deriveSrsState(word),
  };
}

export function classifyTheme(word: {
  lesson: string | null;
  headword: string;
  meaning: string | null;
  example?: string | null;
}): { themenfeld: Themenfeld[]; level: CefrLevel | null } {
  if (word.lesson) {
    const entry = lessonThemeEntry(word.lesson);
    if (entry) return entry;
  }
  return { themenfeld: classifyThemeHeuristic(word.headword, word.meaning, word.example ?? null), level: null };
}

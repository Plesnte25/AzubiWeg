/**
 * Seeds (or re-seeds, idempotently) one fixed demo account so the app has
 * realistic, populated data to show when DEMO_MODE_ENABLED=true — see
 * routes/auth.ts's POST /demo-login and DEPLOYMENT.md for how that flag
 * turns this account into a public, no-login-required session for external
 * site-analysis tools (PageSpeed Insights, GTmetrix) that crawl unauthenticated
 * and would otherwise only ever see the login screen.
 *
 * Safe to re-run: every step either checks the same "already seeded" stamp
 * the real app uses, or guards itself with a row-count check before
 * inserting. Run with `npm run seed:demo`; `npm run seed:demo -- --reset`
 * deletes the demo account first so changes to this file reach it.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { CefrLevel, Grade } from "@prisma/client";
import { prisma } from "../src/db.js";
import { activateRoadmapForUser } from "../src/routes/roadmap.js";
import { setRoadmapTaskCompletion } from "../src/services/learning/completion-sync.js";
import { ensureSyllabusSeeded } from "../src/services/learning/syllabus-seed.js";
import { deriveStations } from "../src/services/learning/stations.js";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@azubiweg.internal";
const DAY_MS = 86_400_000;

async function seedUser(): Promise<{ id: string }> {
  // password login is never used for this account — /demo-login looks it up
  // by fixed email and issues a token directly — so a random throwaway hash
  // is all that's needed here.
  return prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      name: "Demo Account",
    },
    select: { id: true },
  });
}

// Shaped like real enriched words (see enrichResolved() / buildGrammarNote() in services/enrichment/index.ts): the
// meaning carries the Wiktionary POS tag, and `grammar` is "der; Plural: die …" for nouns and the principal parts for
// verbs, so the word class, gender and noun/verb filters derive the same way they do for a user's own words.
const DEMO_WORDS: {
  headword: string;
  meaning: string;
  grammar: string | null;
  example: string;
  exampleTranslation: string;
  level: CefrLevel;
  state: "due" | "new" | "mastered";
  declension?: Record<string, { sg?: string; pl?: string }>;
  conjugation?: { present: Record<string, string>; past?: string; perfect?: string };
}[] = [
  {
    headword: "Haus", meaning: "(Noun) house", grammar: "das; Plural: die Häuser",
    example: "Das Haus ist groß.", exampleTranslation: "The house is big.", level: "a1", state: "mastered",
    declension: {
      nom: { sg: "das Haus", pl: "die Häuser" },
      akk: { sg: "das Haus", pl: "die Häuser" },
      dat: { sg: "dem Haus", pl: "den Häusern" },
      gen: { sg: "des Hauses", pl: "der Häuser" },
    },
  },
  {
    headword: "Familie", meaning: "(Noun) family", grammar: "die; Plural: die Familien",
    example: "Meine Familie wohnt in Berlin.", exampleTranslation: "My family lives in Berlin.", level: "a1", state: "mastered",
  },
  {
    headword: "arbeiten", meaning: "(Verb) to work", grammar: "arbeitet, arbeitete, hat gearbeitet",
    example: "Ich arbeite jeden Tag.", exampleTranslation: "I work every day.", level: "a1", state: "mastered",
    conjugation: {
      present: { ich: "arbeite", du: "arbeitest", er: "arbeitet", wir: "arbeiten", ihr: "arbeitet", sie: "arbeiten" },
      past: "arbeitete",
      perfect: "hat gearbeitet",
    },
  },
  {
    headword: "Ausbildung", meaning: "(Noun) vocational training", grammar: "die; Plural: die Ausbildungen",
    example: "Sie macht eine Ausbildung als Krankenschwester.", exampleTranslation: "She is training as a nurse.", level: "a1", state: "mastered",
    declension: {
      nom: { sg: "die Ausbildung", pl: "die Ausbildungen" },
      akk: { sg: "die Ausbildung", pl: "die Ausbildungen" },
      dat: { sg: "der Ausbildung", pl: "den Ausbildungen" },
      gen: { sg: "der Ausbildung", pl: "der Ausbildungen" },
    },
  },
  {
    headword: "essen", meaning: "(Verb) to eat", grammar: "isst, aß, hat gegessen",
    example: "Wir essen um sechs Uhr.", exampleTranslation: "We eat at six o'clock.", level: "a1", state: "mastered",
    conjugation: {
      present: { ich: "esse", du: "isst", er: "isst", wir: "essen", ihr: "esst", sie: "essen" },
      past: "aß",
      perfect: "hat gegessen",
    },
  },
  {
    headword: "trinken", meaning: "(Verb) to drink", grammar: "trinkt, trank, hat getrunken",
    example: "Er trinkt gern Kaffee.", exampleTranslation: "He likes drinking coffee.", level: "a1", state: "mastered",
  },
  {
    headword: "Schule", meaning: "(Noun) school", grammar: "die; Plural: die Schulen",
    example: "Die Schule beginnt um acht Uhr.", exampleTranslation: "School starts at eight o'clock.", level: "a1", state: "mastered",
  },
  {
    headword: "gesund", meaning: "(Adjective) healthy", grammar: null,
    example: "Obst ist gesund.", exampleTranslation: "Fruit is healthy.", level: "a1", state: "mastered",
  },
  {
    headword: "Bahnhof", meaning: "(Noun) train station", grammar: "der; Plural: die Bahnhöfe",
    example: "Der Bahnhof ist nicht weit.", exampleTranslation: "The train station isn't far.", level: "a1", state: "due",
    declension: {
      nom: { sg: "der Bahnhof", pl: "die Bahnhöfe" },
      akk: { sg: "den Bahnhof", pl: "die Bahnhöfe" },
      dat: { sg: "dem Bahnhof", pl: "den Bahnhöfen" },
      gen: { sg: "des Bahnhofs", pl: "der Bahnhöfe" },
    },
  },
  {
    headword: "Wochenende", meaning: "(Noun) weekend", grammar: "das; Plural: die Wochenenden",
    example: "Was machst du am Wochenende?", exampleTranslation: "What are you doing at the weekend?", level: "a1", state: "due",
  },
  {
    headword: "Handy", meaning: "(Noun) mobile phone", grammar: "das; Plural: die Handys",
    example: "Mein Handy ist kaputt.", exampleTranslation: "My mobile phone is broken.", level: "a1", state: "due",
  },
  {
    headword: "Geld", meaning: "(Noun) money", grammar: "das; Plural: die Gelder",
    example: "Ich habe kein Geld dabei.", exampleTranslation: "I don't have any money on me.", level: "a1", state: "due",
  },
  {
    headword: "Termin", meaning: "(Noun) appointment", grammar: "der; Plural: die Termine",
    example: "Ich habe einen Termin beim Amt.", exampleTranslation: "I have an appointment at the authorities' office.", level: "a2", state: "due",
  },
  {
    headword: "Meinung", meaning: "(Noun) opinion", grammar: "die; Plural: die Meinungen",
    example: "Was ist deine Meinung dazu?", exampleTranslation: "What's your opinion on that?", level: "a2", state: "due",
  },
  {
    headword: "Umwelt", meaning: "(Noun) environment", grammar: "die; Plural: die Umwelten",
    example: "Wir müssen die Umwelt schützen.", exampleTranslation: "We have to protect the environment.", level: "a2", state: "due",
  },
  {
    headword: "Gesellschaft", meaning: "(Noun) society", grammar: "die; Plural: die Gesellschaften",
    example: "Das ist ein Problem für die ganze Gesellschaft.", exampleTranslation: "That is a problem for the whole of society.", level: "a2", state: "due",
  },
  {
    headword: "beantragen", meaning: "(Verb) to apply for (officially)", grammar: "beantragt, beantragte, hat beantragt",
    example: "Ich möchte ein Visum beantragen.", exampleTranslation: "I would like to apply for a visa.", level: "a2", state: "new",
  },
  {
    headword: "Bewerbung", meaning: "(Noun) job application", grammar: "die; Plural: die Bewerbungen",
    example: "Ich schreibe eine Bewerbung.", exampleTranslation: "I'm writing a job application.", level: "a2", state: "new",
  },
  {
    headword: "Vorstellungsgespräch", meaning: "(Noun) job interview", grammar: "das; Plural: die Vorstellungsgespräche",
    example: "Das Vorstellungsgespräch war erfolgreich.", exampleTranslation: "The job interview went well.", level: "a2", state: "new",
  },
  {
    headword: "Versicherung", meaning: "(Noun) insurance", grammar: "die; Plural: die Versicherungen",
    example: "Brauche ich eine Versicherung?", exampleTranslation: "Do I need insurance?", level: "a2", state: "new",
  },
  {
    headword: "Miete", meaning: "(Noun) rent", grammar: "die; Plural: die Mieten",
    example: "Die Miete ist im August fällig.", exampleTranslation: "The rent is due in August.", level: "a2", state: "new",
  },
  {
    headword: "Kollege", meaning: "(Noun) colleague", grammar: "der; Plural: die Kollegen",
    example: "Mein Kollege hilft mir gern.", exampleTranslation: "My colleague is happy to help me.", level: "a1", state: "new",
  },
  {
    headword: "pünktlich", meaning: "(Adjective) punctual", grammar: null,
    example: "Sei bitte pünktlich!", exampleTranslation: "Please be on time!", level: "a1", state: "new",
  },
  {
    headword: "Prüfung", meaning: "(Noun) exam", grammar: "die; Plural: die Prüfungen",
    example: "Die Prüfung ist nächste Woche.", exampleTranslation: "The exam is next week.", level: "a2", state: "new",
  },
];

async function seedWords(userId: string): Promise<void> {
  for (const w of DEMO_WORDS) {
    const sortKey = w.headword.toLowerCase();
    const srDue =
      w.state === "due" ? new Date(Date.now() - 2 * DAY_MS) : w.state === "mastered" ? new Date(Date.now() + 60 * DAY_MS) : null;
    const srInterval = w.state === "mastered" ? 45 : w.state === "due" ? 6 : null;
    const srEase = w.state === "new" ? null : 250;

    await prisma.word.upsert({
      where: { userId_sortKey: { userId, sortKey } },
      update: {},
      create: {
        userId,
        headword: w.headword,
        sortKey,
        meaning: w.meaning,
        grammar: w.grammar,
        example: w.example,
        exampleTranslation: w.exampleTranslation,
        ...(w.declension ? { declension: w.declension } : {}),
        ...(w.conjugation ? { conjugation: w.conjugation } : {}),
        level: w.level,
        srDue,
        srInterval,
        srEase,
        // "New" = added in the last 7 days; the rest were added over the past two months
        createdAt: new Date(Date.now() - (w.state === "new" ? DEMO_WORDS.indexOf(w) % 6 : 14 + DEMO_WORDS.indexOf(w) * 2) * DAY_MS),
        starred: ["Ausbildung", "Bewerbung", "Termin"].includes(w.headword),
        rawBlock: `${w.headword}\n?\n${w.meaning}`,
      },
    });
  }
}

async function seedReviewLogs(userId: string): Promise<void> {
  const existing = await prisma.reviewLog.count({ where: { word: { userId } } });
  if (existing > 0) return;

  const reviewedWords = await prisma.word.findMany({
    where: { userId, sortKey: { in: DEMO_WORDS.filter((w) => w.state !== "new").map((w) => w.headword.toLowerCase()) } },
    select: { id: true },
  });

  const grades: Grade[] = ["easy", "good", "good", "hard", "good"];
  const rows = reviewedWords.flatMap((word, i) =>
    Array.from({ length: 2 + (i % 3) }, (_, j) => ({
      wordId: word.id,
      grade: grades[(i + j) % grades.length]!,
      intervalAfter: 2 + j * 3,
      reviewedAt: new Date(Date.now() - (i + j * 2) * DAY_MS - (i % 5) * 3_600_000),
    })),
  );

  if (rows.length > 0) await prisma.reviewLog.createMany({ data: rows });
}

async function seedRoadmap(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const alreadyActivated = user.roadmapStartedAt !== null;

  if (!alreadyActivated) {
    const startedAt = new Date(Date.now() - 21 * DAY_MS);
    startedAt.setUTCHours(0, 0, 0, 0);
    await activateRoadmapForUser(userId, startedAt);
  }

  // Mark a realistic chunk of past-dated tasks completed — only worth doing
  // right after activation (a rerun would otherwise re-toggle tasks the demo
  // "user" may have since un-completed via the UI, which isn't idempotent
  // seeding, it's overwriting live state).
  if (alreadyActivated) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const pastDays = await prisma.roadmapDay.findMany({
    where: { userId, date: { lt: today } },
    include: { tasks: { select: { id: true } } },
  });

  await prisma.$transaction(async (tx) => {
    for (const day of pastDays) {
      for (const [i, task] of day.tasks.entries()) {
        // ~70% completion looks like realistic in-progress use, not a
        // suspiciously perfect 100%
        if (i % 10 < 7) await setRoadmapTaskCompletion(tx, userId, task.id, true);
      }
    }
  });
}

const DEMO_APPLICATIONS: {
  company: string;
  role: string;
  status: "wishlist" | "applied" | "interview" | "offer" | "rejected";
  daysAgo: number;
}[] = [
  { company: "Nordwind Logistik GmbH", role: "Fachkraft für Lagerlogistik", status: "wishlist", daysAgo: 3 },
  { company: "Beispiel AG", role: "Kaufmann für Büromanagement", status: "wishlist", daysAgo: 5 },
  { company: "Muster GmbH", role: "Fachinformatiker Systemintegration", status: "applied", daysAgo: 14 },
  { company: "Süddeutsche Handwerk KG", role: "Elektroniker für Betriebstechnik", status: "applied", daysAgo: 10 },
  { company: "Rheinland Pflege gGmbH", role: "Pflegefachkraft", status: "interview", daysAgo: 6 },
  { company: "Beispielstadt Verwaltung", role: "Verwaltungsfachangestellte", status: "rejected", daysAgo: 20 },
];

async function seedApplications(userId: string): Promise<void> {
  const existing = await prisma.application.count({ where: { userId } });
  if (existing > 0) return;

  const byStatus = new Map<string, number>();
  for (const app of DEMO_APPLICATIONS) {
    const sortOrder = byStatus.get(app.status) ?? 0;
    byStatus.set(app.status, sortOrder + 1);
    const createdAt = new Date(Date.now() - app.daysAgo * DAY_MS);

    await prisma.application.create({
      data: {
        userId,
        company: app.company,
        role: app.role,
        status: app.status,
        sortOrder,
        createdAt,
        appliedAt: app.status === "wishlist" ? null : new Date(createdAt.getTime()),
        events: { create: { type: "created", toStatus: app.status, occurredAt: createdAt } },
      },
    });
  }
}


/** The instant that is `hour:minute` Europe/Berlin time, `daysAhead` days from today. */
function berlinTime(daysAhead: number, hour: number, minute: number): Date {
  const day = new Date(Date.now() + daysAhead * DAY_MS);
  const guess = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
  // Berlin's offset on that day (+1 or +2): format the UTC guess in Berlin and compare wall-clock hours
  const berlinHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(guess));
  const offsetHours = (berlinHour - hour + 24) % 24;
  return new Date(guess.getTime() - offsetHours * 3_600_000);
}

const daysAgo = (n: number, hour = 18) => {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, (n * 7) % 60, 0, 0);
  return d;
};
const utcDay = (n: number) => {
  const d = new Date(Date.now() - n * DAY_MS);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/** Bento Settings/Plan: an exam date ~5 months out (drives the countdown, pace and readiness). */
async function seedProfile(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.examTargetDate) return;
  await prisma.user.update({ where: { id: userId }, data: { examTargetDate: utcDay(-148), studyCapacityMinutes: 45 } });
}

/**
 * Journey progress like the design's demo: A1 stations 1–7 closed (every third item mastered), station 8 half done,
 * a few passed topics due for review, and the matching past route tasks ticked. Completions spread over 45 days.
 */
async function seedSyllabusProgress(userId: string): Promise<void> {
  const passedAlready = await prisma.syllabusItem.count({ where: { userId, masteryState: { in: ["passed", "mastered"] } } });
  if (passedAlready > 3) return;
  const items = await prisma.syllabusItem.findMany({
    where: { userId, level: "a1" },
    select: { id: true, level: true, theme: true, sortOrder: true, masteryState: true, skippedAt: true },
  });
  const stations = deriveStations(items as Parameters<typeof deriveStations>[0], "a1");
  const done = stations.slice(0, 7).flatMap((st) => st.itemIds);
  const half = stations[7] ? stations[7].itemIds.slice(0, Math.ceil(stations[7].itemIds.length / 2)) : [];
  const passed = [...done, ...half];
  for (const [i, id] of passed.entries()) {
    const completedAt = daysAgo(Math.max(1, 45 - Math.round((i / passed.length) * 44)));
    await prisma.syllabusItem.update({
      where: { id },
      data: {
        masteryState: i % 3 === 0 && i < done.length ? "mastered" : "passed",
        completedAt,
        lastAttemptAt: completedAt,
        successfulAttempts: i % 3 === 0 ? 2 : 1,
        // three topics come due today (Plan: "topic reviews that are due appear as tasks")
        reviewDueAt: i % 9 === 4 ? utcDay(0) : new Date(completedAt.getTime() + 21 * DAY_MS),
      },
    });
  }
  await prisma.roadmapTask.updateMany({
    where: { syllabusItemId: { in: passed }, day: { userId, date: { lt: utcDay(0) } }, completedAt: null },
    data: { completedAt: daysAgo(1) },
  });
}

/** Stats/Plan: checkpoint 1 score, a mock exam, and per-type self-test scores. */
/**
 * 20 gender-drill answers over the demo nouns, `misses` of them wrong, so Stats' Articles tile has real per-article
 * accuracy (it reads the answers, not the score). Misses land on "das" nouns first, the classic trap.
 */
async function drillAnswers(userId: string, misses: number): Promise<{ wordId: string; article: string; picked: string }[]> {
  const nouns = await prisma.word.findMany({ where: { userId, grammar: { startsWith: "d" } }, select: { id: true, grammar: true }, orderBy: { sortKey: "asc" } });
  const withArticle = nouns
    .map((n) => ({ wordId: n.id, article: n.grammar!.slice(0, 3) }))
    .filter((n) => n.article === "der" || n.article === "die" || n.article === "das");
  if (withArticle.length === 0) return [];
  const answers = Array.from({ length: 20 }, (_, i) => withArticle[i % withArticle.length]!);
  const order = [...answers.keys()].sort((a, b) => Number(answers[b]!.article === "das") - Number(answers[a]!.article === "das"));
  const wrong = new Set(order.slice(0, misses));
  return answers.map((a, i) => ({ ...a, picked: wrong.has(i) ? (a.article === "der" ? "die" : "der") : a.article }));
}

async function seedTests(userId: string): Promise<void> {
  if ((await prisma.selfTestResult.count({ where: { userId } })) > 0) return;
  await prisma.selfTestResult.createMany({
    data: [
      { userId, kind: "checkpoint", checkpointIndex: 1, level: "a1", score: 16, total: 20, takenAt: daysAgo(5) },
      { userId, kind: "mixed", level: "a1", score: 8, total: 10, takenAt: daysAgo(12) },
      { userId, kind: "mixed", level: "a1", score: 9, total: 10, takenAt: daysAgo(3) },
      { userId, kind: "gender_drill", level: "a1", score: 17, total: 20, takenAt: daysAgo(8), answers: await drillAnswers(userId, 3) },
      { userId, kind: "gender_drill", level: "a1", score: 19, total: 20, takenAt: daysAgo(2), answers: await drillAnswers(userId, 1) },
      { userId, kind: "listen_type", level: "a1", score: 7, total: 10, takenAt: daysAgo(4) },
    ],
  });
  await prisma.examAttempt.create({
    data: { userId, level: "a1", mode: "mock", startedAt: daysAgo(6, 17), submittedAt: daysAgo(6), score: 15, total: 20, passed: false },
  });
}

const DEMO_NOTES: { title: string; body: string; category: "grammar" | "mistakes" | "everyday" | "jobs" | "listening"; pinned?: boolean; station?: number; app?: string; word?: string }[] = [
  { title: "Dativ nach mit, nach, bei", body: "<p><strong>mit, nach, bei, seit, von, zu, aus</strong> always take the Dativ.</p><ul><li><p>mit <em>dem</em> Bus</p></li><li><p>nach <em>der</em> Arbeit</p></li></ul>", category: "grammar", pinned: true, station: 7 },
  { title: "Verb goes second", body: "<p>Heute <strong>gehe</strong> ich ins Kino. Not: Heute ich gehe…</p>", category: "mistakes", pinned: true },
  { title: "die Werkstatt", body: "<p>-statt words are feminine: die Werkstatt, die Stätte.</p>", category: "mistakes" },
  { title: "Bäckerei small talk", body: "<p>Ich hätte gern zwei Brötchen, bitte. — Sonst noch etwas? — Nein, danke, das ist alles.</p>", category: "everyday" },
  { title: "Interview: Pflege", body: "<p>Warum möchten Sie in der Pflege arbeiten? Prepare 3 sentences about motivation.</p>", category: "jobs", app: "Rheinland Pflege gGmbH" },
  { title: "Easy German #412", body: "<p>Heard <em>eigentlich</em> five times: softens a statement, like “actually”.</p>", category: "listening" },
  { title: "Termin vereinbaren", body: "<p>Termin <strong>vereinbaren</strong>, not machen, in formal emails.</p>", category: "everyday", word: "termin" },
];

/** Notes sticky wall: every category, two pinned, grammar/mistakes in the "Surfaced today" rotation. */
async function seedNotes(userId: string): Promise<void> {
  if ((await prisma.note.count({ where: { userId } })) > 0) return;
  const items = await prisma.syllabusItem.findMany({ where: { userId, level: "a1" }, select: { id: true, level: true, theme: true, sortOrder: true, masteryState: true, skippedAt: true } });
  const stations = deriveStations(items as Parameters<typeof deriveStations>[0], "a1");
  for (const [i, n] of DEMO_NOTES.entries()) {
    const app = n.app ? await prisma.application.findFirst({ where: { userId, company: n.app }, select: { id: true } }) : null;
    const word = n.word ? await prisma.word.findFirst({ where: { userId, sortKey: n.word }, select: { id: true } }) : null;
    const rotating = n.category === "grammar" || n.category === "mistakes";
    await prisma.note.create({
      data: {
        userId,
        title: n.title || null,
        body: n.body,
        category: n.category,
        pinned: n.pinned ?? false,
        stationKey: n.station ? (stations[n.station - 1]?.key ?? null) : null,
        applicationId: app?.id ?? null,
        wordId: word?.id ?? null,
        resurfaceDueAt: rotating ? utcDay(0) : null,
        resurfaceStep: rotating ? 1 : 0,
        createdAt: daysAgo(2 + i * 4),
      },
    });
  }
}

/** Plan library: three sources with progress, linked to stations, with a few +1 taps. */
async function seedSources(userId: string): Promise<void> {
  if ((await prisma.studySource.count({ where: { userId } })) > 0) return;
  const items = await prisma.syllabusItem.findMany({ where: { userId, level: "a1" }, select: { id: true, level: true, theme: true, sortOrder: true, masteryState: true, skippedAt: true } });
  const stations = deriveStations(items as Parameters<typeof deriveStations>[0], "a1");
  const sources = [
    { type: "youtube" as const, provider: "Easy German", title: "Easy German — Super Easy", url: "https://www.youtube.com/@EasyGerman", totalUnits: 40, completedUnits: 14, unitLabel: "episodes" as const, station: 8 },
    { type: "book" as const, provider: "Hueber", title: "Menschen A1.1 Kursbuch", url: null, totalUnits: 12, completedUnits: 7, unitLabel: "chapters" as const, station: 7 },
    { type: "course" as const, provider: "Deutsche Welle", title: "Nicos Weg A1", url: "https://learngerman.dw.com/de/nicos-weg/c-36519687", totalUnits: 76, completedUnits: 31, unitLabel: "lessons" as const, station: 6 },
  ];
  for (const [i, src] of sources.entries()) {
    const { station, ...data } = src;
    await prisma.studySource.create({
      data: {
        userId,
        ...data,
        level: "a1",
        stationKey: stations[station - 1]?.key ?? null,
        createdAt: daysAgo(40 - i * 6),
        logs: { create: Array.from({ length: 5 }, (_, j) => ({ delta: 1, loggedAt: daysAgo(1 + j * 3 + i) })) },
      },
    });
  }
}

/** Jobs: asked-for German levels, a dated upcoming interview, and phrases on it. */
async function seedJobDetails(userId: string): Promise<void> {
  const apps = await prisma.application.findMany({ where: { userId }, select: { id: true, company: true, germanLevel: true } });
  if (apps.some((a) => a.germanLevel)) return;
  const levels: Record<string, "a2" | "b1" | "b2"> = {
    "Nordwind Logistik GmbH": "a2",
    "Muster GmbH": "b2",
    "Süddeutsche Handwerk KG": "b1",
    "Rheinland Pflege gGmbH": "b1",
    "Beispielstadt Verwaltung": "b2",
  };
  for (const app of apps) {
    const lvl = levels[app.company];
    if (lvl) await prisma.application.update({ where: { id: app.id }, data: { germanLevel: lvl, location: app.company.startsWith("Rheinland") ? "Köln" : null } });
    if (app.company === "Rheinland Pflege gGmbH") {
      // 10:30 in Köln, where the interview is. setHours() would use the server's zone, and prod runs in UTC.
      const at = berlinTime(4, 10, 30);
      await prisma.applicationEvent.createMany({
        data: [
          { applicationId: app.id, type: "status_change", fromStatus: "applied", toStatus: "interview", occurredAt: daysAgo(3) },
          { applicationId: app.id, type: "interview", note: "Vorstellungsgespräch vor Ort, Pflegedienstleitung", occurredAt: at },
        ],
      });
      await prisma.applicationPhrase.createMany({
        data: [
          { applicationId: app.id, text: "Ich arbeite gern mit Menschen und möchte Verantwortung übernehmen." },
          { applicationId: app.id, text: "Könnten Sie mir den Ablauf der Ausbildung kurz erklären?" },
        ],
      });
    }
  }
}

/** Lernzeit + streak heatmap: rolled-up minutes for the past ~10 weeks (19-day current streak), and today's pings. */
async function seedActivity(userId: string): Promise<void> {
  if ((await prisma.dailyActiveMinutes.count({ where: { userId } })) > 0) return;
  const rows = [];
  for (let n = 1; n <= 70; n++) {
    // a gap on day 20 ends the previous run; weekends are lighter
    if (n === 20 || (n > 20 && n % 6 === 0)) continue;
    const learning = 15 + ((n * 37) % 40);
    rows.push({ userId, date: utcDay(n), minutes: learning + 10, learningMinutes: learning });
  }
  await prisma.dailyActiveMinutes.createMany({ data: rows });
  const now = Date.now();
  await prisma.activityPing.createMany({
    data: Array.from({ length: 22 }, (_, i) => ({ userId, pingedAt: new Date(now - (40 - i) * 60_000), learning: true })),
  });
}

async function main() {
  // --reset: delete the demo account first (every relation cascades), so seed changes reach an already-seeded demo.
  // The steps below only fill empty tables, so without it an existing demo keeps its old data.
  if (process.argv.includes("--reset")) {
    const deleted = await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
    console.log(`--reset: removed ${deleted.count} demo account`);
  }
  const user = await seedUser();

  await ensureSyllabusSeeded(user.id);
  await seedRoadmap(user.id);
  await seedWords(user.id);
  await seedReviewLogs(user.id);
  await seedApplications(user.id);
  // Bento features (plan Phase 5): each step guards itself, so re-running is safe
  await seedProfile(user.id);
  await seedSyllabusProgress(user.id);
  await seedTests(user.id);
  await seedJobDetails(user.id);
  await seedNotes(user.id);
  await seedSources(user.id);
  await seedActivity(user.id);

  console.log(`Demo account ready: ${DEMO_EMAIL} (id ${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

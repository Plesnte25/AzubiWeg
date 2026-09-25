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
 * inserting. Run with `npm run seed:demo`.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { CefrLevel, Grade, Themenfeld } from "@prisma/client";
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

const DEMO_WORDS: {
  headword: string;
  meaning: string;
  example: string;
  themenfeld: Themenfeld[];
  level: CefrLevel;
  state: "due" | "new" | "mastered";
}[] = [
  { headword: "Haus", meaning: "house", example: "Das Haus ist groß.", themenfeld: ["alltag_zuhause"], level: "a1", state: "mastered" },
  { headword: "Familie", meaning: "family", example: "Meine Familie wohnt in Berlin.", themenfeld: ["person_familie"], level: "a1", state: "mastered" },
  { headword: "arbeiten", meaning: "to work", example: "Ich arbeite jeden Tag.", themenfeld: ["arbeit_ausbildung"], level: "a1", state: "mastered" },
  { headword: "Ausbildung", meaning: "vocational training", example: "Sie macht eine Ausbildung als Krankenschwester.", themenfeld: ["arbeit_ausbildung", "bildung"], level: "a1", state: "mastered" },
  { headword: "essen", meaning: "to eat", example: "Wir essen um sechs Uhr.", themenfeld: ["essen_einkaufen"], level: "a1", state: "mastered" },
  { headword: "trinken", meaning: "to drink", example: "Er trinkt gern Kaffee.", themenfeld: ["essen_einkaufen"], level: "a1", state: "mastered" },
  { headword: "Schule", meaning: "school", example: "Die Schule beginnt um acht Uhr.", themenfeld: ["bildung"], level: "a1", state: "mastered" },
  { headword: "gesund", meaning: "healthy", example: "Obst ist gesund.", themenfeld: ["gesundheit"], level: "a1", state: "mastered" },
  { headword: "Bahnhof", meaning: "train station", example: "Der Bahnhof ist nicht weit.", themenfeld: ["reise_verkehr"], level: "a1", state: "due" },
  { headword: "Wochenende", meaning: "weekend", example: "Was machst du am Wochenende?", themenfeld: ["freizeit_kultur"], level: "a1", state: "due" },
  { headword: "Handy", meaning: "mobile phone", example: "Mein Handy ist kaputt.", themenfeld: ["medien_technik"], level: "a1", state: "due" },
  { headword: "Geld", meaning: "money", example: "Ich habe kein Geld dabei.", themenfeld: ["geld"], level: "a1", state: "due" },
  { headword: "Termin", meaning: "appointment", example: "Ich habe einen Termin beim Amt.", themenfeld: ["amt_buerokratie"], level: "a2", state: "due" },
  { headword: "Meinung", meaning: "opinion", example: "Was ist deine Meinung dazu?", themenfeld: ["gefuehle_meinung"], level: "a2", state: "due" },
  { headword: "Umwelt", meaning: "environment", example: "Wir müssen die Umwelt schützen.", themenfeld: ["natur_umwelt"], level: "a2", state: "due" },
  { headword: "Gesellschaft", meaning: "society", example: "Das ist ein Problem für die ganze Gesellschaft.", themenfeld: ["gesellschaft"], level: "a2", state: "due" },
  { headword: "beantragen", meaning: "to apply for (officially)", example: "Ich möchte ein Visum beantragen.", themenfeld: ["amt_buerokratie"], level: "a2", state: "new" },
  { headword: "Bewerbung", meaning: "job application", example: "Ich schreibe eine Bewerbung.", themenfeld: ["arbeit_ausbildung"], level: "a2", state: "new" },
  { headword: "Vorstellungsgespräch", meaning: "job interview", example: "Das Vorstellungsgespräch war erfolgreich.", themenfeld: ["arbeit_ausbildung"], level: "a2", state: "new" },
  { headword: "Versicherung", meaning: "insurance", example: "Brauche ich eine Versicherung?", themenfeld: ["gesundheit", "amt_buerokratie"], level: "a2", state: "new" },
  { headword: "Miete", meaning: "rent", example: "Die Miete ist im August fällig.", themenfeld: ["alltag_zuhause", "geld"], level: "a2", state: "new" },
  { headword: "Kollege", meaning: "colleague", example: "Mein Kollege hilft mir gern.", themenfeld: ["arbeit_ausbildung"], level: "a1", state: "new" },
  { headword: "pünktlich", meaning: "punctual", example: "Sei bitte pünktlich!", themenfeld: ["alltag_zuhause"], level: "a1", state: "new" },
  { headword: "Prüfung", meaning: "exam", example: "Die Prüfung ist nächste Woche.", themenfeld: ["bildung"], level: "a2", state: "new" },
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
        example: w.example,
        themenfeld: w.themenfeld,
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
async function seedTests(userId: string): Promise<void> {
  if ((await prisma.selfTestResult.count({ where: { userId } })) > 0) return;
  await prisma.selfTestResult.createMany({
    data: [
      { userId, kind: "checkpoint", checkpointIndex: 1, level: "a1", score: 16, total: 20, takenAt: daysAgo(5) },
      { userId, kind: "mixed", level: "a1", score: 8, total: 10, takenAt: daysAgo(12) },
      { userId, kind: "mixed", level: "a1", score: 9, total: 10, takenAt: daysAgo(3) },
      { userId, kind: "gender_drill", level: "a1", score: 17, total: 20, takenAt: daysAgo(8) },
      { userId, kind: "gender_drill", level: "a1", score: 19, total: 20, takenAt: daysAgo(2) },
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
  { title: "", body: "<p>Termin <strong>vereinbaren</strong>, not machen, in formal emails.</p>", category: "everyday", word: "termin" },
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
      const at = new Date(Date.now() + 4 * DAY_MS);
      at.setHours(10, 30, 0, 0);
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

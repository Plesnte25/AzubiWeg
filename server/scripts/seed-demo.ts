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
import { ensureChecklistSeeded } from "../src/services/checklist/seed.js";
import { ensureSyllabusSeeded } from "../src/services/learning/syllabus-seed.js";
import { ensureSavedLinksSeeded } from "../src/services/learning/saved-links-seed.js";

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

async function main() {
  const user = await seedUser();

  await ensureChecklistSeeded(user.id);
  await ensureSyllabusSeeded(user.id);
  await ensureSavedLinksSeeded(user.id);
  await seedRoadmap(user.id);
  await seedWords(user.id);
  await seedReviewLogs(user.id);
  await seedApplications(user.id);

  console.log(`Demo account ready: ${DEMO_EMAIL} (id ${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

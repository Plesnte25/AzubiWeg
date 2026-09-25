/**
 * One-off data migration for the Bento Notes wall (plan Phase 2 / run on production in Phase 5).
 *
 * 1. Existing notes get their initial sticky-wall category (initialNoteCategory), and Grammar/Mistakes notes join the
 *    "Surfaced today" rotation, due today.
 * 2. DailyJournal rows become notes (the daily journal is cut from the Plan page): title "Journal · <date>", the three
 *    prompts as the body, contextTag "Journal", created at the journal's own timestamp.
 * 3. RoadmapTask.journalEntry values become notes linked to their task, contextTag "Task journal".
 *
 * Dry-run by default: prints what it would do. Idempotent — re-running skips journals already converted (matched by
 * contextTag + original timestamp / task id) and only recategorises notes still on the default "everyday".
 * The DailyJournal table and journalEntry column are left in place; a later cleanup migration drops them.
 *
 *   npm run migrate:notes-bento              # dry run
 *   npm run migrate:notes-bento -- --apply
 */
import "dotenv/config";
import type { NoteCategory, Prisma } from "@prisma/client";
import { prisma } from "../src/db.js";
import { initialNoteCategory } from "../src/services/notes/category.js";
import { dayPlus, RESURFACING_CATEGORIES } from "../src/services/notes/resurface.js";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain journal text → the TipTap-style HTML note bodies are stored as. */
function paragraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function journalBody(j: { learned: string | null; difficult: string | null; nextStep: string | null }): string {
  return (
    [
      ["Learned", j.learned],
      ["Difficult", j.difficult],
      ["Next step", j.nextStep],
    ] as const
  )
    .filter(([, v]) => v?.trim())
    .map(([label, v]) => `<p><strong>${label}:</strong> ${escapeHtml(v!.trim()).replace(/\n+/g, "<br>")}</p>`)
    .join("");
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const today = dayPlus(new Date(), 0);
  console.log(apply ? "APPLYING changes." : "Dry run (pass --apply to write).");

  // 1. categories + resurfacing for existing notes
  const notes = await prisma.note.findMany({
    where: { category: "everyday" },
    select: { id: true, title: true, skill: true, contextTag: true, applicationId: true, resurfaceDueAt: true },
  });
  const recategorise: { id: string; title: string | null; category: NoteCategory }[] = [];
  for (const n of notes) {
    const category = initialNoteCategory(n);
    if (category !== "everyday") recategorise.push({ id: n.id, title: n.title, category });
  }
  const byCategory = recategorise.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {});
  console.log(`\n[1] ${recategorise.length} of ${notes.length} "everyday" notes recategorised:`, byCategory);
  for (const r of recategorise.slice(0, 10)) console.log(`    ${r.category.padEnd(9)} ${r.title ?? "(untitled)"}`);

  const rotatingUnscheduled = await prisma.note.count({
    where: { category: { in: [...RESURFACING_CATEGORIES] }, resurfaceDueAt: null },
  });
  const rotatingAfter = rotatingUnscheduled + recategorise.filter((r) => RESURFACING_CATEGORIES.has(r.category)).length;
  console.log(`    ${rotatingAfter} Grammar/Mistakes notes join "Surfaced today", due ${today.toISOString().slice(0, 10)}`);

  // 2. daily journals
  const journals = await prisma.dailyJournal.findMany({ orderBy: { date: "asc" } });
  const journalNotes: Prisma.NoteCreateManyInput[] = [];
  for (const j of journals) {
    const body = journalBody(j);
    if (!body) continue;
    const exists = await prisma.note.findFirst({
      where: { userId: j.userId, contextTag: "Journal", createdAt: j.createdAt },
      select: { id: true },
    });
    if (exists) continue;
    journalNotes.push({
      userId: j.userId,
      title: `Journal · ${j.date.toISOString().slice(0, 10)}`,
      body,
      contextTag: "Journal",
      category: "everyday" as const,
      createdAt: j.createdAt,
    });
  }
  console.log(`\n[2] ${journalNotes.length} of ${journals.length} daily journals to convert`);
  for (const n of journalNotes.slice(0, 5)) console.log(`    ${n.title}`);

  // 3. task journal entries
  const tasks = await prisma.roadmapTask.findMany({
    where: { journalEntry: { not: null } },
    select: { id: true, title: true, skill: true, journalEntry: true, day: { select: { userId: true, date: true } } },
  });
  const taskNotes: (Prisma.NoteCreateManyInput & { category: NoteCategory })[] = [];
  for (const t of tasks) {
    const body = paragraphs(t.journalEntry ?? "");
    if (!body) continue;
    const exists = await prisma.note.findFirst({ where: { roadmapTaskId: t.id, contextTag: "Task journal" }, select: { id: true } });
    if (exists) continue;
    const category = initialNoteCategory({ skill: t.skill, contextTag: null, applicationId: null });
    taskNotes.push({
      userId: t.day.userId,
      title: t.title,
      body,
      skill: t.skill,
      roadmapTaskId: t.id,
      contextTag: "Task journal",
      category,
      // noon UTC on the task's day: the note sorts with that day in every timezone
      createdAt: new Date(t.day.date.getTime() + 12 * 3_600_000),
      ...(RESURFACING_CATEGORIES.has(category) ? { resurfaceDueAt: today, resurfaceStep: 0 } : {}),
    });
  }
  console.log(`\n[3] ${taskNotes.length} of ${tasks.length} task journal entries to convert`);
  for (const n of taskNotes.slice(0, 5)) console.log(`    ${n.category.padEnd(9)} ${n.title}`);

  if (!apply) {
    console.log("\nDry run complete. Nothing was written.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const r of recategorise) await tx.note.update({ where: { id: r.id }, data: { category: r.category } });
    await tx.note.updateMany({
      where: { category: { in: [...RESURFACING_CATEGORIES] }, resurfaceDueAt: null },
      data: { resurfaceDueAt: today, resurfaceStep: 0 },
    });
    if (journalNotes.length) await tx.note.createMany({ data: journalNotes });
    if (taskNotes.length) await tx.note.createMany({ data: taskNotes });
  });
  console.log("\nApplied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

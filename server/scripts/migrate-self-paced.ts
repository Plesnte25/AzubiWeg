/**
 * One-time move to the self-paced queue (ROADMAP_VERSION 7, plans/self-paced-queue.md). The server also does this
 * lazily per user on their next Today/Plan visit; this script lets you see it first and run it explicitly.
 *
 *   npx tsx scripts/migrate-self-paced.ts            dry run: per user, what's kept (and why) and what's deleted
 *   npx tsx scripts/migrate-self-paced.ts --apply    run it
 *
 * Kept: completed tasks, tasks with time/journal/files/notes, and tasks the user added themselves. Deleted: untouched
 * tasks the old calendar generated (syllabus work comes back from the queue). Syllabus progress isn't touched.
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { selfPacedCleanupFor, upgradeToSelfPaced } from "../src/routes/roadmap.js";
import { ROADMAP_VERSION } from "../src/services/learning/roadmap-defaults.js";

const apply = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({
    where: { roadmapStartedAt: { not: null }, roadmapVersion: { lt: ROADMAP_VERSION } },
    select: { id: true, email: true, roadmapVersion: true },
  });
  console.log(`${users.length} user(s) on the old calendar${apply ? "" : " (dry run — pass --apply to write)"}\n`);

  for (const user of users) {
    const { tasks, plan } = await selfPacedCleanupFor(prisma, user.id);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const counts = plan.keep.reduce<Record<string, number>>((acc, k) => ((acc[k.reason] = (acc[k.reason] ?? 0) + 1), acc), {});
    console.log(`${user.email}: ${tasks.length} tasks → keep ${plan.keep.length} ${JSON.stringify(counts)}, delete ${plan.delete.length}`);
    for (const k of plan.keep.filter((k) => k.reason !== "completed")) {
      const t = byId.get(k.id)!;
      console.log(`  keep (${k.reason}) ${t.day.date.toISOString().slice(0, 10)} ${t.completedAt ? "✓" : "·"} ${t.title}`);
    }
    if (apply) {
      await upgradeToSelfPaced(user.id, user.roadmapVersion);
      console.log("  applied");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeRetention, computeReviewAccuracy, computeReviewStats, computeWeakWords } from "../services/reviews/history.js";
import { schedule } from "../services/srs.js";
import { isShaky, strength, withComputedFields } from "../services/vocab/classify.js";
import { lastGrades } from "./words.js";
import { formatSrLine, parseSrLine, type SrState } from "../services/vault/format.js";
import { vaultSync } from "../services/vault/sync.js";

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

reviewsRouter.get("/history", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const logs = await prisma.reviewLog.findMany({
    where: { word: { userId: req.userId } },
    orderBy: { reviewedAt: "desc" },
    take: limit,
    include: { word: { select: { headword: true } } },
  });
  res.json({
    entries: logs.map((l) => ({
      id: l.id,
      wordId: l.wordId,
      headword: l.word.headword,
      grade: l.grade,
      reviewedAt: l.reviewedAt,
      intervalAfter: l.intervalAfter,
    })),
  });
});

reviewsRouter.get("/weak-words", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  // meaning: { not: null } -- a word whose meaning has since gone blank (curation flipped to review/unresolved, or a
  // manual edit cleared it) isn't reachable via the real review queue any more; surfacing it here as "weak, go
  // review it" would point at a word that can't be reviewed right now. Same exclusion /queue already applies.
  const where = { userId: req.userId, meaning: { not: null } };
  const [words, logs] = await Promise.all([
    prisma.word.findMany({ where, select: { id: true, headword: true, srInterval: true, leech: true } }),
    prisma.reviewLog.findMany({ where: { word: where }, select: { wordId: true, grade: true, reviewedAt: true } }),
  ]);
  const headwords = new Map(words.map((w) => [w.id, w.headword]));
  res.json({
    words: computeWeakWords(
      words.map((w) => ({ wordId: w.id, headword: w.headword, srInterval: w.srInterval, leech: w.leech })),
      logs.map((l) => ({ ...l, headword: headwords.get(l.wordId) ?? "" })),
      limit,
    ),
  });
});

reviewsRouter.get("/stats", async (req, res) => {
  const logs = await prisma.reviewLog.findMany({
    where: { word: { userId: req.userId } },
    select: { wordId: true, grade: true, reviewedAt: true, intervalAfter: true },
  });
  const now = new Date();
  res.json({ ...computeReviewStats(logs, now), accuracy: computeReviewAccuracy(logs, now), retention: computeRetention(logs) });
});

/** How many not-yet-due shaky words a session tacks on after the due and new cards. */
const SHAKY_EXTRA = 10;

reviewsRouter.get("/queue", async (req, res) => {
  // Settings → New words a day, minus the words already introduced today (first-ever review today)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [user, todaysLogs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { newWordsPerDay: true } }),
    prisma.reviewLog.findMany({ where: { word: { userId: req.userId }, reviewedAt: { gte: startOfToday } }, distinct: ["wordId"], select: { wordId: true } }),
  ]);
  const reviewedBefore = await prisma.reviewLog.findMany({
    where: { wordId: { in: todaysLogs.map((l) => l.wordId) }, reviewedAt: { lt: startOfToday } },
    distinct: ["wordId"],
    select: { wordId: true },
  });
  const introducedToday = todaysLogs.length - reviewedBefore.length;
  const newLimit = Math.max(0, user.newWordsPerDay - introducedToday);
  // meaning: { not: null } -- a word without a usable meaning yet
  // (transient-failure placeholder, or the new "unresolved" outcome) isn't
  // learnable; same condition self-test quiz generation already applies
  // (routes/learning.ts). Independent of curation: a published_review word
  // with a real meaning stays eligible, a blank protected/incomplete one
  // doesn't.
  const [due, fresh, scheduled, grades] = await Promise.all([
    prisma.word.findMany({
      where: { userId: req.userId, srDue: { lte: endOfToday() }, meaning: { not: null } },
      orderBy: { srDue: "asc" },
    }),
    prisma.word.findMany({
      where: { userId: req.userId, srDue: null, meaning: { not: null } },
      orderBy: { createdAt: "asc" },
      take: newLimit,
    }),
    prisma.word.findMany({
      where: { userId: req.userId, srDue: { gt: endOfToday() }, meaning: { not: null } },
      orderBy: { srDue: "asc" },
    }),
    lastGrades(req.userId),
  ]);
  // Review handoff: the session is due first, then today's new words, then shaky words that aren't due yet
  // (strength 1–2, the app-wide rule) as extra practice
  const shaky = scheduled.filter((w) => isShaky(strength(w, grades.get(w.id) ?? null))).slice(0, SHAKY_EXTRA);
  res.json({ due: due.map(withComputedFields), fresh: fresh.map(withComputedFields), shaky: shaky.map(withComputedFields) });
});

function previousScheduleFor(word: { srDue: Date | null; srInterval: number | null; srEase: number | null }) {
  return word.srDue && word.srInterval !== null && word.srEase !== null
    ? { interval: word.srInterval, ease: word.srEase, due: word.srDue }
    : null;
}

// Real-data preview of what each grade button would actually do to this
// card's schedule (the handoff's Review-session grade row shows a resulting
// interval per button, e.g. "2 days") -- read-only, calls the same pure
// schedule() the real grade POST below uses, so there's no second scheduling
// implementation to drift out of sync.
reviewsRouter.get("/:wordId/preview", async (req, res) => {
  const word = await prisma.word.findFirst({ where: { id: req.params.wordId, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const previous = previousScheduleFor(word);
  res.json({
    again: schedule("again", previous),
    hard: schedule("hard", previous),
    good: schedule("good", previous),
    easy: schedule("easy", previous),
  });
});

const gradeSchema = z.object({ grade: z.enum(["again", "hard", "good", "easy"]) });

/** Writes a card's schedule (or clears it, for a card going back to new) — through the vault when one is linked
 * (reconcile mirrors it to the DB), else straight to the Word row. Shared by grading and undo. */
async function writeSchedule(
  user: { id: string; vaultPath: string | null },
  word: { id: string; sortKey: string; rawBlock: string },
  sr: SrState | null,
) {
  if (user.vaultPath) {
    await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
      cards.map((c) =>
        c.sortKey === word.sortKey ? { ...c, sr: sr ? parseSrLine(formatSrLine(sr)) : null, srLines: sr ? [formatSrLine(sr)] : [] } : c,
      ),
    );
    return;
  }
  const cardLine = word.rawBlock.split("\n")[0]! + "\n";
  await prisma.word.update({
    where: { id: word.id },
    data: sr
      ? { srDue: new Date(sr.due), srInterval: sr.interval, srEase: sr.ease, rawBlock: cardLine + formatSrLine(sr) }
      : { srDue: null, srInterval: null, srEase: null, rawBlock: cardLine },
  });
}

/**
 * Undo (review session "Z" / the undo button): reverts the word's most recent grade — restores the schedule it had
 * before (or clears it, if it was new) and deletes that review log. Only the latest grade per word can be undone.
 */
reviewsRouter.post("/:wordId/undo", async (req, res) => {
  const word = await prisma.word.findFirst({ where: { id: req.params.wordId, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });
  const last = await prisma.reviewLog.findFirst({ where: { wordId: word.id }, orderBy: { reviewedAt: "desc" } });
  if (!last) return res.status(409).json({ error: "Nothing to undo for this word" });

  const restored: SrState | null =
    last.prevDue && last.prevInterval !== null && last.prevEase !== null
      ? { due: last.prevDue.toISOString().slice(0, 10), interval: last.prevInterval, ease: last.prevEase }
      : null;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  await writeSchedule(user, word, restored);
  await prisma.reviewLog.delete({ where: { id: last.id } });
  res.json({
    word: withComputedFields(await prisma.word.findUniqueOrThrow({ where: { id: word.id } })),
  });
});

reviewsRouter.post("/:wordId", async (req, res) => {
  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { grade } = parsed.data;

  const word = await prisma.word.findFirst({
    where: { id: req.params.wordId, userId: req.userId },
  });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const previous = previousScheduleFor(word);
  const next = schedule(grade, previous);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  await writeSchedule(user, word, next);
  // leech is app-only state (see schema.prisma) — clearing it on a good
  // grade never touches the vault, regardless of user.vaultPath above.
  if (grade === "easy" && word.leech) {
    await prisma.word.update({ where: { id: word.id }, data: { leech: false } });
  }

  await prisma.reviewLog.create({
    data: {
      wordId: word.id,
      grade,
      intervalAfter: next.interval,
      prevDue: previous?.due ?? null,
      prevInterval: previous?.interval ?? null,
      prevEase: previous?.ease ?? null,
    },
  });

  res.json({
    next,
    word: withComputedFields(
      await prisma.word.findUniqueOrThrow({
        where: { userId_sortKey: { userId: req.userId, sortKey: word.sortKey } },
      }),
    ),
  });
});

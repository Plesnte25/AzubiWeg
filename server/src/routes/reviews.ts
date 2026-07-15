import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { schedule } from "../services/srs.js";
import { formatSrLine, parseSrLine } from "../services/vault/format.js";
import { vaultSync } from "../services/vault/sync.js";

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

reviewsRouter.get("/queue", async (req, res) => {
  const newLimit = Math.min(Number(req.query.newLimit ?? 10), 50);
  const [due, fresh] = await Promise.all([
    prisma.word.findMany({
      where: { userId: req.userId, srDue: { lte: endOfToday() } },
      orderBy: { srDue: "asc" },
    }),
    prisma.word.findMany({
      where: { userId: req.userId, srDue: null },
      orderBy: { createdAt: "asc" },
      take: newLimit,
    }),
  ]);
  res.json({ due, fresh });
});

const gradeSchema = z.object({ grade: z.enum(["hard", "good", "easy"]) });

reviewsRouter.post("/:wordId", async (req, res) => {
  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { grade } = parsed.data;

  const word = await prisma.word.findFirst({
    where: { id: req.params.wordId, userId: req.userId },
  });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const previous =
    word.srDue && word.srInterval !== null && word.srEase !== null
      ? { interval: word.srInterval, ease: word.srEase, due: word.srDue }
      : null;
  const next = schedule(grade, previous);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (user.vaultPath) {
    // write the new SR comment into master.md; reconcile mirrors it to the DB
    await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
      cards.map((c) =>
        c.sortKey === word.sortKey
          ? { ...c, sr: parseSrLine(formatSrLine(next)), srLines: [formatSrLine(next)] }
          : c,
      ),
    );
  } else {
    const cardLine = word.rawBlock.split("\n")[0]! + "\n";
    await prisma.word.update({
      where: { id: word.id },
      data: {
        srDue: new Date(next.due),
        srInterval: next.interval,
        srEase: next.ease,
        rawBlock: cardLine + formatSrLine(next),
      },
    });
  }

  await prisma.reviewLog.create({
    data: { wordId: word.id, grade, intervalAfter: next.interval },
  });

  res.json({
    next,
    word: await prisma.word.findUnique({
      where: { userId_sortKey: { userId: req.userId, sortKey: word.sortKey } },
    }),
  });
});

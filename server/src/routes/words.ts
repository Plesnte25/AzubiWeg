import { existsSync } from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BATCH_DELAY_MS, delay, enrichWord } from "../services/enrichment/index.js";
import { formatCardLine } from "../services/vault/format.js";
import { appAudioDir, cardFromBlock, makeCard, vaultFiles, vaultSync } from "../services/vault/sync.js";

export const wordsRouter = Router();
wordsRouter.use(requireAuth);

const listQuerySchema = z.object({
  search: z.string().optional(),
  lesson: z.string().optional(),
  letter: z.string().length(1).optional(),
  due: z.coerce.boolean().optional(),
});

wordsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { search, lesson, letter, due } = parsed.data;

  const words = await prisma.word.findMany({
    where: {
      userId: req.userId,
      ...(search
        ? {
            OR: [
              { headword: { contains: search, mode: "insensitive" } },
              { meaning: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(lesson ? { lesson } : {}),
      ...(letter ? { sortKey: { startsWith: letter.toLowerCase() } } : {}),
      ...(due ? { srDue: { lte: new Date() } } : {}),
    },
    orderBy: { sortKey: "asc" },
  });
  res.json({ words });
});

wordsRouter.get("/meta", async (req, res) => {
  const lessons = await prisma.word.groupBy({
    by: ["lesson"],
    where: { userId: req.userId, lesson: { not: null } },
    _count: true,
    orderBy: { lesson: "asc" },
  });
  res.json({
    lessons: lessons.map((l) => ({ lesson: l.lesson, count: l._count })),
  });
});

const addSchema = z.object({
  words: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
  lesson: z
    .string()
    .regex(/^[\w-]+$/)
    .nullish(),
});

wordsRouter.post("/", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { words, lesson } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const audioDir = user.vaultPath ? vaultFiles(user.vaultPath).audioDir : appAudioDir(user.id);

  const added: unknown[] = [];
  for (const [i, word] of words.entries()) {
    let sortKey: string;
    if (user.vaultPath) {
      // resolution + lemma merging + typed-form dedupe all live in the
      // vault sync service (same behavior as the Python script)
      const result = await vaultSync.enrichIntoVault(user.id, user.vaultPath, word, lesson ?? null);
      sortKey = result.headword.toLowerCase();
    } else {
      const { found: _found, headword, typed: _typed, ...fields } =
        await enrichWord(word, audioDir, lesson ?? null);
      const card = makeCard(headword, fields, null);
      sortKey = card.sortKey;
      await prisma.word.upsert({
        where: { userId_sortKey: { userId: user.id, sortKey: card.sortKey } },
        create: {
          userId: user.id,
          headword,
          sortKey: card.sortKey,
          ...fields,
          rawBlock: card.cardLine,
        },
        update: { ...fields, rawBlock: card.cardLine, srDue: null, srInterval: null, srEase: null },
      });
      if (word.toLowerCase() !== card.sortKey) {
        await prisma.word.deleteMany({ where: { userId: user.id, sortKey: word.toLowerCase() } });
      }
    }
    added.push(
      await prisma.word.findUnique({
        where: { userId_sortKey: { userId: user.id, sortKey } },
      }),
    );
    if (i < words.length - 1) await delay(BATCH_DELAY_MS);
  }
  res.status(201).json({ words: added });
});

const patchSchema = z.object({
  meaning: z.string().nullish(),
  ipa: z.string().nullish(),
  grammar: z.string().nullish(),
  form: z.string().nullish(),
  example: z.string().nullish(),
  lesson: z
    .string()
    .regex(/^[\w-]+$/)
    .nullish(),
});

wordsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });

  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const fields = {
    meaning: parsed.data.meaning !== undefined ? parsed.data.meaning : word.meaning,
    ipa: parsed.data.ipa !== undefined ? parsed.data.ipa : word.ipa,
    grammar: parsed.data.grammar !== undefined ? parsed.data.grammar : word.grammar,
    form: parsed.data.form !== undefined ? parsed.data.form : word.form,
    example: parsed.data.example !== undefined ? parsed.data.example : word.example,
    lesson: parsed.data.lesson !== undefined ? parsed.data.lesson : word.lesson,
    audioPath: word.audioPath,
  };
  const newLine = formatCardLine({ front: word.headword, ...fields });
  const oldCard = cardFromBlock(word.rawBlock);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (user.vaultPath) {
    await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
      cards.map((c) =>
        c.sortKey === word.sortKey ? { ...c, cardLine: newLine, fields } : c,
      ),
    );
  } else {
    await prisma.word.update({
      where: { id: word.id },
      data: { ...fields, rawBlock: newLine + oldCard.srLines.join("") },
    });
  }
  res.json({
    word: await prisma.word.findUnique({
      where: { userId_sortKey: { userId: user.id, sortKey: word.sortKey } },
    }),
  });
});

wordsRouter.delete("/:id", async (req, res) => {
  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (user.vaultPath) {
    await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
      cards.filter((c) => c.sortKey !== word.sortKey),
    );
  } else {
    await prisma.word.delete({ where: { id: word.id } });
  }
  res.status(204).end();
});

wordsRouter.get("/:id/audio", async (req, res) => {
  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word?.audioPath) return res.status(404).json({ error: "No audio for this word" });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const baseDir = user.vaultPath
    ? path.join(vaultFiles(user.vaultPath).audioDir, "..")
    : path.join(appAudioDir(user.id), "..");
  const resolved = path.resolve(baseDir, word.audioPath);
  // audioPath comes from vault markdown — never let it escape the audio root
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep) || !existsSync(resolved)) {
    return res.status(404).json({ error: "Audio file not found" });
  }
  res.sendFile(resolved);
});

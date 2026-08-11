import { existsSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BATCH_DELAY_MS, delay, enrichWord } from "../services/enrichment/index.js";
import { classifyTheme, THEMENFELD_VALUES, withComputedFields } from "../services/vocab/classify.js";
import { formatCardLine } from "../services/vault/format.js";
import { appAudioDir, cardFromBlock, makeCard, vaultFiles, vaultSync } from "../services/vault/sync.js";

export const wordsRouter = Router();
wordsRouter.use(requireAuth);

// Faceting (search/state/type/level/theme/source) is all client-side now —
// the shelves UI needs the whole set in memory anyway for cross-filtered
// facet counts, so replicating 6-way AND filtering in SQL isn't worth it.
wordsRouter.get("/", async (req, res) => {
  const words = await prisma.word.findMany({
    where: { userId: req.userId },
    orderBy: { sortKey: "asc" },
  });
  res.json({ words: words.map(withComputedFields) });
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

// Fills in themenfeld/level for words that are missing one or the other —
// e.g. words that entered via the vault-sync path before that path ran
// classifyTheme(), or words added before the heuristic below was refined.
// Only ever fills a gap, never overwrites a value that's already set
// (whether from a prior auto-classification or a manual edit), so it's safe
// to expose as a repeatable action rather than a one-shot admin script.
wordsRouter.post("/reclassify", async (req, res) => {
  const words = await prisma.word.findMany({
    where: { userId: req.userId, OR: [{ themenfeld: { equals: [] } }, { level: null }] },
  });
  const updates = words
    .map((w) => {
      const auto = classifyTheme(w);
      const data: Prisma.WordUpdateInput = {};
      if (w.themenfeld.length === 0 && auto.themenfeld.length > 0) data.themenfeld = auto.themenfeld;
      if (w.level === null && auto.level !== null) data.level = auto.level;
      return Object.keys(data).length ? prisma.word.update({ where: { id: w.id }, data }) : null;
    })
    .filter((q) => q !== null);
  if (updates.length) await prisma.$transaction(updates);
  res.json({ total: words.length, updated: updates.length });
});

const addSchema = z.object({
  words: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
  lesson: z
    .string()
    .regex(/^[\w-]+$/)
    .nullish(),
  // left unset ("Auto") to run classifyTheme() per word; sent explicit to skip it and use as-is
  // (themenfeld is a non-nullable array column — [] means explicitly "Unclassified", not "auto")
  themenfeld: z.array(z.enum(THEMENFELD_VALUES)).max(2).optional(),
  level: z.enum(["a1", "a2", "b1"]).nullish(),
});

wordsRouter.post("/", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { words, lesson, themenfeld: explicitThemenfeld, level: explicitLevel } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const audioDir = user.vaultPath ? vaultFiles(user.vaultPath).audioDir : appAudioDir(user.id);

  const added: unknown[] = [];
  const rejected: { word: string; reason: "loanword" | "not-german" }[] = [];
  for (const [i, word] of words.entries()) {
    let sortKey: string;
    if (user.vaultPath) {
      // resolution + lemma merging + typed-form dedupe all live in the
      // vault sync service (same behavior as the Python script)
      const result = await vaultSync.enrichIntoVault(user.id, user.vaultPath, word, lesson ?? null);
      if (result.rejected) {
        rejected.push({ word, reason: result.rejected });
        if (i < words.length - 1) await delay(BATCH_DELAY_MS);
        continue;
      }
      sortKey = result.headword.toLowerCase();
    } else {
      const { found: _found, headword, typed: _typed, rejected: whyRejected, ...fields } =
        await enrichWord(word, audioDir, lesson ?? null);
      if (whyRejected) {
        rejected.push({ word, reason: whyRejected });
        if (i < words.length - 1) await delay(BATCH_DELAY_MS);
        continue;
      }
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

    // themenfeld/level are app-only columns (never part of the vault card
    // format), so this always writes straight to Postgres regardless of
    // user.vaultPath.
    const created = await prisma.word.findUniqueOrThrow({
      where: { userId_sortKey: { userId: user.id, sortKey } },
    });
    // Level and Theme are overridden independently — leaving one on "Auto"
    // while the other is explicit still runs the classifier for the "Auto" one.
    const auto = classifyTheme(created);
    const classified = {
      themenfeld: explicitThemenfeld !== undefined ? explicitThemenfeld : auto.themenfeld,
      level: explicitLevel !== undefined ? explicitLevel : auto.level,
    };
    const withClassification = await prisma.word.update({
      where: { id: created.id },
      data: classified,
    });

    added.push(withComputedFields(withClassification));
    if (i < words.length - 1) await delay(BATCH_DELAY_MS);
  }
  res.status(201).json({ words: added, rejected });
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
  // app-only — never part of the vault card format, see the write path below
  themenfeld: z.array(z.enum(THEMENFELD_VALUES)).max(2).optional(),
  level: z.enum(["a1", "a2", "b1"]).nullish(),
  leech: z.boolean().optional(),
});

wordsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { themenfeld, level, leech, ...vaultPatch } = parsed.data;

  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const fields = {
    meaning: vaultPatch.meaning !== undefined ? vaultPatch.meaning : word.meaning,
    ipa: vaultPatch.ipa !== undefined ? vaultPatch.ipa : word.ipa,
    grammar: vaultPatch.grammar !== undefined ? vaultPatch.grammar : word.grammar,
    form: vaultPatch.form !== undefined ? vaultPatch.form : word.form,
    example: vaultPatch.example !== undefined ? vaultPatch.example : word.example,
    lesson: vaultPatch.lesson !== undefined ? vaultPatch.lesson : word.lesson,
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
  // themenfeld/level/leech bypass the vault entirely — they have no
  // representation in the card format, so they always go straight to
  // Postgres regardless of user.vaultPath (see schema.prisma's Word model).
  if (themenfeld !== undefined || level !== undefined || leech !== undefined) {
    await prisma.word.update({
      where: { id: word.id },
      data: {
        ...(themenfeld !== undefined ? { themenfeld } : {}),
        ...(level !== undefined ? { level } : {}),
        ...(leech !== undefined ? { leech } : {}),
      },
    });
  }
  res.json({
    word: withComputedFields(
      await prisma.word.findUniqueOrThrow({
        where: { userId_sortKey: { userId: user.id, sortKey: word.sortKey } },
      }),
    ),
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

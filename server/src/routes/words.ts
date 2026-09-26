import { existsSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BATCH_DELAY_MS, createPonsBudget, delay, enrichResolved, resolveWordSafe } from "../services/enrichment/index.js";
import { translateText } from "../services/enrichment/kaikki.js";
import { classifyLevel, strength, withComputedFields } from "../services/vocab/classify.js";
import { firstProtected, formatCardLine } from "../services/vault/format.js";
import { appAudioDir, cardFromBlock, makeCard, vaultFiles, vaultSync } from "../services/vault/sync.js";
import { listeningAudioFor } from "../services/learning/listening-audio.js";

export const wordsRouter = Router();
wordsRouter.use(requireAuth);

// Faceting (search/state/type/level/theme/source) is all client-side now —
// the shelves UI needs the whole set in memory anyway for cross-filtered
// facet counts, so replicating 6-way AND filtering in SQL isn't worth it.
/** Most recent review grade per word (optionally for one word), for `strength()`. */
export async function lastGrades(userId: string, wordId?: string) {
  const logs = await prisma.reviewLog.findMany({
    where: wordId ? { wordId, word: { userId } } : { word: { userId } },
    distinct: ["wordId"],
    orderBy: [{ wordId: "asc" }, { reviewedAt: "desc" }],
    select: { wordId: true, grade: true },
  });
  return new Map(logs.map((l) => [l.wordId, l.grade]));
}

wordsRouter.get("/", async (req, res) => {
  const [words, grades] = await Promise.all([
    prisma.word.findMany({ where: { userId: req.userId }, orderBy: { sortKey: "asc" } }),
    lastGrades(req.userId),
  ]);
  res.json({ words: words.map((w) => ({ ...withComputedFields(w), strength: strength(w, grades.get(w.id) ?? null) })) });
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
  // left unset ("Auto") to derive it from the lesson tag (classifyLevel); sent explicit to use as-is
  level: z.enum(["a1", "a2", "b1"]).nullish(),
});

wordsRouter.post("/", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { words, lesson, level: explicitLevel } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const audioDir = user.vaultPath ? vaultFiles(user.vaultPath).audioDir : appAudioDir(user.id);
  // One budget per request, not per word or per process -- see pons.ts's
  // doc comment. Shared across every word in this batch, whichever branch
  // (vault-linked or no-vault) resolves it.
  const ponsBudget = createPonsBudget();

  const added: unknown[] = [];
  const rejected: { word: string; reason: "loanword" | "not-german" }[] = [];
  for (const [i, word] of words.entries()) {
    let sortKey: string;
    // declension/conjugation/exampleTranslation are app-only columns (never
    // part of the vault card format, same status as level below)
    // — captured here from whichever branch resolved the word, applied in
    // the unified app-only update after both branches, never through
    // Card.fields.
    let declension: unknown = null;
    let conjugation: unknown = null;
    let exampleTranslation: string | null = null;
    // true = an existing manual/review/mt card was left untouched -- the
    // app-only update below must be skipped entirely in that case, or it
    // would silently null out the protected card's real declension/
    // conjugation/exampleTranslation (nothing was computed for it).
    let skipped = false;
    if (user.vaultPath) {
      // resolution + lemma merging + typed-form dedupe all live in the
      // vault sync service (same behavior as the Python script)
      const result = await vaultSync.enrichIntoVault(user.id, user.vaultPath, word, lesson ?? null, ponsBudget);
      if (result.rejected) {
        rejected.push({ word, reason: result.rejected });
        if (i < words.length - 1) await delay(BATCH_DELAY_MS);
        continue;
      }
      sortKey = result.headword.toLowerCase();
      skipped = result.skipped;
      declension = result.declension;
      conjugation = result.conjugation;
      exampleTranslation = result.exampleTranslation;
    } else {
      // Resolution split from enrichment so protection can be checked
      // against BOTH the typed word and the resolved headword before any
      // side effects (audio synthesis, translation fallback) run -- the
      // real scenario this guards is the typed word resolving to a
      // DIFFERENT, already-protected lemma (e.g. protected card "sein",
      // typed word "bist"); this route has no vault-path merge-shortcut
      // equivalent that already resolves the lemma first.
      const { res, transient } = await resolveWordSafe(word);
      // Fetch ALL matching rows, not just one -- findFirst() with an "in"
      // filter and no orderBy has no guarantee which of the typed/resolved
      // keys it returns first, so checking only that one row can silently
      // miss a protected card sitting at the OTHER key (see firstProtected's
      // doc comment).
      const candidateKeys = [...new Set([word.toLowerCase(), res.headword.toLowerCase()])];
      const candidates = await prisma.word.findMany({
        where: { userId: user.id, sortKey: { in: candidateKeys } },
      });
      const protectedCandidate = firstProtected(candidates, (w) => w.curation);
      if (protectedCandidate) {
        sortKey = protectedCandidate.sortKey;
        skipped = true;
      } else {
        // `candidates` already covers both the typed and resolved sortKeys
        // (fetched above for the protection check) -- reuse it as the
        // source for the existing example+translation pair, rather than a
        // second query. Prefer the resolved headword's own row.
        const existingWord =
          candidates.find((w) => w.sortKey === res.headword.toLowerCase()) ??
          candidates.find((w) => w.sortKey === word.toLowerCase()) ??
          null;
        const existingExample = existingWord
          ? { example: existingWord.example, exampleTranslation: existingWord.exampleTranslation }
          : null;
        const {
          found: _found,
          headword,
          typed: _typed,
          rejected: whyRejected,
          declension: entryDeclension,
          conjugation: entryConjugation,
          exampleTranslation: entryExampleTranslation,
          ...fields
        } = await enrichResolved(res, audioDir, lesson ?? null, transient, ponsBudget, existingExample);
        if (whyRejected) {
          rejected.push({ word, reason: whyRejected });
          if (i < words.length - 1) await delay(BATCH_DELAY_MS);
          continue;
        }
        declension = entryDeclension;
        conjugation = entryConjugation;
        exampleTranslation = entryExampleTranslation;
        const card = makeCard(headword, fields, null);
        sortKey = card.sortKey;

        // TOCTOU close: the `candidates`/protection check above ran BEFORE
        // enrichResolved()'s real I/O (audio download, translation
        // fallback), which can take a while -- a concurrent request (another
        // tab's PATCH marking this exact word manual/review, or a duplicate
        // add) could have written a protecting curation to this same
        // sortKey in that window. Re-verify immediately before writing,
        // inside a SERIALIZABLE transaction covering both the re-check and
        // the write -- Postgres's serializable snapshot isolation detects
        // this exact read-then-write-elsewhere pattern (not just same-row
        // conflicts) and aborts one side with a serialization failure
        // (P2034) rather than silently letting both proceed. One retry
        // absorbs a genuinely transient conflict; if it fails twice, decide
        // from final state (now protected -> skip; anything else -> a real
        // failure, surface it rather than silently drop it).
        let settled = false;
        for (let attempt = 0; attempt < 2 && !settled; attempt++) {
          try {
            await prisma.$transaction(
              async (tx) => {
                const freshCandidates = await tx.word.findMany({
                  where: { userId: user.id, sortKey: { in: candidateKeys } },
                });
                const stillProtected = firstProtected(freshCandidates, (w) => w.curation);
                if (stillProtected) {
                  sortKey = stillProtected.sortKey;
                  skipped = true;
                  return;
                }
                // Preserve SR schedule on re-add, same donor-preference rule
                // the vault path's upsertEnrichedCard() already uses (prefer
                // a donor at the resolved-headword key, fall back to the
                // typed-form key) -- re-fetched fresh above, inside the
                // transaction, rather than reusing the pre-enrichment
                // `candidates` array, which could itself be stale by now.
                const srDonor =
                  freshCandidates.find((w) => w.sortKey === card.sortKey && w.srDue !== null) ??
                  freshCandidates.find((w) => w.sortKey === word.toLowerCase() && w.srDue !== null);
                await tx.word.upsert({
                  where: { userId_sortKey: { userId: user.id, sortKey: card.sortKey } },
                  create: {
                    userId: user.id,
                    headword,
                    sortKey: card.sortKey,
                    ...fields,
                    rawBlock: card.cardLine,
                  },
                  update: {
                    ...fields, rawBlock: card.cardLine,
                    srDue: srDonor?.srDue ?? null,
                    srInterval: srDonor?.srInterval ?? null,
                    srEase: srDonor?.srEase ?? null,
                  },
                });
                if (word.toLowerCase() !== card.sortKey) {
                  await tx.word.deleteMany({ where: { userId: user.id, sortKey: word.toLowerCase() } });
                }
              },
              { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
            settled = true;
          } catch (e) {
            const isSerializationConflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
            if (!isSerializationConflict || attempt === 1) {
              if (!isSerializationConflict) throw e;
              // Failed twice -- decide from final state instead of retrying forever.
              const finalCandidates = await prisma.word.findMany({
                where: { userId: user.id, sortKey: { in: candidateKeys } },
              });
              const nowProtected = firstProtected(finalCandidates, (w) => w.curation);
              if (!nowProtected) throw e;
              sortKey = nowProtected.sortKey;
              skipped = true;
              settled = true;
            }
          }
        }
      }
    }

    if (skipped) {
      const existingWord = await prisma.word.findUniqueOrThrow({
        where: { userId_sortKey: { userId: user.id, sortKey } },
      });
      added.push(withComputedFields(existingWord));
      if (i < words.length - 1) await delay(BATCH_DELAY_MS);
      continue;
    }

    // level/declension/conjugation/exampleTranslation are app-only columns
    // (never part of the vault card format), so this always writes straight
    // to Postgres regardless of user.vaultPath.
    const created = await prisma.word.findUniqueOrThrow({
      where: { userId_sortKey: { userId: user.id, sortKey } },
    });
    // Only non-null values are written. Adding an inflected form of a word that
    // already exists takes the vault merge shortcut, which computes none of
    // these; writing its nulls wiped the lemma's real tables, translation and
    // level.
    const autoLevel = classifyLevel(created.lesson);
    const level = explicitLevel !== undefined ? explicitLevel : (autoLevel ?? undefined);
    const classified: Prisma.WordUpdateInput = {
      ...(level !== undefined ? { level } : {}),
      ...(declension != null ? { declension: declension as Prisma.InputJsonValue } : {}),
      ...(conjugation != null ? { conjugation: conjugation as Prisma.InputJsonValue } : {}),
      ...(exampleTranslation ? { exampleTranslation } : {}),
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
  level: z.enum(["a1", "a2", "b1"]).nullish(),
  leech: z.boolean().optional(),
  starred: z.boolean().optional(),
});

wordsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  const { level, leech, starred, ...vaultPatch } = parsed.data;

  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  // A request touching only app-only fields (starred/leech/level)
  // must never change curation -- only an actual content edit resolves a
  // review/mt/manual card (or marks a plain generated one manual). This is
  // the app-side equivalent of the Python vault's manual marker-flip
  // procedure: mt/review -> manual on content edit, unchanged on app-only.
  const isContentEdit = Object.keys(vaultPatch).length > 0;
  const fields = {
    meaning: vaultPatch.meaning !== undefined ? vaultPatch.meaning : word.meaning,
    ipa: vaultPatch.ipa !== undefined ? vaultPatch.ipa : word.ipa,
    grammar: vaultPatch.grammar !== undefined ? vaultPatch.grammar : word.grammar,
    form: vaultPatch.form !== undefined ? vaultPatch.form : word.form,
    example: vaultPatch.example !== undefined ? vaultPatch.example : word.example,
    lesson: vaultPatch.lesson !== undefined ? vaultPatch.lesson : word.lesson,
    audioPath: word.audioPath,
    curation: isContentEdit ? ("manual" as const) : word.curation,
    reviewNote: isContentEdit ? null : word.reviewNote,
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
  // A changed example needs its own translation: the old one belonged to the
  // old sentence. Cleared when the new example can't be translated right now.
  const exampleChanged = vaultPatch.example !== undefined && vaultPatch.example !== word.example;
  const exampleTranslation = exampleChanged
    ? (fields.example ? await translateText(fields.example) : null)
    : undefined;
  // level/leech/starred/exampleTranslation bypass the vault entirely — they
  // have no representation in the card format, so they always go straight to
  // Postgres regardless of user.vaultPath (see schema.prisma's Word model).
  if (level !== undefined || leech !== undefined || starred !== undefined || exampleTranslation !== undefined) {
    await prisma.word.update({
      where: { id: word.id },
      data: {
        ...(exampleTranslation !== undefined ? { exampleTranslation } : {}),
        ...(level !== undefined ? { level } : {}),
        ...(leech !== undefined ? { leech } : {}),
        ...(starred !== undefined ? { starred } : {}),
      },
    });
  }
  const updated = await prisma.word.findUniqueOrThrow({
    where: { userId_sortKey: { userId: user.id, sortKey: word.sortKey } },
  });
  const grades = await lastGrades(user.id, updated.id);
  res.json({ word: { ...withComputedFields(updated), strength: strength(updated, grades.get(updated.id) ?? null) } });
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
  if (!word) return res.status(404).json({ error: "Word not found" });

  let recording: string | null = null;
  if (word.audioPath) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
    const baseDir = user.vaultPath ? path.join(vaultFiles(user.vaultPath).audioDir, "..") : path.join(appAudioDir(user.id), "..");
    const resolved = path.resolve(baseDir, word.audioPath);
    // audioPath comes from vault markdown — never let it escape the audio root
    if (resolved.startsWith(path.resolve(baseDir) + path.sep) && existsSync(resolved)) recording = resolved;
  }
  if (recording) return res.sendFile(recording);

  // ?fallback=tts: a word with no recording (or whose file is missing, e.g. a vault not synced to this machine) gets
  // the same cached Edge TTS the listening lessons use
  if (req.query.fallback === "tts") {
    const spoken = await listeningAudioFor(word.headword);
    if (!spoken) return res.status(503).json({ error: "Audio could not be generated. Please try again shortly." });
    return res.type("audio/mpeg").setHeader("Cache-Control", "private, max-age=31536000, immutable").sendFile(spoken);
  }
  res.status(404).json({ error: word.audioPath ? "Audio file not found" : "No audio for this word" });
});

// DErivBase's probability score tiers into two bands for display — "closely
// related" vs. "same family but a stretch" — rather than showing an
// undifferentiated cluster (see WordFamilyRelation's schema comment).
const CLOSE_FAMILY_THRESHOLD = 0.7;

wordsRouter.get("/:id/family", async (req, res) => {
  const word = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const headwordLower = word.headword.toLowerCase();
  const [asA, asB] = await Promise.all([
    prisma.wordFamilyRelation.findMany({ where: { headwordALower: headwordLower } }),
    prisma.wordFamilyRelation.findMany({ where: { headwordBLower: headwordLower } }),
  ]);
  const related = [
    ...asA.map((r) => ({ headword: r.headwordB, pos: r.posB, score: r.score })),
    ...asB.map((r) => ({ headword: r.headwordA, pos: r.posA, score: r.score })),
  ].sort((a, b) => b.score - a.score);

  // cross-reference against this user's own vocab so the client can show
  // "already in your words" vs. a word they haven't added yet
  const relatedLower = related.map((r) => r.headword.toLowerCase());
  const owned = relatedLower.length
    ? await prisma.word.findMany({
        where: { userId: req.userId, sortKey: { in: relatedLower } },
        select: { id: true, headword: true, sortKey: true },
      })
    : [];
  const ownedBySortKey = new Map(owned.map((w) => [w.sortKey, w]));

  res.json({
    members: related.map((r) => ({
      ...r,
      tier: r.score >= CLOSE_FAMILY_THRESHOLD ? ("close" as const) : ("distant" as const),
      ownedWordId: ownedBySortKey.get(r.headword.toLowerCase())?.id ?? null,
    })),
  });
});

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { prisma } from "../../db.js";
import { BATCH_DELAY_MS, delay, enrichResolved, resolveWord } from "../enrichment/index.js";
import {
  FLASHCARD_TAG_LINE,
  type Card,
  type CardFields,
  cardFront,
  formatCardLine,
  formatSrLine,
  parseCardFields,
  parseSrLine,
  type SrState,
} from "./format.js";
import { INBOX_PLACEHOLDER, buildInboxPlaceholder, parseInboxFile, parseMasterFile } from "./parser.js";
import { atomicWrite, serializeMasterFile } from "./writer.js";

export function vaultFiles(vaultPath: string) {
  return {
    master: path.join(vaultPath, "Vocab", "master.md"),
    inbox: path.join(vaultPath, "Vocab", "inbox.md"),
    audioDir: path.join(vaultPath, "Vocab", "audio"),
  };
}

/** Audio directory for users without a linked vault. */
export function appAudioDir(userId: string): string {
  return path.join(import.meta.dirname, "..", "..", "..", "data", userId, "audio");
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Builds a Card from a stored raw block (card line + attached SR lines). */
export function cardFromBlock(block: string): Card {
  const lines = block.split("\n").filter(Boolean).map((l) => l + "\n");
  const cardLine = lines[0]!;
  const srLines = lines.slice(1);
  const front = cardFront(cardLine);
  return {
    front,
    sortKey: front.toLowerCase(),
    cardLine,
    srLines,
    fields: parseCardFields(cardLine),
    sr: srLines.length ? parseSrLine(srLines[srLines.length - 1]!) : null,
  };
}

export function makeCard(front: string, fields: CardFields, sr: SrState | null): Card {
  const cardLine = formatCardLine({ front, ...fields });
  return {
    front,
    sortKey: front.toLowerCase(),
    cardLine,
    srLines: sr ? [formatSrLine(sr)] : [],
    fields,
    sr,
  };
}

/**
 * Inserts an enriched card, replacing any existing card for the resolved
 * headword AND any stale card for the typed form (when "Wohne" resolves to
 * "wohnen", the old "Wohne" card goes away). The replaced card's SR review
 * history carries over -- parity with add_word.py's insert_and_resort.
 */
export function upsertEnrichedCard(
  cards: Card[],
  typed: string,
  headword: string,
  fields: CardFields,
): Card[] {
  const headKey = headword.toLowerCase();
  const typedKey = typed.toLowerCase();
  const srDonor =
    cards.find((c) => c.sortKey === headKey && c.srLines.length) ??
    cards.find((c) => c.sortKey === typedKey && c.srLines.length);
  const card = makeCard(headword, fields, null);
  if (srDonor) {
    card.srLines = srDonor.srLines;
    card.sr = srDonor.sr;
  }
  return [...cards.filter((c) => c.sortKey !== headKey && c.sortKey !== typedKey), card];
}

/**
 * The typed word resolved to a lemma that already has a card: record the
 * inflected form on that card (idempotent) instead of re-enriching, and
 * drop any stale card for the typed form.
 */
export function mergeFormNote(
  cards: Card[],
  typed: string,
  headword: string,
  formNote: string | null,
): Card[] {
  const headKey = headword.toLowerCase();
  const typedKey = typed.toLowerCase();
  return cards
    .filter((c) => c.sortKey !== typedKey || c.sortKey === headKey)
    .map((c) => {
      if (c.sortKey !== headKey || !formNote || c.fields.form?.includes(formNote)) return c;
      const form = c.fields.form ? `${c.fields.form}; ${formNote}` : formNote;
      const updated = makeCard(c.front, { ...c.fields, form }, null);
      updated.srLines = c.srLines;
      updated.sr = c.sr;
      return updated;
    });
}

/**
 * Cross-process lock shared with add_word.py: flock(1) on the same
 * .enrich.lock file (next to the vault dir, outside what Remotely Save
 * syncs), so the cron job, the systemd path unit, and this server never
 * process the same inbox twice. Returns a release function, or null if
 * another enrichment run holds the lock.
 */
function acquireEnrichLock(vaultPath: string): Promise<(() => void) | null> {
  const lockPath = path.resolve(vaultPath, "..", ".enrich.lock");
  return new Promise((resolve) => {
    // detached: the holder gets its own process group. The lock fd is
    // inherited by the `sleep` child, so release must kill the whole group --
    // killing only the flock parent leaves an orphaned sleep holding the lock.
    const child = spawn("flock", ["-n", lockPath, "sleep", "600"], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    let settled = false;
    child.on("error", () => {
      // flock(1) unavailable -- proceed unlocked rather than never enriching
      if (!settled) (settled = true), resolve(() => {});
    });
    child.on("exit", () => {
      if (!settled) (settled = true), resolve(null);
    });
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(() => {
          try {
            process.kill(-child.pid!, "SIGTERM");
          } catch {
            child.kill();
          }
        });
      }
    }, 200);
  });
}

class VaultSyncService {
  private watchers = new Map<string, FSWatcher>();
  private lastWriteHash = new Map<string, string>();
  private lastSyncAt = new Map<string, Date>();
  private inboxBusy = new Set<string>();

  status(userId: string) {
    return {
      watching: this.watchers.has(userId),
      lastSyncAt: this.lastSyncAt.get(userId) ?? null,
    };
  }

  /** Mirrors the parsed vault into the DB. The vault always wins. */
  private async reconcile(userId: string, cards: Card[]): Promise<void> {
    const sortKeys = cards.map((c) => c.sortKey);
    await prisma.$transaction([
      ...cards.map((card) =>
        prisma.word.upsert({
          where: { userId_sortKey: { userId, sortKey: card.sortKey } },
          create: {
            userId,
            headword: card.front,
            sortKey: card.sortKey,
            ...card.fields,
            srDue: card.sr ? new Date(card.sr.due) : null,
            srInterval: card.sr?.interval ?? null,
            srEase: card.sr?.ease ?? null,
            rawBlock: card.cardLine + card.srLines.join(""),
          },
          update: {
            headword: card.front,
            ...card.fields,
            srDue: card.sr ? new Date(card.sr.due) : null,
            srInterval: card.sr?.interval ?? null,
            srEase: card.sr?.ease ?? null,
            rawBlock: card.cardLine + card.srLines.join(""),
          },
        }),
      ),
      prisma.word.deleteMany({ where: { userId, sortKey: { notIn: sortKeys } } }),
    ]);
    this.lastSyncAt.set(userId, new Date());
  }

  /** Pulls the current vault state into the DB (external edits, initial import). */
  async syncFromVault(userId: string, vaultPath: string): Promise<number> {
    const { master } = vaultFiles(vaultPath);
    const content = existsSync(master) ? await readFile(master, "utf-8") : FLASHCARD_TAG_LINE;
    const parsed = parseMasterFile(content);
    await this.reconcile(userId, parsed.cards);
    return parsed.cards.length;
  }

  /**
   * The single write path to master.md: read current file, apply a mutation
   * to the parsed cards, write atomically, mirror the result into the DB.
   * Reading fresh state right before writing keeps edits made in Obsidian
   * (or by add_word.py) from being clobbered.
   */
  async applyToVault(
    userId: string,
    vaultPath: string,
    mutate: (cards: Card[]) => Card[],
  ): Promise<void> {
    const { master } = vaultFiles(vaultPath);
    const content = existsSync(master) ? await readFile(master, "utf-8") : FLASHCARD_TAG_LINE;
    const parsed = parseMasterFile(content);
    const cards = mutate(parsed.cards);
    const output = serializeMasterFile(parsed.headerLines, cards);
    this.lastWriteHash.set(master, sha256(output));
    await atomicWrite(master, output);
    await this.reconcile(userId, cards);
  }

  /**
   * Resolve + enrich one word into the vault. When the word is an inflected
   * form whose lemma already has a card, the form is merged onto that card
   * instead of re-enriching (parity with add_word.py's enrich_word).
   */
  async enrichIntoVault(
    userId: string,
    vaultPath: string,
    word: string,
    lesson: string | null = null,
  ): Promise<{ headword: string; typed: string; found: boolean; merged: boolean }> {
    const { master, audioDir } = vaultFiles(vaultPath);
    const res = await resolveWord(word);
    const headKey = res.headword.toLowerCase();

    if (headKey !== word.toLowerCase()) {
      const content = existsSync(master) ? await readFile(master, "utf-8") : FLASHCARD_TAG_LINE;
      const lemmaExists = parseMasterFile(content).cards.some((c) => c.sortKey === headKey);
      if (lemmaExists) {
        await this.applyToVault(userId, vaultPath, (cards) =>
          mergeFormNote(cards, word, res.headword, res.formNote),
        );
        return { headword: res.headword, typed: word, found: true, merged: true };
      }
    }

    const fields = await enrichResolved(res, audioDir, lesson);
    await this.applyToVault(userId, vaultPath, (cards) =>
      upsertEnrichedCard(cards, word, res.headword, fields),
    );
    return { headword: res.headword, typed: word, found: fields.found, merged: false };
  }

  /** Port of cmd_enrich_inbox: enrich every raw word, then reset the file. */
  async processInbox(userId: string, vaultPath: string): Promise<string[]> {
    if (this.inboxBusy.has(userId)) return [];
    this.inboxBusy.add(userId);
    try {
      const release = await acquireEnrichLock(vaultPath);
      if (!release) return []; // a cron/systemd add_word.py run owns the inbox right now
      try {
        const { inbox } = vaultFiles(vaultPath);
        if (!existsSync(inbox)) {
          // OneDrive can't store a 0-byte file; Remotely Save deletes the local
          // copy once it goes empty — recreate rather than treat as an error.
          this.lastWriteHash.set(inbox, sha256(INBOX_PLACEHOLDER));
          await atomicWrite(inbox, INBOX_PLACEHOLDER);
          return [];
        }
        const words = parseInboxFile(await readFile(inbox, "utf-8"));
        const added: string[] = [];
        const review: string[] = [];
        for (const word of words) {
          const result = await this.enrichIntoVault(userId, vaultPath, word);
          added.push(
            result.headword.toLowerCase() === word.toLowerCase()
              ? result.headword
              : `${result.headword} (${word})`,
          );
          if (!result.found) review.push(result.headword);
          await delay(BATCH_DELAY_MS);
        }
        if (words.length || !existsSync(inbox)) {
          // Never leave the file at 0 bytes — see note above. The status
          // comment shows up on the phone after the next sync.
          const placeholder = buildInboxPlaceholder(added, review);
          this.lastWriteHash.set(inbox, sha256(placeholder));
          await atomicWrite(inbox, placeholder);
        }
        return words;
      } finally {
        release();
      }
    } finally {
      this.inboxBusy.delete(userId);
    }
  }

  async startWatcher(userId: string, vaultPath: string): Promise<void> {
    await this.stopWatcher(userId);
    const { master, inbox } = vaultFiles(vaultPath);
    const watcher = chokidar.watch([master, inbox], {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 },
    });
    const onEvent = async (filePath: string) => {
      try {
        const content = existsSync(filePath) ? await readFile(filePath, "utf-8") : "";
        // echo suppression: skip events caused by our own writes
        if (this.lastWriteHash.get(filePath) === sha256(content)) return;
        if (filePath === master) {
          await this.syncFromVault(userId, vaultPath);
        } else {
          await this.processInbox(userId, vaultPath);
        }
      } catch (err) {
        console.error(`vault watcher error for ${filePath}:`, err);
      }
    };
    watcher.on("change", onEvent);
    watcher.on("add", onEvent);
    this.watchers.set(userId, watcher);
  }

  async stopWatcher(userId: string): Promise<void> {
    const watcher = this.watchers.get(userId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(userId);
    }
  }

  /**
   * Links a vault: one-time safety backup, import, merge any app-only words
   * into the vault (copying their audio), start watching.
   */
  async link(userId: string, vaultPath: string): Promise<number> {
    const { master, audioDir } = vaultFiles(vaultPath);

    if (existsSync(master)) {
      const backupPath = path.join(
        import.meta.dirname, "..", "..", "..", "data",
        `master.pre-companion.${userId}.bak.md`,
      );
      if (!existsSync(backupPath)) {
        const { mkdir } = await import("node:fs/promises");
        await mkdir(path.dirname(backupPath), { recursive: true });
        await copyFile(master, backupPath);
      }
    }

    const appOnly = await prisma.word.findMany({ where: { userId } });
    const count = await this.syncFromVault(userId, vaultPath);

    const vaultKeys = new Set(
      (await prisma.word.findMany({ where: { userId }, select: { sortKey: true } })).map(
        (w) => w.sortKey,
      ),
    );
    const toMerge = appOnly.filter((w) => !vaultKeys.has(w.sortKey));
    if (toMerge.length) {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(audioDir, { recursive: true });
      for (const w of toMerge) {
        if (w.audioPath) {
          const src = path.join(appAudioDir(userId), "..", w.audioPath);
          if (existsSync(src)) {
            await copyFile(src, path.join(audioDir, path.basename(w.audioPath))).catch(() => {});
          }
        }
      }
      await this.applyToVault(userId, vaultPath, (cards) => [
        ...cards,
        ...toMerge.map((w) => cardFromBlock(w.rawBlock)),
      ]);
    }

    await prisma.user.update({ where: { id: userId }, data: { vaultPath } });
    await this.startWatcher(userId, vaultPath);
    await this.processInbox(userId, vaultPath);
    return count + toMerge.length;
  }

  async unlink(userId: string): Promise<void> {
    await this.stopWatcher(userId);
    await prisma.user.update({ where: { id: userId }, data: { vaultPath: null } });
  }

  /** On server boot: resume watching every linked vault. */
  async resumeAll(): Promise<void> {
    const users = await prisma.user.findMany({ where: { vaultPath: { not: null } } });
    for (const user of users) {
      if (existsSync(user.vaultPath!)) {
        await this.syncFromVault(user.id, user.vaultPath!);
        await this.startWatcher(user.id, user.vaultPath!);
      } else {
        console.warn(`vault path for ${user.email} no longer exists: ${user.vaultPath}`);
      }
    }
  }
}

export const vaultSync = new VaultSyncService();

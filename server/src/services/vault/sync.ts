import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { prisma } from "../../db.js";
import { BATCH_DELAY_MS, delay, enrichWord } from "../enrichment/index.js";
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
import { INBOX_PLACEHOLDER, parseInboxFile, parseMasterFile } from "./parser.js";
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

  /** Port of cmd_enrich_inbox: enrich every raw word, then reset the file. */
  async processInbox(userId: string, vaultPath: string): Promise<string[]> {
    if (this.inboxBusy.has(userId)) return [];
    this.inboxBusy.add(userId);
    try {
      const { inbox, audioDir } = vaultFiles(vaultPath);
      if (!existsSync(inbox)) {
        // OneDrive can't store a 0-byte file; Remotely Save deletes the local
        // copy once it goes empty — recreate rather than treat as an error.
        this.lastWriteHash.set(inbox, sha256(INBOX_PLACEHOLDER));
        await atomicWrite(inbox, INBOX_PLACEHOLDER);
        return [];
      }
      const words = parseInboxFile(await readFile(inbox, "utf-8"));
      for (const word of words) {
        const { found: _found, ...fields } = await enrichWord(word, audioDir);
        await this.applyToVault(userId, vaultPath, (cards) => [
          ...cards.filter((c) => c.sortKey !== word.toLowerCase()),
          makeCard(word, fields, null),
        ]);
        await delay(BATCH_DELAY_MS);
      }
      if (words.length || !existsSync(inbox)) {
        // Never leave the file at 0 bytes — see note above.
        this.lastWriteHash.set(inbox, sha256(INBOX_PLACEHOLDER));
        await atomicWrite(inbox, INBOX_PLACEHOLDER);
      }
      return words;
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

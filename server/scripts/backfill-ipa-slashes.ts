/**
 * One-off backfill for `Word.ipa` values that got double-(or more-)wrapped
 * in slashes by the 2026-09-18 re-enrichment incident (Bug 1 of
 * ~/.claude/plans/what-happened-during-re-enrichment-adaptive-lighthouse.md
 * -- `format.ts`'s formatCardLine unconditionally wrapped an already-slashed
 * Kaikki IPA value in another pair of delimiters). That bug is fixed at the
 * source; this script corrects already-written data.
 *
 * Unlike this repo's other backfill scripts (backfill-kaikki.ts,
 * backfill-example-translation.ts), which only ever fill previously-null
 * fields, this one OVERWRITES already-set data -- so the safety bar is
 * higher: dry-run by default, a full pre-write backup (both a DB row
 * snapshot AND, for vault-linked users, a master.md copy) before any write,
 * a durable JSONL log of every touched word, and explicit reporting of any
 * row left in an uncertain state rather than silently treating it as done.
 *
 * Only touches values that are PURELY outer-wrapped (e.g. "//ˈanta//" or
 * "/ˈanta/") -- a value with a genuine internal slash (an alternate
 * pronunciation, "ˈanta/ˈantɐ") is left untouched and reported separately
 * under "skip-ambiguous" rather than guessed at.
 *
 * Usage:
 *   tsx scripts/backfill-ipa-slashes.ts             # dry run, no writes
 *   tsx scripts/backfill-ipa-slashes.ts --apply     # real run
 */
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db.js";
import { formatCardLine, stripIpaSlashes } from "../src/services/vault/format.js";
import { vaultFiles, vaultSync } from "../src/services/vault/sync.js";

const APPLY = process.argv.includes("--apply");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const SCRIPT_DIR = import.meta.dirname;
const BACKUP_DIR = path.join(SCRIPT_DIR, "backups");
const LOG_DIR = path.join(SCRIPT_DIR, "logs");

export type IpaBackfillCheck =
  | { action: "noop" }
  | { action: "skip-ambiguous" }
  | { action: "fix"; core: string };

/** Reuses stripIpaSlashes as the single source of truth for "outer wrap".
 * A value with no slash at all, or whose stripped form still contains an
 * internal slash, is left alone -- only a purely outer-wrapped value is a
 * real fix. */
export function computeIpaBackfill(ipa: string): IpaBackfillCheck {
  if (!ipa.includes("/")) return { action: "noop" };
  const stripped = stripIpaSlashes(ipa);
  if (stripped === ipa) return { action: "noop" };
  if (stripped.includes("/")) return { action: "skip-ambiguous" };
  return { action: "fix", core: stripped };
}

interface LogRow {
  wordId: string;
  headword: string;
  oldIpa: string;
  newIpa: string;
  timestamp: string;
  status: "fixed" | "db-updated-vault-write-uncertain" | "failed";
  error?: string;
}

async function main() {
  const candidates = await prisma.word.findMany({
    where: { ipa: { contains: "/" } },
    select: {
      id: true, userId: true, headword: true, sortKey: true, ipa: true,
      user: { select: { vaultPath: true } },
    },
  });

  const toFix: (typeof candidates)[number][] = [];
  const ambiguous: (typeof candidates)[number][] = [];
  for (const w of candidates) {
    const check = computeIpaBackfill(w.ipa!);
    if (check.action === "fix") toFix.push(w);
    else if (check.action === "skip-ambiguous") ambiguous.push(w);
  }

  console.log(`${candidates.length} Word rows with a "/" in ipa. ${toFix.length} fixable, ${ambiguous.length} ambiguous (left untouched).`);
  if (ambiguous.length) {
    console.log("\nAmbiguous (internal slash survives outer-strip -- not touched):");
    for (const w of ambiguous) console.log(`  ${w.headword}: "${w.ipa}"`);
  }
  if (!toFix.length) {
    console.log("\nNothing to fix.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} -- fixes:`);
  for (const w of toFix) {
    const { core } = computeIpaBackfill(w.ipa!) as { action: "fix"; core: string };
    console.log(`  ${w.headword}: "${w.ipa}" -> "${core}"`);
  }

  if (!APPLY) {
    console.log("\nDry run only -- no DB or vault changes made. Re-run with --apply to write.");
    await prisma.$disconnect();
    return;
  }

  await mkdir(BACKUP_DIR, { recursive: true });
  await mkdir(LOG_DIR, { recursive: true });

  // Full pre-write DB snapshot -- the whole row, not just ipa, so a full
  // revert is possible without needing Postgres point-in-time recovery.
  const fullRows = await prisma.word.findMany({ where: { id: { in: toFix.map((w) => w.id) } } });
  await writeFile(
    path.join(BACKUP_DIR, `backfill-ipa-${RUN_ID}.json`),
    JSON.stringify(fullRows, null, 2),
  );

  const logRows: LogRow[] = [];
  const logLine = (row: LogRow) => {
    logRows.push(row);
    console.log(`  [${row.status}] ${row.headword}: "${row.oldIpa}" -> "${row.newIpa}"${row.error ? ` (${row.error})` : ""}`);
  };

  const byUser = new Map<string, typeof toFix>();
  for (const w of toFix) {
    const list = byUser.get(w.userId) ?? [];
    list.push(w);
    byUser.set(w.userId, list);
  }

  for (const [userId, words] of byUser) {
    const vaultPath = words[0]!.user.vaultPath;
    if (!vaultPath) {
      // No vault -- a plain DB update per row.
      for (const w of words) {
        const { core } = computeIpaBackfill(w.ipa!) as { action: "fix"; core: string };
        try {
          await prisma.word.update({ where: { id: w.id }, data: { ipa: core } });
          logLine({ wordId: w.id, headword: w.headword, oldIpa: w.ipa!, newIpa: core, timestamp: new Date().toISOString(), status: "fixed" });
        } catch (e) {
          logLine({ wordId: w.id, headword: w.headword, oldIpa: w.ipa!, newIpa: core, timestamp: new Date().toISOString(), status: "failed", error: String(e) });
        }
      }
      continue;
    }

    // Vault-linked: back up master.md first, then reuse the app's existing
    // atomic write+reconcile path (applyToVault) so master.md and the DB
    // Word rows get fixed together, the same way every other vault write in
    // this app works -- not a hand-rolled file mutation.
    const { master } = vaultFiles(vaultPath);
    if (existsSync(master)) {
      await copyFile(master, path.join(BACKUP_DIR, `master-${userId}-${RUN_ID}.md`));
    }

    const sortKeysToFix = new Set(words.map((w) => w.sortKey));
    try {
      await vaultSync.applyToVault(userId, vaultPath, (cards) =>
        cards.map((c) => {
          if (!sortKeysToFix.has(c.sortKey)) return c;
          // parseCardFields() (format.ts) already fully un-wraps a
          // double-slashed IPA on read (that's Bug 1's fix) -- c.fields.ipa
          // is therefore already clean by this point, and reconcile() (which
          // applyToVault calls after writing) will self-heal Word.ipa
          // automatically on ANY future sync regardless of this script. What
          // does NOT self-heal is the raw file text: c.cardLine still holds
          // the ORIGINAL uncorrected bytes read straight from disk
          // (cardFromBlock never regenerates it). Regenerating cardLine from
          // the already-clean fields is what actually fixes what a human
          // reading master.md in Obsidian sees.
          return { ...c, cardLine: formatCardLine({ front: c.front, ...c.fields }) };
        }),
      );
      for (const w of words) {
        const { core } = computeIpaBackfill(w.ipa!) as { action: "fix"; core: string };
        logLine({ wordId: w.id, headword: w.headword, oldIpa: w.ipa!, newIpa: core, timestamp: new Date().toISOString(), status: "fixed" });
      }
    } catch (e) {
      // applyToVault writes master.md BEFORE reconciling it into the DB --
      // if this threw, the vault file may already be updated while the DB
      // reconcile failed partway through its transaction. Report this
      // explicitly as uncertain rather than claiming success.
      for (const w of words) {
        const { core } = computeIpaBackfill(w.ipa!) as { action: "fix"; core: string };
        logLine({
          wordId: w.id, headword: w.headword, oldIpa: w.ipa!, newIpa: core,
          timestamp: new Date().toISOString(), status: "db-updated-vault-write-uncertain", error: String(e),
        });
      }
    }
  }

  await writeFile(
    path.join(LOG_DIR, `backfill-ipa-${RUN_ID}.jsonl`),
    logRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  const uncertain = logRows.filter((r) => r.status !== "fixed");
  console.log(`\nDone. ${logRows.length - uncertain.length} fixed, ${uncertain.length} need manual reconciliation.`);
  if (uncertain.length) {
    console.log("Needs manual reconciliation:");
    for (const r of uncertain) console.log(`  ${r.headword} (${r.wordId}): ${r.status}${r.error ? ` -- ${r.error}` : ""}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

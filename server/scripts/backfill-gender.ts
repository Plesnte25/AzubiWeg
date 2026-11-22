/**
 * One-off backfill: gives every saved noun its article (der/die/das). The article lives at the start of the
 * `grammar` field ("der; Plural: die Tische"), which enrichment only fills when the dictionary entry has a gender,
 * and extractGender() used to miss ~25% of nouns ("m.weak", "f.sg", "f:n" templates). Run AFTER re-importing the
 * dictionary (`npm run import:kaikki`) so KaikkiEntry.gender is complete.
 *
 * Only fills an EMPTY grammar field (grammar is a vault-format field a user may have hand-edited, so existing text is
 * never rewritten; such words are listed instead). Vault-linked users are written through the vault so the next sync
 * doesn't undo it. Capitalised headwords only (German nouns are). Safe to re-run.
 *
 * `npm run backfill:gender` (add `-- --dry-run` to only report).
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { buildGrammarNote } from "../src/services/enrichment/index.js";
import { compoundGender, findEntriesByHeadword, selectExactCaseEntries } from "../src/services/enrichment/kaikki.js";
import { deriveGenus } from "../src/services/vocab/classify.js";
import { formatCardLine } from "../src/services/vault/format.js";
import { vaultSync } from "../src/services/vault/sync.js";

const dryRun = process.argv.includes("--dry-run");

// The dictionary noun's gender; else plural-only "die (nur Plural)"; else a compound's head (Radiomoderatorin -> die).
async function nounGrammar(headword: string): Promise<string | null> {
  if (!/^[A-ZÄÖÜ]/.test(headword)) return null;
  const entries = selectExactCaseEntries(await findEntriesByHeadword(headword.toLowerCase()), headword);
  const noun = entries.find((e) => e.pos === "noun" && e.gender) ?? entries.find((e) => e.pos === "noun");
  const note = noun ? buildGrammarNote({ ...noun, conjugation: null }) : null;
  return note ?? compoundGender(headword);
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, vaultPath: true } });
  let filled = 0;
  const kept: string[] = [];
  const unknown: string[] = [];

  for (const user of users) {
    const words = await prisma.word.findMany({ where: { userId: user.id }, select: { id: true, headword: true, sortKey: true, grammar: true } });
    const updates = new Map<string, { id: string; grammar: string }>(); // by sortKey
    for (const w of words) {
      if (deriveGenus(w.grammar)) continue;
      const grammar = await nounGrammar(w.headword);
      if (!grammar) {
        if (/^[A-ZÄÖÜ]/.test(w.headword)) unknown.push(w.headword);
        continue;
      }
      if (w.grammar?.trim()) {
        kept.push(`${w.headword} (has "${w.grammar}", dictionary says ${grammar.split(";")[0]})`);
        continue;
      }
      updates.set(w.sortKey, { id: w.id, grammar });
    }
    filled += updates.size;
    if (dryRun || updates.size === 0) continue;

    if (user.vaultPath) {
      await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
        cards.map((c) => {
          const u = updates.get(c.sortKey);
          if (!u || c.fields.grammar?.trim()) return c;
          const fields = { ...c.fields, grammar: u.grammar };
          return { ...c, fields, cardLine: formatCardLine({ front: c.front, ...fields }) };
        }),
      );
    } else {
      for (const u of updates.values()) await prisma.word.update({ where: { id: u.id }, data: { grammar: u.grammar } });
    }
  }

  console.log(`${dryRun ? "[dry run] would fill" : "Filled"} the article on ${filled} nouns.`);
  if (kept.length) console.log(`Left alone (grammar already has text, edit by hand if wrong):\n  ${kept.join("\n  ")}`);
  if (unknown.length) console.log(`Capitalised words still without an article (not a dictionary noun, or no gender there):\n  ${unknown.join(", ")}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

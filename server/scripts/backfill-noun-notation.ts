/**
 * One-off backfill: rewrites every saved noun's Grammar note into dictionary notation, so the article and plural are
 * learned together ("der; Plural: die Hunde" -> "der Hund, -e", "das; Plural: die Häuser" -> "das Haus, -¨er",
 * "die (nur Plural)" -> "die Eltern (Pl.)"; see services/vocab/noun-notation.ts).
 *
 * Only notes still in the exact old generated shape are touched, so hand-written grammar text is never rewritten.
 * The plural comes from the old note itself, else the word's own declension table; a note with no plural at all
 * ("der") gets one from the dictionary when it agrees on the article (compounds from their head), for generated
 * cards only: protected cards (manual/review/mt) are only reformatted, never given new data. Vault-linked users are
 * written through the vault so the next sync doesn't undo it. Safe to re-run.
 *
 * `npm run backfill:noun-notation` (add `-- --dry-run` to only report).
 */
import "dotenv/config";
import { prisma } from "../src/db.js";
import { compoundNoun, findEntriesByHeadword, selectExactCaseEntries } from "../src/services/enrichment/kaikki.js";
import { type CardCuration, formatCardLine, shouldProtectCard } from "../src/services/vault/format.js";
import { vaultSync } from "../src/services/vault/sync.js";
import { formatNounNotation, parseNounNote, upgradeNounNote } from "../src/services/vocab/noun-notation.js";

const dryRun = process.argv.includes("--dry-run");

type Decl = { nom?: { sg?: string; pl?: string } } | null;

/** The plural the dictionary gives this exact noun (or its compound head), when it has the same article. */
async function dictionaryPlural(headword: string, article: string): Promise<string | null> {
  const entries = selectExactCaseEntries(await findEntriesByHeadword(headword.toLowerCase()), headword);
  const noun = entries.find((e) => e.pos === "noun" && e.gender === article);
  if (noun) return (noun.declension as Decl)?.nom?.pl ?? null;
  if (entries.some((e) => e.pos === "noun")) return null;
  const compound = await compoundNoun(headword);
  return compound?.gender === article ? compound.plural : null;
}

async function newNote(w: { headword: string; grammar: string | null; declension: unknown; curation: string }): Promise<string | null> {
  const upgraded = upgradeNounNote(w.grammar, w.headword);
  if (!upgraded) return null;
  const parsed = parseNounNote(w.grammar)!;
  if (parsed.pluralOnly || parsed.plural) return upgraded;
  const decl = w.declension as Decl;
  const plural = decl?.nom?.pl ?? (shouldProtectCard(w.curation as CardCuration) ? null : await dictionaryPlural(w.headword, parsed.article));
  return plural ? formatNounNotation({ article: parsed.article, singular: decl?.nom?.sg ?? w.headword, plural }) : upgraded;
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, vaultPath: true } });
  let changed = 0;
  const samples: string[] = [];

  for (const user of users) {
    const words = await prisma.word.findMany({
      where: { userId: user.id, grammar: { not: null } },
      select: { id: true, headword: true, sortKey: true, grammar: true, declension: true, curation: true },
    });
    const updates = new Map<string, { id: string; from: string; grammar: string }>(); // by sortKey
    for (const w of words) {
      const grammar = await newNote(w);
      if (!grammar || grammar === w.grammar) continue;
      updates.set(w.sortKey, { id: w.id, from: w.grammar!, grammar });
      if (samples.length < 15) samples.push(`${w.grammar}  ->  ${grammar}`);
    }
    changed += updates.size;
    if (dryRun || updates.size === 0) continue;

    if (user.vaultPath) {
      await vaultSync.applyToVault(user.id, user.vaultPath, (cards) =>
        cards.map((c) => {
          const u = updates.get(c.sortKey);
          // the card must still hold the note we read from the DB, or the vault has moved on since
          if (!u || c.fields.grammar?.trim() !== u.from.trim()) return c;
          const fields = { ...c.fields, grammar: u.grammar };
          return { ...c, fields, cardLine: formatCardLine({ front: c.front, ...fields }) };
        }),
      );
    } else {
      for (const u of updates.values()) await prisma.word.update({ where: { id: u.id }, data: { grammar: u.grammar } });
    }
  }

  console.log(`${dryRun ? "[dry run] would rewrite" : "Rewrote"} ${changed} noun notes.`);
  if (samples.length) console.log(`For example:\n  ${samples.join("\n  ")}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * One-time (re-runnable) import of DErivBase v2.0's probabilities file into
 * WordFamilyRelation — global, lemma-keyed word-family data (see the model's
 * doc comment in schema.prisma). Source: IMS Stuttgart, CC BY-SA 3.0
 * (https://www.ims.uni-stuttgart.de/forschung/ressourcen/lexika/derivbase/).
 *
 * Downloads derivbase-v2.0.zip, extracts DErivBase-v2.0-probabilities.txt in
 * memory (no temp files), and bulk-inserts. Each line is
 * "lemma1_POS lemma2_POS probability" — one row per pair, all n-choose-2
 * pairs within a derivational family already expanded by DErivBase itself.
 *
 * Safe to re-run: truncates and reloads rather than diffing, since this is
 * reference data with no user-editable state layered on top of it (unlike
 * the seeded-defaults pattern elsewhere in this codebase, which preserves
 * user edits across reseeds).
 *
 * Run with `npm run import:derivbase`.
 */
import "dotenv/config";
import AdmZip from "adm-zip";
import { prisma } from "../src/db.js";

const DERIVBASE_URL =
  "https://www.ims.uni-stuttgart.de/documents/ressourcen/lexika/derivbase/derivbase-v2.0.zip";
const PROBABILITIES_ENTRY = "derivbase/DErivBase-v2.0-probabilities.txt";
const BATCH_SIZE = 5000;

// "Lehrer_Nm" -> { headword: "Lehrer", pos: "Nm" }
function splitLemma(token: string): { headword: string; pos: string } {
  const idx = token.lastIndexOf("_");
  if (idx === -1) return { headword: token, pos: "" };
  return { headword: token.slice(0, idx), pos: token.slice(idx + 1) };
}

/** A handful of transient connect timeouts observed against this host during
 * development — plain exponential-backoff retry, same pattern as
 * enrichment/wiktionary.ts's getWithRetry. */
async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let delay = 2000;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url);
    } catch (e) {
      if (i === attempts - 1) throw e;
      console.log(`Fetch failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("unreachable");
}

async function main() {
  console.log(`Fetching ${DERIVBASE_URL} ...`);
  const res = await fetchWithRetry(DERIVBASE_URL);
  if (!res.ok) throw new Error(`DErivBase download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const zip = new AdmZip(buf);
  const entry = zip.getEntry(PROBABILITIES_ENTRY);
  if (!entry) throw new Error(`${PROBABILITIES_ENTRY} not found in archive`);
  const text = entry.getData().toString("utf-8");

  const lines = text.split("\n").filter(Boolean);
  console.log(`Parsed ${lines.length} pair rows`);

  // TRUNCATE, not deleteMany() -- see import-kaikki.ts's identical comment;
  // cheap insurance here too even though this table is much smaller.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "WordFamilyRelation"');

  let batch: {
    headwordA: string;
    headwordALower: string;
    posA: string;
    headwordB: string;
    headwordBLower: string;
    posB: string;
    score: number;
  }[] = [];
  let total = 0;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 3) continue;
    const [tokenA, tokenB, scoreStr] = parts as [string, string, string];
    const score = Number.parseFloat(scoreStr);
    if (!Number.isFinite(score)) continue;
    const a = splitLemma(tokenA);
    const b = splitLemma(tokenB);
    batch.push({
      headwordA: a.headword,
      headwordALower: a.headword.toLowerCase(),
      posA: a.pos,
      headwordB: b.headword,
      headwordBLower: b.headword.toLowerCase(),
      posB: b.pos,
      score,
    });
    if (batch.length >= BATCH_SIZE) {
      await prisma.wordFamilyRelation.createMany({ data: batch });
      total += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await prisma.wordFamilyRelation.createMany({ data: batch });
    total += batch.length;
  }

  console.log(`Imported ${total} word-family relations.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

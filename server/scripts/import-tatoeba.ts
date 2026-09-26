/**
 * Fills the TatoebaPair table with German sentences and their English translations from Tatoeba's weekly exports
 * (https://tatoeba.org, CC BY 2.0 FR). services/enrichment/tatoeba.ts picks a word's example from it when
 * kaikki/Wiktionary has no short one.
 *
 * Keeps only short, plain sentences: 4–12 words, no quotation marks, ending in . ! or ?. Each German sentence keeps
 * its shortest English translation. Re-running replaces the whole table. Needs `bzip2` on the PATH.
 *
 *   npm run import:tatoeba
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { get } from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { prisma } from "../src/db.js";
import { tokenizeGerman } from "../src/services/enrichment/tatoeba.js";

const BASE = "https://downloads.tatoeba.org/exports/per_language";
const FILES = {
  links: `${BASE}/deu/deu-eng_links.tsv.bz2`,
  deu: `${BASE}/deu/deu_sentences.tsv.bz2`,
  eng: `${BASE}/eng/eng_sentences.tsv.bz2`,
};
const MIN_WORDS = 4;
const MAX_WORDS = 12;

// node:https rather than fetch: undici's fetch timed out connecting to this host from the dev machine, where curl and
// https.get both work.
function download(url: string, dir: string): Promise<string> {
  const file = path.join(dir, path.basename(url));
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`${url}: HTTP ${res.statusCode}`));
        return;
      }
      pipeline(res, createWriteStream(file)).then(() => resolve(file), reject);
    }).on("error", reject);
  });
}

/** Each tab-separated row of a .tsv.bz2 file, decompressed by the system bzip2. */
async function* rows(file: string): AsyncGenerator<string[]> {
  const bz = spawn("bzip2", ["-dc", file]);
  const lines = createInterface({ input: bz.stdout, crlfDelay: Infinity });
  for await (const line of lines) if (line) yield line.split("\t");
}

function usable(text: string): boolean {
  const words = tokenizeGerman(text).length;
  return words >= MIN_WORDS && words <= MAX_WORDS && !/["“”„«»]/.test(text) && /[.!?]$/.test(text);
}

async function main() {
  const dir = await mkdtemp(path.join(tmpdir(), "tatoeba-"));
  try {
    console.log("Downloading Tatoeba exports…");
    const [links, deu, eng] = await Promise.all([download(FILES.links, dir), download(FILES.deu, dir), download(FILES.eng, dir)]);

    // deu-eng links: German id → English ids
    const enFor = new Map<number, number[]>();
    for await (const [de, en] of rows(links)) {
      const d = Number(de), e = Number(en);
      enFor.set(d, [...(enFor.get(d) ?? []), e]);
    }

    const german = new Map<number, string>();
    for await (const [id, , text] of rows(deu)) {
      const n = Number(id);
      if (text && enFor.has(n) && usable(text)) german.set(n, text);
    }

    const wantedEn = new Set<number>();
    for (const d of german.keys()) for (const e of enFor.get(d)!) wantedEn.add(e);
    const english = new Map<number, string>();
    for await (const [id, , text] of rows(eng)) {
      const n = Number(id);
      if (text && wantedEn.has(n)) english.set(n, text);
    }

    const pairs = [...german].flatMap(([deId, de]) => {
      const translations = enFor.get(deId)!.filter((e) => english.has(e)).sort((a, b) => english.get(a)!.length - english.get(b)!.length);
      const enId = translations[0];
      if (enId === undefined) return [];
      const tokens = tokenizeGerman(de);
      return [{ deId, enId, de, en: english.get(enId)!, tokens: [...new Set(tokens)], wordCount: tokens.length }];
    });
    console.log(`${german.size} usable German sentences, ${pairs.length} with an English translation.`);

    await prisma.$transaction(
      async (tx) => {
        await tx.tatoebaPair.deleteMany();
        for (let i = 0; i < pairs.length; i += 5000) await tx.tatoebaPair.createMany({ data: pairs.slice(i, i + 5000) });
      },
      { timeout: 600_000 },
    );
    console.log(`TatoebaPair: ${pairs.length} rows.`);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

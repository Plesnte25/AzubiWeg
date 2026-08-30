/**
 * One-time (re-runnable, kaikki.org updates ~weekly) import of the German
 * Wiktionary dump from kaikki.org into KaikkiEntry/KaikkiForm — the local
 * lookup tables services/enrichment/kaikki.ts's resolveWord() reads from
 * instead of live-fetching Wiktionary per word (see that file's own doc
 * comment for why: fragility to template changes, and no single word-family/
 * declension/conjugation source existed in the old live-scrape pipeline).
 *
 * Source: https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
 * (~1GB, JSONL, one dictionary entry per line, updated weekly). License:
 * cite Ylonen's Wiktextract LREC 2022 paper and link back to kaikki.org
 * (this repo's README does both — see the "Data sources" section).
 *
 * Streams the file (never loads it fully into memory) and batch-inserts.
 * Truncates and reloads on each run — same reasoning as import-derivbase.ts.
 *
 * Run with `npm run import:kaikki`.
 */
import "dotenv/config";
import { createReadStream, existsSync } from "node:fs";
import readline from "node:readline";
import { Readable } from "node:stream";
import { prisma } from "../src/db.js";
import {
  type KaikkiRecordRaw,
  extractConjugation,
  extractDeclension,
  extractGender,
  firstExample,
  firstMeaning,
} from "../src/services/enrichment/kaikki.js";

const KAIKKI_URL = "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl";
const BATCH_SIZE = 2000;
// The pos values this app actually uses (Wortart: Nomen/Verb/Adjektiv/Adverb) —
// kaikki.org also has particle/conj/prep/pron/etc. entries, which this app's
// Funktionswort/Wendung buckets already handle via free-text grammar, not a
// structured forms table, so they're skipped here to keep the import fast
// and the table focused.
const SUPPORTED_POS = new Set(["noun", "verb", "adj", "adv"]);

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

/** KAIKKI_LOCAL_PATH lets a pre-downloaded copy (e.g. via `curl -C -` for
 * resumable/retriable fetching of a ~1GB file, which proved far more
 * reliable in practice than streaming a live fetch() response body over a
 * flaky connection — no read-timeout exists on an in-progress stream, so a
 * mid-download stall just hangs forever instead of erroring) stand in for
 * the live URL. Falls back to streaming the URL directly when unset. */
async function openInput(): Promise<NodeJS.ReadableStream> {
  const localPath = process.env.KAIKKI_LOCAL_PATH;
  if (localPath && existsSync(localPath)) {
    console.log(`Reading local file ${localPath} ...`);
    return createReadStream(localPath);
  }
  console.log(`Streaming ${KAIKKI_URL} ...`);
  const res = await fetchWithRetry(KAIKKI_URL);
  if (!res.ok || !res.body) throw new Error(`kaikki.org download failed: HTTP ${res.status}`);
  return Readable.fromWeb(res.body as any);
}

async function main() {
  const input = await openInput();

  // TRUNCATE, not deleteMany() -- deleteMany's row-by-row DELETE cascading
  // across KaikkiForm's ~1.5M rows took many minutes (observed live: stuck
  // at wait_event "AioIoCompletion", genuinely slow disk I/O, not a hang) on
  // a re-import. TRUNCATE clears both in one fast operation.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "KaikkiForm", "KaikkiEntry"');

  const rl = readline.createInterface({ input });

  let entryBatch: {
    id: string;
    headword: string;
    headwordLower: string;
    pos: string;
    gender: string | null;
    meaning: string | null;
    example: string | null;
    exampleTranslation: string | null;
    ipa: string | null;
    audioFilename: string | null;
    declension: unknown;
    conjugation: unknown;
    etymology: string | null;
  }[] = [];
  let formBatch: { form: string; formLower: string; tags: string | null; entryId: string }[] = [];
  let totalEntries = 0;
  let totalForms = 0;
  let lineNo = 0;
  let cuidCounter = 0;
  const now = Date.now();
  // avoids an extra round-trip per row for an id — cheap synthetic id, not
  // meant to be a real cuid, just unique and stable for this import run
  const nextId = () => `kk${now.toString(36)}${(cuidCounter++).toString(36)}`;

  async function flush() {
    if (entryBatch.length) {
      await prisma.kaikkiEntry.createMany({ data: entryBatch });
      totalEntries += entryBatch.length;
      entryBatch = [];
    }
    if (formBatch.length) {
      await prisma.kaikkiForm.createMany({ data: formBatch.map((f) => ({ ...f, id: nextId() })) });
      totalForms += formBatch.length;
      formBatch = [];
    }
  }

  for await (const line of rl) {
    lineNo++;
    if (!line.trim()) continue;
    let rec: KaikkiRecordRaw;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.lang_code !== "de" || !SUPPORTED_POS.has(rec.pos) || !rec.word) continue;

    const senses = rec.senses ?? [];
    const meaning = firstMeaning(senses);
    const { text: example, translation: exampleTranslation } = firstExample(senses);
    const sound = (rec.sounds ?? []).find((s) => s.ipa) ?? {};
    const audioEntry = (rec.sounds ?? []).find((s) => s.audio);
    const forms = rec.forms ?? [];

    const id = nextId();
    entryBatch.push({
      id,
      headword: rec.word,
      headwordLower: rec.word.toLowerCase(),
      pos: rec.pos,
      gender: rec.pos === "noun" ? extractGender(rec) : null,
      meaning,
      example,
      exampleTranslation,
      ipa: sound.ipa ?? null,
      audioFilename: audioEntry?.audio ?? null,
      declension: rec.pos === "noun" ? extractDeclension(forms) : null,
      conjugation: rec.pos === "verb" ? extractConjugation(forms) : null,
      etymology: rec.etymology_text ?? null,
    });

    // reverse-index every distinct inflected surface form for "gehe" -> "gehen"
    // style lookups; skip forms identical to the headword itself (redundant)
    const seenForms = new Set<string>();
    for (const f of forms) {
      if (!f.form || f.form === rec.word) continue;
      const lower = f.form.toLowerCase();
      if (seenForms.has(lower)) continue;
      seenForms.add(lower);
      formBatch.push({ form: f.form, formLower: lower, tags: f.tags?.join(", ") ?? null, entryId: id });
    }

    if (entryBatch.length >= BATCH_SIZE) await flush();
    if (formBatch.length >= BATCH_SIZE) await flush();
    if (lineNo % 200_000 === 0) console.log(`...${lineNo} lines scanned, ${totalEntries} entries imported`);
  }
  await flush();

  console.log(`Done. ${totalEntries} entries, ${totalForms} inflected-form index rows.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

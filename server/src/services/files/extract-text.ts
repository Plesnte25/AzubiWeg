import { mkdir } from "node:fs/promises";
import path from "node:path";

export const MAX_EXTRACTED_CHARS = 100_000;

const EXTRACTABLE = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isExtractable(mimeType: string): boolean {
  return EXTRACTABLE.has(mimeType);
}

/** Normalize whitespace, drop control chars, cap length. */
export function cleanExtractedText(raw: string): string {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.slice(0, MAX_EXTRACTED_CHARS);
}

export function extractTxtText(buffer: Buffer): string {
  return cleanExtractedText(buffer.toString("utf8"));
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // lazy import keeps server boot fast; legacy build is the Node-safe one
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  try {
    const doc = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    return cleanExtractedText(pages.join("\n\n"));
  } finally {
    await loadingTask.destroy();
  }
}

// One wasm worker, jobs serialized through a promise chain so concurrent
// uploads can't multiply memory use. First OCR downloads deu+eng traineddata
// (~15 MB) into data/tessdata once.
type TesseractWorker = import("tesseract.js").Worker;
let workerPromise: Promise<TesseractWorker> | null = null;
let ocrQueue: Promise<unknown> = Promise.resolve();

async function getOcrWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const cachePath = path.join(import.meta.dirname, "../../../data/tessdata");
      // tesseract silently skips caching when the directory is missing, which
      // would re-download ~15 MB of traineddata on every server restart
      await mkdir(cachePath, { recursive: true });
      return createWorker("deu+eng", 1, { cachePath });
    })();
  }
  return workerPromise;
}

// Tesseract can't read handwriting — below this mean confidence its output is
// gibberish, so we report "no text found" instead of storing noise.
export const TESSERACT_MIN_CONFIDENCE = 55;

export async function ocrImageText(buffer: Buffer): Promise<string> {
  const job = ocrQueue.then(async () => {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(buffer);
    if (data.confidence < TESSERACT_MIN_CONFIDENCE) return "";
    return cleanExtractedText(data.text);
  });
  ocrQueue = job.catch(() => {});
  return job;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Vision transcription via the Claude API — reads handwriting (incl. German),
 * which tesseract cannot. Used when ANTHROPIC_API_KEY is configured; throws on
 * API failure so the caller can fall back to tesseract.
 */
async function claudeOcrText(buffer: Buffer, mediaType: ImageMediaType): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") },
          },
          {
            type: "text",
            text:
              "Transcribe all text in this image exactly as written. It may be handwritten " +
              "study notes in German and/or English. Preserve the line structure. Output only " +
              "the transcription with no commentary. If the image contains no readable text, " +
              "output exactly: NO_TEXT",
          },
        ],
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (text.trim() === "NO_TEXT") return "";
  return cleanExtractedText(text);
}

async function extractImageText(buffer: Buffer, mimeType: string): Promise<string> {
  const mediaType = mimeType as ImageMediaType;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeOcrText(buffer, mediaType);
    } catch (err) {
      console.error("claude ocr failed, falling back to tesseract:", err);
    }
  }
  return ocrImageText(buffer);
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") return extractTxtText(buffer);
  if (mimeType === "application/pdf") return extractPdfText(buffer);
  if (mimeType.startsWith("image/")) return extractImageText(buffer, mimeType);
  return "";
}

import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const execFileAsync = promisify(execFile);
const USER_AGENT = "AzubiWeg/1.0 (personal study tool)";

// A real short German word's TTS MP3 at this bitrate is comfortably above
// this -- catches truncated/near-empty output that isn't literally 0 bytes.
const MIN_TTS_BYTES = 2048;
// Anything at or below this is silence/near-silence, not a real word.
const MIN_TTS_DURATION_SECONDS = 0.2;

export function isPlausibleAudioSize(sizeBytes: number, minBytes = MIN_TTS_BYTES): boolean {
  return sizeBytes >= minBytes;
}

// Cached module-level preflight -- computed once, not per synthesis call, so
// a missing ffprobe logs exactly one warning instead of failing (or
// silently degrading) on every single word. `null` = not checked yet.
let ffprobeAvailable: boolean | null = null;

async function checkFfprobeAvailable(): Promise<boolean> {
  if (ffprobeAvailable !== null) return ffprobeAvailable;
  try {
    await execFileAsync("ffprobe", ["-version"]);
    ffprobeAvailable = true;
  } catch {
    ffprobeAvailable = false;
    console.warn("ffprobe not found -- TTS audio validation is size-only, duration checks disabled");
  }
  return ffprobeAvailable;
}

// Distinguishes WHY a duration isn't available, because the two cases
// warrant opposite treatment: "unavailable" (the ffprobe binary doesn't
// exist on this system at all) is a system-wide condition with no way to
// confirm duration for ANY file, so falling back to size-only validation is
// the best we can do. "failed" (ffprobe is installed and ran, but couldn't
// parse THIS specific file / got a non-numeric result) is evidence the file
// itself is malformed -- a healthy MP3 that this app just wrote via ffmpeg
// or Edge TTS should always be parseable by a working ffprobe, so a parse
// failure here must not be waved through on size alone.
export type DurationProbeResult = { status: "unavailable" } | { status: "failed" } | { status: "ok"; seconds: number };

async function probeDurationSeconds(filePath: string): Promise<DurationProbeResult> {
  if (!(await checkFfprobeAvailable())) return { status: "unavailable" };
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath,
    ]);
    const seconds = Number.parseFloat(stdout.trim());
    return Number.isFinite(seconds) ? { status: "ok", seconds } : { status: "failed" };
  } catch {
    return { status: "failed" }; // ffprobe is available but rejected THIS file -- treat as corrupt, not "can't confirm"
  }
}

/** Pure combination of the two signals -- extracted so both the
 * ffprobe-unavailable (size-only fallback) and ffprobe-failed-on-this-file
 * (reject) decisions are directly unit-testable without any real fs/ffprobe
 * I/O. */
export function isValidAudioMeta(sizeBytes: number, duration: DurationProbeResult): boolean {
  if (!isPlausibleAudioSize(sizeBytes)) return false;
  if (duration.status === "unavailable") return true;
  if (duration.status === "failed") return false;
  return duration.seconds > MIN_TTS_DURATION_SECONDS;
}

/** A file at `filePath` is only trusted when its size is plausible AND
 * (when ffprobe is available) its duration is above the near-silence floor.
 * When ffprobe can't run at all (missing binary, or failed on this file),
 * degrades to size-only validation rather than rejecting everything. */
async function isValidTtsFile(filePath: string): Promise<boolean> {
  const info = await stat(filePath).catch(() => null);
  if (!info) return false;
  const duration = await probeDurationSeconds(filePath);
  return isValidAudioMeta(info.size, duration);
}

/**
 * Filename sanitizer matching Python's re.sub(r"[^\w.\-]", "_", …) — Python
 * \w is unicode-aware, so umlauts survive (the vault has "Büro-tts.mp3").
 */
export function sanitizeStem(name: string): string {
  return name.replace(/[^\p{L}\p{N}_.-]/gu, "_");
}

/**
 * Downloads a pronunciation recording from Wikimedia Commons into audioDir,
 * converting to MP3 (iOS/WebKit can't play Commons' OGG). Returns the
 * vault-relative path ("audio/…") or null.
 */
export async function downloadCommonsAudio(
  filename: string,
  audioDir: string,
): Promise<string | null> {
  await mkdir(audioDir, { recursive: true });
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    filename.replaceAll(" ", "_"),
  )}`;
  let body: ArrayBuffer;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    body = await res.arrayBuffer();
  } catch {
    return null;
  }

  const stem = sanitizeStem(filename.replace(/\.[^.]*$/, ""));
  const srcExt = (path.extname(filename) || ".ogg").toLowerCase();
  const srcPath = path.join(audioDir, stem + srcExt);
  await writeFile(srcPath, Buffer.from(body));

  if (srcExt === ".mp3") return `audio/${stem}.mp3`;

  const mp3Path = path.join(audioDir, stem + ".mp3");
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      srcPath,
      "-codec:a",
      "libmp3lame",
      "-qscale:a",
      "4",
      mp3Path,
    ]);
  } catch {
    await unlink(srcPath).catch(() => {});
    return null;
  }
  await unlink(srcPath).catch(() => {});
  return `audio/${stem}.mp3`;
}

/**
 * Fallback pronunciation via Microsoft Edge's free neural TTS — Commons only
 * covers a minority of words. Same voice and naming as the Python script.
 *
 * Synthesizes to a temp file in the SAME directory as the final destination
 * (so the closing rename is on one filesystem and atomic), validates it,
 * and only then renames it over `destPath` -- a failed validation or a
 * synthesis error never touches a previously-good file at `destPath`. A
 * real, structurally-valid existing file short-circuits the whole call: no
 * re-synthesis, no risk, on a re-enrichment pass for a word that already has
 * good audio. Note this only validates structure (size/duration) -- it
 * cannot confirm the audio is actually the correct word's pronunciation.
 */
export async function synthesizeTts(word: string, audioDir: string): Promise<string | null> {
  await mkdir(audioDir, { recursive: true });
  const stem = sanitizeStem(word);
  const destPath = path.join(audioDir, `${stem}-tts.mp3`);

  if (await isValidTtsFile(destPath)) return `audio/${stem}-tts.mp3`;

  const tempPath = `${destPath}.tmp-${randomUUID()}`;
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata("de-DE-KatjaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(word);
    await pipeline(audioStream, createWriteStream(tempPath));
  } catch {
    await unlink(tempPath).catch(() => {});
    return null;
  } finally {
    tts.close();
  }
  if (!(await isValidTtsFile(tempPath))) {
    await unlink(tempPath).catch(() => {});
    return null;
  }
  await rename(tempPath, destPath);
  return `audio/${stem}-tts.mp3`;
}

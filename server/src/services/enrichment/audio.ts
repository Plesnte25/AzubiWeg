import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const execFileAsync = promisify(execFile);
const USER_AGENT = "DeutschlandCompanion/1.0 (personal study tool)";

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
 */
export async function synthesizeTts(word: string, audioDir: string): Promise<string | null> {
  await mkdir(audioDir, { recursive: true });
  const stem = sanitizeStem(word);
  const destPath = path.join(audioDir, `${stem}-tts.mp3`);
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata("de-DE-KatjaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(word);
    await pipeline(audioStream, createWriteStream(destPath));
  } catch {
    await unlink(destPath).catch(() => {});
    return null;
  } finally {
    tts.close();
  }
  const info = await stat(destPath).catch(() => null);
  if (!info || info.size === 0) {
    await unlink(destPath).catch(() => {});
    return null;
  }
  return `audio/${stem}-tts.mp3`;
}

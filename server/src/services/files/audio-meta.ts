import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let ffprobeAvailable: boolean | null = null;

async function checkFfprobeAvailable(): Promise<boolean> {
  if (ffprobeAvailable !== null) return ffprobeAvailable;
  try {
    await execFileAsync("ffprobe", ["-version"]);
    ffprobeAvailable = true;
  } catch {
    ffprobeAvailable = false;
    console.warn("ffprobe not found -- audio recording duration metadata disabled");
  }
  return ffprobeAvailable;
}

/** Best-effort duration probe for uploaded audio files.
 * Returns null when ffprobe is unavailable or parsing fails.
 * Never throws; upload flow should not fail solely on missing metadata. */
export async function probeAudioDurationSeconds(filePath: string): Promise<number | null> {
  if (!(await checkFfprobeAvailable())) return null;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath,
    ]);
    const seconds = Number.parseFloat(stdout.trim());
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 10) / 10 : null;
  } catch {
    return null;
  }
}


import { createHash } from "node:crypto";
import path from "node:path";
import { synthesizeTtsToPath } from "../enrichment/audio.js";

const generatedAudioDir = path.join(import.meta.dirname, "..", "..", "..", "data", "generated-listening-audio");
const pendingSynthesis = new Map<string, Promise<string | null>>();

function audioPathFor(transcript: string): string {
  const fingerprint = createHash("sha256").update(transcript).digest("hex");
  return path.join(generatedAudioDir, `${fingerprint}.mp3`);
}

/**
 * Produces a stable, server-cached MP3 for authored transcript content. The
 * transcript hash makes cache invalidation automatic when curriculum authors
 * revise a lesson, without encoding lesson text in a filesystem path.
 */
export function listeningAudioFor(transcript: string): Promise<string | null> {
  const destination = audioPathFor(transcript);
  const pending = pendingSynthesis.get(destination);
  if (pending) return pending;

  const synthesis = synthesizeTtsToPath(transcript, destination)
    .then((created) => (created ? destination : null))
    .finally(() => pendingSynthesis.delete(destination));
  pendingSynthesis.set(destination, synthesis);
  return synthesis;
}

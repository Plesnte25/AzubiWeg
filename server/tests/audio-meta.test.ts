import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { probeAudioDurationSeconds } from "../src/services/files/audio-meta.js";

describe("probeAudioDurationSeconds", () => {
  it("returns null for non-audio files", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "azubiweg-audio-meta-"));
    const filePath = path.join(dir, "not-audio.txt");
    try {
      await writeFile(filePath, "hello");
      const duration = await probeAudioDurationSeconds(filePath);
      expect(duration).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});


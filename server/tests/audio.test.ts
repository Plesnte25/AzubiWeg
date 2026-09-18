import { describe, expect, it } from "vitest";
import { isPlausibleAudioSize, isValidAudioMeta, type DurationProbeResult } from "../src/services/enrichment/audio.js";

const ok = (seconds: number): DurationProbeResult => ({ status: "ok", seconds });
const unavailable: DurationProbeResult = { status: "unavailable" };
const failed: DurationProbeResult = { status: "failed" };

// Pure-function tests only, no real network/ffmpeg/ffprobe calls -- see
// CLAUDE.md's testing conventions.

describe("isPlausibleAudioSize", () => {
  it("rejects an empty file", () => {
    expect(isPlausibleAudioSize(0)).toBe(false);
  });

  it("rejects a truncated/near-empty file below the threshold", () => {
    expect(isPlausibleAudioSize(1500)).toBe(false);
  });

  it("accepts a plausibly-real audio file size", () => {
    expect(isPlausibleAudioSize(5000)).toBe(true);
  });

  it("accepts a custom threshold override", () => {
    expect(isPlausibleAudioSize(100, 50)).toBe(true);
    expect(isPlausibleAudioSize(40, 50)).toBe(false);
  });
});

describe("isValidAudioMeta", () => {
  it("rejects an implausible size regardless of duration", () => {
    expect(isValidAudioMeta(0, ok(5))).toBe(false);
    expect(isValidAudioMeta(1000, ok(5))).toBe(false);
  });

  it("rejects a near-silent duration even when size passes", () => {
    expect(isValidAudioMeta(5000, ok(0.1))).toBe(false);
    expect(isValidAudioMeta(5000, ok(0))).toBe(false);
  });

  it("accepts a plausible size with a real duration", () => {
    expect(isValidAudioMeta(5000, ok(0.8))).toBe(true);
  });

  it("ffprobe unavailable (binary missing entirely) -- degrades to size-only validation, still passes a good file", () => {
    expect(isValidAudioMeta(5000, unavailable)).toBe(true);
  });

  it("ffprobe unavailable AND a bad size -- still rejected on size alone", () => {
    expect(isValidAudioMeta(500, unavailable)).toBe(false);
  });

  it("ffprobe AVAILABLE but failed to parse this specific file -- rejected, not waved through on size alone (the fix for this review round)", () => {
    // Distinct from "unavailable": ffprobe is installed and ran, but this
    // particular file didn't parse (corrupt/truncated audio stream, non-
    // numeric duration output, etc.) -- a healthy file this app just wrote
    // should always be parseable, so a per-file parse failure is itself
    // evidence of corruption, unlike a system-wide missing binary.
    expect(isValidAudioMeta(5000, failed)).toBe(false);
  });

  it("a per-file parse failure is rejected even when size alone would have passed", () => {
    expect(isValidAudioMeta(1_000_000, failed)).toBe(false);
  });
});

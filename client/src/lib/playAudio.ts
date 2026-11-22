import { ApiError, getToken } from "../api/client";

/**
 * One shared element for every pronunciation/listening clip. iOS Safari only lets an element play from inside a user
 * gesture, and the gesture is gone by the time the authed fetch resolves (TTS on a cache miss takes 1–3 s), so
 * `new Audio(blob).play()` after the await was rejected with NotAllowedError ("couldn't play"). Starting a silent clip
 * on this element synchronously in the tap unlocks it; later `src` swaps on the same element then play fine, including
 * the auto-play when a listening question appears.
 */
let shared: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let generation = 0;

/** A 10 ms silent 8 kHz mono WAV (every browser decodes WAV), built once. */
let silentUri: string | null = null;
function silentWav(): string {
  if (silentUri) return silentUri;
  const samples = 80;
  const buf = new DataView(new ArrayBuffer(44 + samples));
  const str = (o: number, s: string) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  buf.setUint32(4, 36 + samples, true);
  str(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true); // PCM
  buf.setUint16(22, 1, true); // mono
  buf.setUint32(24, 8000, true);
  buf.setUint32(28, 8000, true);
  buf.setUint16(32, 1, true);
  buf.setUint16(34, 8, true);
  str(36, "data");
  buf.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) buf.setUint8(44 + i, 128); // 8-bit PCM silence
  let bin = "";
  new Uint8Array(buf.buffer).forEach((b) => (bin += String.fromCharCode(b)));
  silentUri = `data:audio/wav;base64,${btoa(bin)}`;
  return silentUri;
}

/** Recently fetched clips by URL, so a preloaded card plays the moment it's flipped. Failures aren't kept. */
const blobs = new Map<string, Promise<Blob>>();
const MAX_CACHED = 12;

function fetchAudio(url: string): Promise<Blob> {
  const hit = blobs.get(url);
  if (hit) return hit;
  const p = (async () => {
    const token = getToken();
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(res.status, res.status === 503 ? "Pronunciation couldn't be generated, try again shortly" : body?.error ?? "Audio not available");
    }
    return res.blob();
  })();
  blobs.set(url, p);
  p.catch(() => blobs.delete(url));
  while (blobs.size > MAX_CACHED) blobs.delete(blobs.keys().next().value!);
  return p;
}

/** Fetches a clip ahead of time (e.g. while a flashcard's front is showing); errors surface on play instead. */
export function preloadAuthedAudio(url: string): void {
  fetchAudio(url).catch(() => {});
}

/**
 * Plays an authenticated audio URL (the API needs the bearer token, so an <audio src> can't fetch it directly).
 * Call it synchronously from the click handler, before any await, so the unlock happens inside the gesture.
 * Rejects with an Error whose message is fit for a toast.
 */
export async function playAuthedAudio(url: string): Promise<void> {
  const my = ++generation;
  const audio = (shared ??= new Audio());
  audio.pause();
  audio.src = silentWav();
  const unlocked = audio.play().catch(() => {}); // outside a gesture (auto-play) this may be refused; harmless

  const blob = await fetchAudio(url);
  await unlocked;
  if (my !== generation) return; // a newer tap took over the element

  if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
  currentBlobUrl = URL.createObjectURL(blob);
  audio.src = currentBlobUrl;
  try {
    await audio.play();
  } catch (e) {
    if (my !== generation) return;
    const name = e instanceof DOMException ? e.name : "";
    throw new Error(name === "NotAllowedError" ? "Tap the speaker to play" : "This audio file couldn't be played");
  }
}

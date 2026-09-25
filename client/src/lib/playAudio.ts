import { getToken } from "../api/client";

/** Plays an authenticated audio URL (the API needs the bearer token, so an <audio src> can't fetch it directly). */
export async function playAuthedAudio(url: string): Promise<void> {
  const token = getToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Audio not available");
  const blobUrl = URL.createObjectURL(await res.blob());
  const audio = new Audio(blobUrl);
  audio.addEventListener("ended", () => URL.revokeObjectURL(blobUrl));
  await audio.play();
}

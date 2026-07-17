import { randomUUID } from "node:crypto";
import path from "node:path";

export function uploadsDir(userId: string): string {
  return path.join(import.meta.dirname, "..", "..", "..", "data", "uploads", userId);
}

// mime type is authoritative for the stored extension; originalName is only
// ever used for the download filename header
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/plain": ".txt",
};

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Server-generated disk name for an upload: a random UUID plus the extension
 * for the (whitelisted) mime type. Nothing from the client-supplied name ever
 * reaches the filesystem, so paths are traversal-safe by construction.
 * Returns null for disallowed mime types.
 */
export function storedNameFor(mimeType: string): string | null {
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) return null;
  return randomUUID() + ext;
}

/**
 * Content-Disposition value that survives non-ASCII original names
 * (e.g. "Zeugnis-Übersetzung.pdf") per RFC 5987/6266: an ASCII fallback in
 * `filename` plus the UTF-8 `filename*` form.
 */
export function contentDispositionFor(originalName: string, inline = false): string {
  const type = inline ? "inline" : "attachment";
  const fallback = originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(originalName)
    .replace(/['()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/\*/g, "%2A");
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

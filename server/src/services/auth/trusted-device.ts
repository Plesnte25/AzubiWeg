import { createHash, randomBytes } from "node:crypto";

/**
 * Trusted devices: a user who ticks "Trust this device" when signing in gets a random device token, kept in that
 * browser's localStorage. The sign-in page then offers one-click entry (POST /auth/device-login) instead of the
 * password. Only a SHA-256 of the token is stored, so a database leak can't be replayed. The token rotates on every
 * use, and the trust lapses after TRUST_DAYS without a sign-in from that device.
 */
export const TRUST_DAYS = 90;
const DAY_MS = 86_400_000;

/** A fresh 256-bit device token (URL-safe). */
export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** When a device's trust lapses if it isn't used again: TRUST_DAYS from `now`. */
export function trustExpiry(now: Date): Date {
  return new Date(now.getTime() + TRUST_DAYS * DAY_MS);
}

export function isTrustUsable(record: { expiresAt: Date }, now: Date): boolean {
  return record.expiresAt.getTime() > now.getTime();
}

/** A short human label for the device list, e.g. "Chrome on Android". Best effort; null when nothing matches. */
export function deviceLabel(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}

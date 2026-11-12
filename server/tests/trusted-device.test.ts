import { describe, expect, it } from "vitest";
import { TRUST_DAYS, deviceLabel, hashDeviceToken, isTrustUsable, newDeviceToken, trustExpiry } from "../src/services/auth/trusted-device.js";

describe("trusted device tokens", () => {
  it("are 256-bit, URL-safe and unique", () => {
    const a = newDeviceToken();
    const b = newDeviceToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hash deterministically to SHA-256 hex, never to the token itself", () => {
    const t = newDeviceToken();
    expect(hashDeviceToken(t)).toBe(hashDeviceToken(t));
    expect(hashDeviceToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDeviceToken(t)).not.toBe(t);
  });
});

describe("trust expiry", () => {
  const now = new Date("2026-11-12T10:00:00Z");

  it(`lasts ${TRUST_DAYS} days from the last use`, () => {
    expect(trustExpiry(now).toISOString()).toBe("2027-02-10T10:00:00.000Z");
  });

  it("is usable until the expiry instant, not at or after it", () => {
    const expiresAt = trustExpiry(now);
    expect(isTrustUsable({ expiresAt }, now)).toBe(true);
    expect(isTrustUsable({ expiresAt }, new Date(expiresAt.getTime() - 1))).toBe(true);
    expect(isTrustUsable({ expiresAt }, expiresAt)).toBe(false);
    expect(isTrustUsable({ expiresAt }, new Date(expiresAt.getTime() + 1))).toBe(false);
  });
});

describe("deviceLabel", () => {
  it.each([
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36", "Chrome on Android"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "Safari on iOS"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0", "Edge on Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0", "Firefox on Linux"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", "Safari on macOS"],
  ])("%s → %s", (ua, label) => {
    expect(deviceLabel(ua)).toBe(label);
  });

  it("is null without a user agent and falls back to whatever part it recognises", () => {
    expect(deviceLabel(undefined)).toBeNull();
    expect(deviceLabel("curl/8.5.0")).toBeNull();
    expect(deviceLabel("SomeBot (Windows)")).toBe("Windows");
  });
});

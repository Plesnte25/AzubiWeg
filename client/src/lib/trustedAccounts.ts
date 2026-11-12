import type { User } from "../api/types";

/**
 * Accounts this browser is trusted for: the sign-in page shows each as an avatar for one-click entry
 * (POST /api/auth/device-login). Set when "Trust this device" is ticked on sign-in; the server rotates the device
 * token on every use, so `save()` must run with the returned one each time.
 *
 * Deliberately separate from the session keys (`token`/`user`/`isDemo` in api/client.ts): `clearSession()` (log out,
 * or the 401 handler when the 30-day session expires) leaves this alone, so the next visit to /login offers the
 * avatar instead of the password. Only "Forget this device", revoke-all or a rejected token removes an entry.
 */
export type TrustedAccount = { userId: string; name: string; email: string; deviceToken: string };

const KEY = "azubiweg-trusted-accounts";

function read(): TrustedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (a): a is TrustedAccount =>
            !!a && typeof a.userId === "string" && typeof a.deviceToken === "string" && typeof a.email === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function write(accounts: TrustedAccount[]): void {
  try {
    if (accounts.length) localStorage.setItem(KEY, JSON.stringify(accounts));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode etc.): the device simply isn't remembered
  }
}

export const trustedAccounts = {
  list: read,
  get: (userId: string) => read().find((a) => a.userId === userId) ?? null,
  /** Adds or refreshes this account (most recent first). */
  save(user: User, deviceToken: string): void {
    const rest = read().filter((a) => a.userId !== user.id);
    write([{ userId: user.id, name: user.name, email: user.email, deviceToken }, ...rest]);
  },
  remove(userId: string): void {
    write(read().filter((a) => a.userId !== userId));
  },
};

/** "tanzeel@example.com" → "ta•••@example.com", so the sign-in page doesn't print the full address. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}

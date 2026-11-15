/**
 * Live sync: every open tab/device of a user holds one Server-Sent Events
 * stream (GET /api/events). After any successful write, the user's other
 * streams get a "change" event and the client refetches what's on screen.
 *
 * In-memory on purpose: production runs a single Node process (systemd
 * azubiweg.service), so there is no second instance to fan out to. If that
 * ever changes, swap this for Postgres LISTEN/NOTIFY.
 */

export interface LiveClient {
  /** Per-tab id sent by the client (X-Client-Id), so a tab isn't told about its own writes. */
  clientId: string;
  send: (event: string, data: unknown) => void;
}

const clientsByUser = new Map<string, Set<LiveClient>>();

export function subscribe(userId: string, client: LiveClient): () => void {
  let set = clientsByUser.get(userId);
  if (!set) {
    set = new Set();
    clientsByUser.set(userId, set);
  }
  set.add(client);
  return () => {
    set.delete(client);
    if (set.size === 0) clientsByUser.delete(userId);
  };
}

/** Tells every stream of `userId` except the originating tab that `scope` changed. Returns how many were notified. */
export function publish(userId: string, scope: string, originClientId?: string): number {
  const set = clientsByUser.get(userId);
  if (!set) return 0;
  let sent = 0;
  for (const client of set) {
    if (originClientId && client.clientId === originClientId) continue;
    client.send("change", { scope });
    sent++;
  }
  return sent;
}

export function connectionCount(userId: string): number {
  return clientsByUser.get(userId)?.size ?? 0;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Writes that don't change anything another device shows: auth (sign-in,
// trusted-device rotation) and the activity heartbeat, which fires every few
// minutes from every visible tab and would otherwise make all devices refetch.
const IGNORED_PREFIXES = ["/api/auth", "/api/activity", "/api/events"];

/** The scope a successful request should broadcast, or null if it shouldn't. "/api/learning/roadmap/x" → "learning". */
export function changeScope(method: string, path: string, status: number): string | null {
  if (!MUTATING.has(method) || status >= 400) return null;
  if (!path.startsWith("/api/")) return null;
  if (IGNORED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return path.split("/")[2] || null;
}

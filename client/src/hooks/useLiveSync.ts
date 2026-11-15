import { useEffect } from "react";
import { type Query, useQueryClient } from "@tanstack/react-query";
import { CLIENT_ID, getToken } from "../api/client";

// Several writes usually land together (a review grade touches words, reviews
// and the dashboard), so wait a moment and refetch once.
const DEBOUNCE_MS = 400;
const RETRY_MIN_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/**
 * Queries with staleTime: Infinity are deliberately frozen snapshots: the
 * review queue a session is working through, a drill's question round. A
 * write from another device must not reshuffle them mid-session; they
 * refresh the next time they're opened, as before.
 */
function isLive(query: Query): boolean {
  const staleTime = (query.options as { staleTime?: unknown }).staleTime;
  return staleTime !== Infinity;
}

/**
 * Keeps this tab in step with the user's other tabs and devices. Holds one
 * Server-Sent Events stream (GET /api/events); when another device writes
 * something, refetches every query on screen and marks the rest stale.
 *
 * Uses fetch rather than EventSource because EventSource can't send the
 * Authorization header, and the token shouldn't go in a URL (it would end
 * up in access logs). Reconnects with backoff; after any gap (a phone waking
 * from sleep, a network change) it refetches once, since events sent while
 * disconnected are gone.
 */
export function useLiveSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let retryMs = RETRY_MIN_MS;
    let connectedOnce = false;
    let inFlight = false; // a connect is running (fetching or streaming)

    const refresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void queryClient.invalidateQueries({ predicate: isLive });
      }, DEBOUNCE_MS);
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    };

    async function connect() {
      const token = getToken();
      if (stopped || !token || inFlight) return;
      inFlight = true;
      controller = new AbortController();
      try {
        const res = await fetch(`/api/events?clientId=${encodeURIComponent(CLIENT_ID)}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
          cache: "no-store",
        });
        // 401 is left to the normal request path, which signs the user out; don't hammer the server meanwhile.
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        retryMs = RETRY_MIN_MS;
        if (connectedOnce) refresh(); // anything could have changed while we were away
        connectedOnce = true;

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end: number;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (/^event: change$/m.test(block)) refresh();
          }
        }
      } catch {
        // aborted on unmount, network drop, or server restart: fall through to reconnect
      }
      inFlight = false;
      scheduleReconnect();
    }

    // Mobile browsers freeze background tabs and silently drop their sockets.
    // Coming back to the tab reconnects at once instead of waiting out the backoff.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || inFlight || stopped) return;
      clearTimeout(retryTimer);
      retryMs = RETRY_MIN_MS;
      void connect();
    };
    const onOnline = () => onVisible();

    void connect();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(retryTimer);
      clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);
}

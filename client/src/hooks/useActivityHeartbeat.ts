import { useEffect } from "react";
import { api } from "../api/client";

const HEARTBEAT_MS = 3 * 60 * 1000;
// Must stay comfortably above HEARTBEAT_MS so a normal reading pause between
// two heartbeats doesn't get penalized, but well under session.ts's
// SESSION_GAP_MINUTES (10) so an idle-but-visible tab reliably breaks the
// session cluster instead of silently stitching a whole day of no real
// engagement into one giant "active" span (a real account was found with
// 1439 minutes — nearly 24h straight — logged for a single day from exactly
// this: a visible tab left open with nobody at the keyboard).
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/** Pings the server every few minutes, only while the tab is visible AND the
 * user has actually interacted recently — a bare visible-tab timer (the
 * previous behavior) can't distinguish "studying" from "left the tab open
 * and walked away," so it isn't real idle detection but real-input tracking:
 * cheap, passive listeners just to know whether *anything* happened
 * recently, not full engagement analysis. */
export function useActivityHeartbeat() {
  useEffect(() => {
    let lastActivityAt = Date.now();
    const markActive = () => {
      lastActivityAt = Date.now();
    };
    const ping = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivityAt < IDLE_THRESHOLD_MS) {
        void api.activityPing().catch(() => {});
      }
    };
    for (const evt of ACTIVITY_EVENTS) document.addEventListener(evt, markActive, { passive: true });
    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      for (const evt of ACTIVITY_EVENTS) document.removeEventListener(evt, markActive);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
}

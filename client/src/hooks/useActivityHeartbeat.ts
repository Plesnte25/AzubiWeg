import { useEffect } from "react";
import { api } from "../api/client";

const HEARTBEAT_MS = 3 * 60 * 1000;

/** Pings the server every few minutes, only while the tab is actually
 * visible — deliberately simple (no idle detection), enough to turn "time in
 * app" into more than a self-reported number. */
export function useActivityHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === "visible") void api.activityPing().catch(() => {});
    };
    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
}

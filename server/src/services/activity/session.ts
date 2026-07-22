// A deliberately simple model: the client heartbeats every few minutes while
// the tab is visible. Consecutive pings within SESSION_GAP_MINUTES of each
// other count as one continuous session; a bigger gap starts a new one. Not
// full idle-detection — just enough to turn "I opened the app" into a
// realistic minutes-spent number instead of pure self-reporting.

export const HEARTBEAT_INTERVAL_MINUTES = 3;
export const SESSION_GAP_MINUTES = 10;

export interface Session {
  start: Date;
  end: Date;
  minutes: number;
}

function toSession(start: Date, end: Date, tailMinutes: number): Session {
  return { start, end, minutes: Math.round((end.getTime() - start.getTime()) / 60000) + tailMinutes };
}

/**
 * Clusters raw ping timestamps into sessions. Each session's duration is the
 * span between its first and last ping, plus one heartbeat interval — so a
 * single isolated ping still counts as a short session rather than zero.
 */
export function clusterPingsIntoSessions(
  pingedAts: Date[],
  gapMinutes: number = SESSION_GAP_MINUTES,
  tailMinutes: number = HEARTBEAT_INTERVAL_MINUTES,
): Session[] {
  if (pingedAts.length === 0) return [];
  const sorted = [...pingedAts].sort((a, b) => a.getTime() - b.getTime());

  const sessions: Session[] = [];
  let start = sorted[0]!;
  let end = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const ping = sorted[i]!;
    const gap = (ping.getTime() - end.getTime()) / 60000;
    if (gap <= gapMinutes) {
      end = ping;
    } else {
      sessions.push(toSession(start, end, tailMinutes));
      start = ping;
      end = ping;
    }
  }
  sessions.push(toSession(start, end, tailMinutes));
  return sessions;
}

export function totalActiveMinutes(
  pingedAts: Date[],
  gapMinutes?: number,
  tailMinutes?: number,
): number {
  return clusterPingsIntoSessions(pingedAts, gapMinutes, tailMinutes).reduce((sum, s) => sum + s.minutes, 0);
}

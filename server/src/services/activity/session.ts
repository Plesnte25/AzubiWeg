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

export interface ActivityPingRow {
  pingedAt: Date;
  /** Sent by the client heartbeat: true while on a learning route (Words, Review, Plan, Exam). */
  learning: boolean;
}

/**
 * Total active minutes plus the Lernzeit share (Bento "Lernzeit" = active minutes on learning routes only). Pings are
 * clustered into sessions exactly as `totalActiveMinutes` does, and each session's minutes are credited to learning
 * in proportion to its learning pings, so a session that wanders between Words and Jobs only counts the Words part.
 * Proportional-per-session rather than clustering the learning pings alone: that would bridge a 9-minute detour to
 * Jobs between two Words pings and count it as learning.
 */
export function splitActiveMinutes(
  pings: ActivityPingRow[],
  gapMinutes: number = SESSION_GAP_MINUTES,
  tailMinutes: number = HEARTBEAT_INTERVAL_MINUTES,
): { minutes: number; learningMinutes: number } {
  if (pings.length === 0) return { minutes: 0, learningMinutes: 0 };
  const sorted = [...pings].sort((a, b) => a.pingedAt.getTime() - b.pingedAt.getTime());

  let minutes = 0;
  let learningMinutes = 0;
  let group: ActivityPingRow[] = [sorted[0]!];
  const flush = () => {
    const session = toSession(group[0]!.pingedAt, group[group.length - 1]!.pingedAt, tailMinutes);
    const learningShare = group.filter((p) => p.learning).length / group.length;
    minutes += session.minutes;
    learningMinutes += Math.round(session.minutes * learningShare);
  };
  for (let i = 1; i < sorted.length; i++) {
    const ping = sorted[i]!;
    const gap = (ping.pingedAt.getTime() - group[group.length - 1]!.pingedAt.getTime()) / 60000;
    if (gap <= gapMinutes) {
      group.push(ping);
    } else {
      flush();
      group = [ping];
    }
  }
  flush();
  return { minutes, learningMinutes };
}

/** Lernzeit for a finalized day: the split when it was recorded, else the pre-split total (history before the
 * learning flag existed can't be split, so it keeps counting every page). */
export function dayLernzeit(day: { minutes: number; learningMinutes: number | null }): number {
  return day.learningMinutes ?? day.minutes;
}

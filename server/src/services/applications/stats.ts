import type { ApplicationStatus, ApplicationEventType } from "@prisma/client";

export interface StatsApplication {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  createdAt: Date;
}

export interface StatsEvent {
  applicationId: string;
  type: ApplicationEventType;
  toStatus: ApplicationStatus | null;
  occurredAt: Date;
}

export interface ApplicationStats {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
  /** share of applied applications that got any response (interview/offer/rejected); null when nothing applied */
  responseRate: number | null;
  /** share of applied applications that reached at least an interview; null when nothing applied */
  interviewRate: number | null;
  offers: number;
  /** mean days from appliedAt to the first response status change; null without data */
  avgDaysToResponse: number | null;
  /** applications marked applied per ISO week, most recent `weeks` weeks */
  weeklyActivity: { weekStart: string; applied: number }[];
}

const DAY_MS = 86_400_000;
const RESPONSE_STATUSES = new Set<ApplicationStatus>(["interview", "offer", "rejected"]);

function startOfIsoWeek(d: Date): Date {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (day.getDay() + 6) % 7; // Monday = 0
  day.setDate(day.getDate() - dow);
  return day;
}

function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function computeStats(
  apps: StatsApplication[],
  events: StatsEvent[],
  today: Date,
  weeks = 8,
): ApplicationStats {
  const byStatus: Record<ApplicationStatus, number> = {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const app of apps) byStatus[app.status]++;

  // "ever applied" = has an appliedAt date (set on first move into applied)
  const applied = apps.filter((a) => a.appliedAt !== null);
  const firstResponse = new Map<string, Date>();
  for (const e of events) {
    if (e.type !== "status_change" || !e.toStatus || !RESPONSE_STATUSES.has(e.toStatus)) continue;
    const seen = firstResponse.get(e.applicationId);
    if (!seen || e.occurredAt < seen) firstResponse.set(e.applicationId, e.occurredAt);
  }

  const responded = applied.filter((a) => firstResponse.has(a.id));
  const interviewed = applied.filter((a) =>
    events.some(
      (e) =>
        e.applicationId === a.id &&
        e.type === "status_change" &&
        (e.toStatus === "interview" || e.toStatus === "offer"),
    ),
  );

  const responseDays = responded
    .map((a) => (firstResponse.get(a.id)!.getTime() - a.appliedAt!.getTime()) / DAY_MS)
    .filter((d) => d >= 0);

  const weekStarts: Date[] = [];
  const thisWeek = startOfIsoWeek(today);
  for (let i = weeks - 1; i >= 0; i--) {
    const w = new Date(thisWeek);
    w.setDate(w.getDate() - i * 7);
    weekStarts.push(w);
  }
  const weeklyActivity = weekStarts.map((start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      weekStart: localDateKey(start),
      applied: applied.filter((a) => a.appliedAt! >= start && a.appliedAt! < end).length,
    };
  });

  return {
    total: apps.length,
    active: apps.length - byStatus.rejected,
    byStatus,
    responseRate: applied.length ? responded.length / applied.length : null,
    interviewRate: applied.length ? interviewed.length / applied.length : null,
    offers: byStatus.offer,
    avgDaysToResponse: responseDays.length
      ? Math.round(responseDays.reduce((a, b) => a + b, 0) / responseDays.length)
      : null,
    weeklyActivity,
  };
}

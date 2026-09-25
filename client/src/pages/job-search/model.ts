import type { Icon } from "@phosphor-icons/react";
import { Handshake, PaperPlaneTilt, Star, Trophy } from "@phosphor-icons/react";
import type { Application, ApplicationStatus, CefrLevel, GermanLevel } from "../../api/types";

/*
 * Jobs pinboard model (AzubiJobs.dc.html, dir a). Stage map and colours are the prototype's `STG`/`STC`; rejected
 * isn't a column — it's the "N closed" count, set from the detail modal's "Mark rejected".
 */

export type BoardStage = Exclude<ApplicationStatus, "rejected">;

export const STAGES: { id: BoardStage; label: string; icon: Icon }[] = [
  { id: "wishlist", label: "Wishlist", icon: Star },
  { id: "applied", label: "Applied", icon: PaperPlaneTilt },
  { id: "interview", label: "Interview", icon: Handshake },
  { id: "offer", label: "Offer", icon: Trophy },
];

export const STAGE_LABEL: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const STAGE_COLOR: Record<ApplicationStatus, string> = {
  wishlist: "var(--plain2)",
  applied: "var(--sky)",
  interview: "var(--lemon)",
  offer: "var(--mint)",
  rejected: "var(--plain2)",
};

/** Text colour on a stage fill: wishlist's plain2 takes plain text, the colours take onTile. */
export const stageText = (s: ApplicationStatus) => (s === "wishlist" || s === "rejected" ? "var(--plainText)" : "var(--onTile)");

const LEVELS: GermanLevel[] = ["a1", "a2", "b1", "b2", "c1", "c2"];
export const levelIndex = (l: GermanLevel | CefrLevel) => LEVELS.indexOf(l);
export const GERMAN_LEVELS = LEVELS;

/** Levels the posting asks for above the one you're working on (0 = you meet it). */
export function levelGap(asked: GermanLevel, yours: CefrLevel): number {
  return Math.max(0, levelIndex(asked) - levelIndex(yours));
}

/**
 * How far along you are toward the asked level, for the German card's bar: whole levels behind you plus the active
 * level's Level %, over the levels needed. A met requirement is a full bar.
 */
export function levelProgress(asked: GermanLevel, yours: CefrLevel, percent: number): number {
  if (levelGap(asked, yours) === 0) return 100;
  return Math.round(((levelIndex(yours) + percent / 100) / levelIndex(asked)) * 100);
}

export function levelMessage(asked: GermanLevel, yours: CefrLevel): string {
  const gap = levelGap(asked, yours);
  const A = asked.toUpperCase();
  if (gap === 0) return "You meet the requirement. Polish the interview phrases.";
  if (gap === 1) return `Gap of one level. Show your ${A} plan in the interview.`;
  const next = LEVELS[levelIndex(yours) + 1]!.toUpperCase();
  return `${A} is a stretch for now. Ask if a ${next} certificate is enough.`;
}

const COMPANY_COLORS = ["lemon", "sky", "lilac", "mint", "pink", "orange", "tomato"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A stable colour per company (the prototype hand-picks one per seed card; real data has none stored). */
export const companyColor = (company: string) => `var(--${COMPANY_COLORS[hash(company.toLowerCase()) % COMPANY_COLORS.length]})`;

export const initials = (company: string) =>
  company
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Card tilt, the prototype's four-step cycle. */
export const cardTilt = (id: string, i: number) => [-1.2, 0.9, -0.6, 1.1][(hash(id) + i) % 4]!;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
export const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const weekdayDayMonth = (d: Date) => `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${dayMonth(d)}`;
export const clockTime = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
/** An event logged without a time is stored at local midnight; don't print "00:00" for it. */
export const hasTime = (d: Date) => d.getHours() !== 0 || d.getMinutes() !== 0;

/** `appliedAt` is a @db.Date (UTC midnight); read it with UTC getters so it doesn't shift a day west of UTC. */
function utcDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The card's date line. */
export function whenLine(a: Application): string {
  if (a.nextInterviewAt) {
    const d = new Date(a.nextInterviewAt);
    return `Interview ${weekdayDayMonth(d)}${hasTime(d) ? ` · ${clockTime(d)}` : ""}`;
  }
  if (a.status === "wishlist") return `Saved ${dayMonth(new Date(a.createdAt))}`;
  if (a.appliedAt) return `Sent ${dayMonth(utcDay(a.appliedAt))}`;
  return `Added ${dayMonth(new Date(a.createdAt))}`;
}

/** "via …" in the detail tag: the portal, else whether it came from a link. */
export const sourceLabel = (a: Pick<Application, "portal" | "url">) => a.portal ?? (a.url ? "link" : "manual");

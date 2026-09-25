import type { CSSProperties } from "react";

/* Shared bits of the Settings prototype (AzubiSettings.dc.html renderVals: `chip`, the tile kickers). */

export const k = (px: number) => `calc(var(--k) * ${px}px)`;

/** The prototype's `chip(on)`: plain pill, or `--sel` with a 2px shadow and −1.5° tilt when on. */
export function chip(on: boolean, extra?: CSSProperties): CSSProperties {
  return {
    height: 36,
    padding: "0 13px",
    border: "2.5px solid var(--line)",
    borderRadius: 999,
    background: on ? "var(--sel)" : "var(--plain)",
    color: on ? "var(--selText)" : "var(--plainText)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: on ? "2px 2px 0 var(--shadow)" : "none",
    transform: on ? "rotate(-1.5deg)" : "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    boxSizing: "border-box",
    ...extra,
  };
}

export const label: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sat 20 Feb" / "Sat 20 Feb 2027". */
export const fmtDay = (d: Date, year = false) => `${WD[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ""}`;

/** "today" / "yesterday" / "3 days ago" / "12 Sep". */
export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${d.getDate()} ${MN[d.getMonth()]}`;
}

/** "just now" / "4 min ago" / "2 h ago" / relativeDay. */
export function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return relativeDay(iso);
}

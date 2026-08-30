import { Briefcase, Cards, ChartLineUp, House, Path } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface NavDestination {
  to: string;
  label: string;
  /** exact-match only (e.g. Today's "/") — see isActivePath() */
  end?: boolean;
  icon: Icon;
}

// The 5 top-level destinations, confirmed against the handoff's main
// interactive prototype (German Companion App.dc.html's goHome/goVocab/
// goRoadmap/goJobs/goProgress handlers + JOBS/ph-briefcase tab) — note the
// bundle's standalone TabBar.dc.html sub-component shows a stale "Notes"
// 4th tab instead of Jobs; the main prototype (the README's own designated
// "primary reference") is authoritative and was cross-checked twice
// (its prose nav-model section + the actual live tab markup) before this
// was settled. Shared by every nav surface so they can't drift out of sync.
export const NAV_DESTINATIONS: NavDestination[] = [
  { to: "/", label: "Today", end: true, icon: House },
  { to: "/words", label: "Words", icon: Cards },
  { to: "/plan", label: "Plan", icon: Path },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/stats", label: "Stats", icon: ChartLineUp },
];

export function isActivePath(to: string, end: boolean | undefined, pathname: string): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

import { BookOpen, Briefcase, Cards, ChartLineUp, Exam, House, Path } from "@phosphor-icons/react";
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

export interface QuickLink extends NavDestination {
  /** Single-letter "G <shortcut>" chord (Gmail/Superhuman-style, see
   * Layout.tsx's global listener) — first letter of the label where it's
   * unique, otherwise a real subsequent letter from the label (documented
   * per entry below) so every shortcut is still traceable to its name
   * rather than an arbitrary pick. "s" is reserved for Syllabus (matching
   * the reference design) since Stats/Sources/Self-tests all also start
   * with S. */
  shortcut: string;
}

// The command palette's "Jump to" set — NAV_DESTINATIONS' 5 tabs plus 3
// deeper routes worth a direct shortcut. Shared with Layout.tsx's global
// G-chord listener so the two can never drift out of sync.
export const QUICK_LINKS: QuickLink[] = [
  { to: "/", label: "Today", icon: House, shortcut: "t" },
  { to: "/words", label: "Words", icon: Cards, shortcut: "w" },
  { to: "/plan", label: "Plan", icon: Path, shortcut: "p" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, shortcut: "j" },
  { to: "/plan/syllabus", label: "Syllabus", icon: Path, shortcut: "s" },
  { to: "/plan/sources", label: "Sources", icon: BookOpen, shortcut: "o" }, // 2nd letter — "s" taken by Syllabus
  { to: "/stats", label: "Stats", icon: ChartLineUp, shortcut: "a" }, // 2nd letter — "s" taken by Syllabus
  { to: "/plan/self-tests", label: "Self-tests", icon: Exam, shortcut: "e" }, // 2nd letter — "s" taken by Syllabus
];

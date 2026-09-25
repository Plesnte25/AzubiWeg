import { Briefcase, Cards, ChartLineUp, House, NotePencil, Path } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface NavDestination {
  to: string;
  label: string;
  /** exact-match only (e.g. Today's "/") — see isActivePath() */
  end?: boolean;
  icon: Icon;
}

// The six top-level destinations, in Bento nav order (handoff README §1.5: Today house · Words cards · Plan path ·
// Jobs briefcase · Stats chart-line-up · Notes note-pencil). Shared by TopNav and SmBottomNav (components/chrome)
// so the two can't drift out of sync.
export const NAV_DESTINATIONS: NavDestination[] = [
  { to: "/", label: "Today", end: true, icon: House },
  { to: "/words", label: "Words", icon: Cards },
  { to: "/plan", label: "Plan", icon: Path },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/stats", label: "Stats", icon: ChartLineUp },
  { to: "/notes", label: "Notes", icon: NotePencil },
];

export function isActivePath(to: string, end: boolean | undefined, pathname: string): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export interface QuickLink extends NavDestination {
  /** Single-letter "G <shortcut>" chord (Gmail/Superhuman-style, see Layout.tsx's global listener): the first letter
   * of each tab's name. */
  shortcut: string;
}

// The command palette's "Jump to" set — the six tabs. Shared with Layout.tsx's global G-chord listener so the two
// can never drift out of sync. (Syllabus, Sources and Self-tests were separate pages before the Plan journey; they
// now live inside Plan, so they have no jump targets of their own.)
export const QUICK_LINKS: QuickLink[] = [
  { to: "/", label: "Today", icon: House, shortcut: "t" },
  { to: "/words", label: "Words", icon: Cards, shortcut: "w" },
  { to: "/plan", label: "Plan", icon: Path, shortcut: "p" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, shortcut: "j" },
  { to: "/stats", label: "Stats", icon: ChartLineUp, shortcut: "s" },
  { to: "/notes", label: "Notes", icon: NotePencil, shortcut: "n" },
];

/** Routes whose active time counts as Lernzeit (Bento: learning routes only — Words, Review, Plan incl. self-tests
 * and the exam gate, and the exam runner). The activity heartbeat tags each ping with this. */
const LEARNING_PATH_PREFIXES = ["/words", "/review", "/plan", "/exam-take"];

export function isLearningPath(pathname: string): boolean {
  return LEARNING_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

import { BookOpen, Briefcase, Cards, ChartLineUp, Exam, House, NotePencil, Path } from "@phosphor-icons/react";
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
  /** Single-letter "G <shortcut>" chord (Gmail/Superhuman-style, see
   * Layout.tsx's global listener) — first letter of the label where it's
   * unique, otherwise a real subsequent letter from the label (documented
   * per entry below) so every shortcut is still traceable to its name
   * rather than an arbitrary pick. "s" is reserved for Syllabus (matching
   * the reference design) since Stats/Sources/Self-tests all also start
   * with S. */
  shortcut: string;
}

// The command palette's "Jump to" set — NAV_DESTINATIONS' 6 tabs plus 3
// deeper routes worth a direct shortcut. Shared with Layout.tsx's global
// G-chord listener so the two can never drift out of sync.
export const QUICK_LINKS: QuickLink[] = [
  { to: "/", label: "Today", icon: House, shortcut: "t" },
  { to: "/words", label: "Words", icon: Cards, shortcut: "w" },
  { to: "/plan", label: "Plan", icon: Path, shortcut: "p" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, shortcut: "j" },
  { to: "/notes", label: "Notes", icon: NotePencil, shortcut: "n" },
  { to: "/plan/syllabus", label: "Syllabus", icon: Path, shortcut: "s" },
  { to: "/plan/sources", label: "Sources", icon: BookOpen, shortcut: "o" }, // 2nd letter — "s" taken by Syllabus
  { to: "/stats", label: "Stats", icon: ChartLineUp, shortcut: "a" }, // 2nd letter — "s" taken by Syllabus
  { to: "/plan/self-tests", label: "Self-tests", icon: Exam, shortcut: "e" }, // 2nd letter — "s" taken by Syllabus
];

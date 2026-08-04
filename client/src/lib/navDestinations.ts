import type { ComponentType } from "react";
import { BookOpen, Briefcase, GraduationCap, LayoutDashboard, ListChecks } from "lucide-react";

export interface NavDestination {
  to: string;
  label: string;
  /** exact-match only (e.g. Dashboard's "/") — see isActivePath() */
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
}

/** The 5 top-level destinations, shared by FabNav (lg), IconRail (md), and BottomTabBar (sm) so they can't drift out of sync. */
export const NAV_DESTINATIONS: NavDestination[] = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { to: "/learning", label: "Learning Hub", icon: GraduationCap },
  { to: "/job-search", label: "Job Search", icon: Briefcase },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
];

export function isActivePath(to: string, end: boolean | undefined, pathname: string): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

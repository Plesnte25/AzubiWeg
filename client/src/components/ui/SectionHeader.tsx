import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-slot content — action button(s), a toggle-pill group, etc. */
  action?: ReactNode;
  className?: string;
}

/** Unified page header — absorbs 5 previously-distinct implementations
 * (TodayPage/ProgressPage/RoadmapPage/SyllabusPage/SourcesPage each had their
 * own h1 size, and disagreed on whether a subtitle or right-side action
 * existed). `text-heading` matches Phase 1's own hierarchy rule (one
 * text-heading per screen = the page title; text-title is for section heads
 * *within* a page, not the page's own h1). */
export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="min-w-0">
        <h1 className="text-heading font-bold">{title}</h1>
        {subtitle && <p className="text-body text-ink-600">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

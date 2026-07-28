import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { CefrLevel, RoadmapSkill } from "../api/types";
import { cn } from "../lib/cn";
import { SKILL_COLORS, SKILL_LABELS } from "../lib/skills";
import { DonutProgress } from "./ui/DonutProgress";

export interface AccordionLevel {
  level: CefrLevel;
  total: number;
  done: number;
  percent: number;
}

export interface ThemeCourse {
  theme: string;
  skill: RoadmapSkill | null;
  total: number;
  done: number;
  percent: number;
}

const LEVEL_ORDER: CefrLevel[] = ["a1", "a2", "b1"];
const LEVEL_TITLES: Record<CefrLevel, string> = { a1: "Beginner", a2: "Elementary", b1: "Intermediate" };

/** A single completed theme is highlighted green (via `ok` tokens) instead of
 * its skill color, so finished courses stand out at a glance in the list. */
function CourseRow({ course }: { course: ThemeCourse }) {
  const isDone = course.percent === 100;
  const skillColor = course.skill ? SKILL_COLORS[course.skill] : "var(--color-ink-400)";
  const barColor = isDone ? "var(--color-ok-600)" : skillColor;
  const label = course.skill ? SKILL_LABELS[course.skill] : "General";
  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink-900">
          {isDone && <Check className="size-3.5 shrink-0 text-ok-600" aria-hidden="true" />}
          <span className="truncate">{course.theme}</span>
        </p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${skillColor} 16%, transparent)`, color: skillColor }}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="shrink-0 text-xs text-ink-400">
          {course.done}/{course.total}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${course.percent}%`, backgroundColor: barColor }} />
        </div>
        <span className={cn("w-9 shrink-0 text-right text-xs font-semibold", isDone ? "text-ok-700" : "text-ink-900")}>
          {course.percent}%
        </span>
      </div>
    </div>
  );
}

/** The active panel's left strip — per the updated design, exactly ONE
 * progress indicator lives here: the strip's own background fills bottom-up
 * like a water tank (no separate bar element). Clicking it again collapses
 * the panel back to the all-closed state. */
function ActiveStrip({ level, onClose }: { level: AccordionLevel; onClose: () => void }) {
  const isDone = level.percent === 100;
  return (
    <button
      onClick={onClose}
      title="Click to collapse"
      className="relative flex w-12 shrink-0 flex-col items-center justify-between gap-2 overflow-hidden border-r border-hairline py-3.5"
    >
      <div
        className={cn("absolute inset-x-0 bottom-0 transition-[height] duration-700", isDone ? "bg-ok-500/20" : "bg-brand-500/20")}
        style={{ height: `${level.percent}%` }}
      />
      <p
        className="relative z-10 whitespace-nowrap text-sm font-bold text-ink-900"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {level.level.toUpperCase()} · {LEVEL_TITLES[level.level]}
      </p>
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        <span className={cn("text-xs font-bold", isDone ? "text-ok-700" : "text-brand-600")}>{level.percent}%</span>
        <span className="whitespace-nowrap text-[10px] text-ink-400">
          {level.done}/{level.total}
        </span>
      </div>
    </button>
  );
}

/** Horizontal accordion — one panel per CEFR level, at most one panel active
 * at a time (flex-basis transition); clicking the active panel's strip again
 * closes it, leaving all 3 collapsed and evenly filling the row's width.
 * Each level's "courses" are its real syllabus themes (e.g. "Verbs: present
 * tense"), not a fabricated concept — module count/completion come straight
 * from the syllabus. */
export default function CoursesAccordion({
  levels,
  courses,
  defaultOpenLevel,
}: {
  levels: AccordionLevel[];
  courses: Record<CefrLevel, ThemeCourse[]>;
  defaultOpenLevel: CefrLevel;
}) {
  const [open, setOpen] = useState<CefrLevel | null>(defaultOpenLevel);
  useEffect(() => setOpen(defaultOpenLevel), [defaultOpenLevel]);

  const sections = LEVEL_ORDER.filter((lvl) => levels.some((l) => l.level === lvl)).map((lvl) => ({
    level: levels.find((l) => l.level === lvl)!,
    themeCourses: courses[lvl] ?? [],
  }));

  return (
    <div className="flex h-full min-h-0 gap-3">
      {sections.map(({ level, themeCourses }) => {
        const isOpen = open === level.level;
        return (
          <div
            key={level.level}
            className={cn(
              "flex min-h-0 overflow-hidden rounded-xl border border-hairline bg-card transition-[flex-grow,flex-basis] duration-300",
              isOpen ? "flex-[3] basis-0" : "flex-[1] basis-0 flex-col",
            )}
          >
            {isOpen ? (
              <>
                <ActiveStrip level={level} onClose={() => setOpen(null)} />
                <div className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto px-3 py-1">
                  {themeCourses.map((c) => (
                    <CourseRow key={c.theme} course={c} />
                  ))}
                </div>
              </>
            ) : (
              <button
                className="flex w-full flex-1 flex-col items-center justify-center gap-2 p-3 text-center hover:bg-paper"
                onClick={() => setOpen(level.level)}
                aria-expanded={false}
                title={`${level.level.toUpperCase()}: ${level.percent}% complete (${level.done}/${level.total})`}
              >
                <DonutProgress
                  size={52}
                  strokeWidth={6}
                  segments={[{ value: level.percent, color: "var(--color-brand-500)" }]}
                  max={100}
                  centerValue={<span className="text-xs font-bold">{level.percent}%</span>}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{level.level.toUpperCase()}</p>
                  <p className="truncate text-[11px] text-ink-400">{LEVEL_TITLES[level.level]}</p>
                </div>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

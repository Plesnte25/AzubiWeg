import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Hand, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import applyIcon from "../assets/icons/apply.webp";
import clipboardIcon from "../assets/icons/clipboard.webp";
import studyTimeIcon from "../assets/icons/clock (1).webp";
import clockIcon from "../assets/icons/clock.webp";
import dictionaryIcon from "../assets/icons/dictionary.webp";
import fireIcon from "../assets/icons/fire.webp";
import goodFeedbackIcon from "../assets/icons/good-feedback.webp";
import jobInterviewIcon from "../assets/icons/job-interview.webp";
import jobOfferIcon from "../assets/icons/job-offer.webp";
import learningIcon from "../assets/icons/learning.webp";
import onlineCertificateIcon from "../assets/icons/online-certificate.webp";
import quizIcon from "../assets/icons/quiz.webp";
import rejectIcon from "../assets/icons/reject.webp";
import riseIcon from "../assets/icons/rise.webp";
import streamingIcon from "../assets/icons/streaming.webp";
import taskIcon from "../assets/icons/task.webp";
import wishlistIcon from "../assets/icons/wishlist.webp";
import { api, getUser } from "../api/client";
import type { CefrLevel, RoadmapSkill, RoadmapTask, SyllabusItem } from "../api/types";
import CoursesAccordion, { LEVEL_TITLES, type ThemeCourse } from "../components/CoursesAccordion";
import LinearSkillBars from "../components/LinearSkillBars";
import MiniBarChart from "../components/MiniBarChart";
import RoadmapWeekStrip from "../components/RoadmapWeekStrip";
import SegmentedSkillBar from "../components/SegmentedSkillBar";
// chart.js/react-chartjs-2 aren't needed for first paint (the radar isn't
// the LCP element) — lazy-loaded to keep it out of the eager entry bundle.
const SkillPerformanceRadar = lazy(() => import("../components/SkillPerformanceRadar"));
import SkillProgressGauges from "../components/SkillProgressGauges";
import StudyActivityChart from "../components/StudyActivityChart";
import { Card } from "../components/ui/Card";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { quoteOfTheDay } from "../lib/quotes";
import { DISPLAY_SKILLS, DISPLAY_SKILL_LABELS_COMPACT, SKILL_COLORS, SKILL_LABELS, displaySkill } from "../lib/skills";
import { TaskDetailDrawer } from "./learning-hub/TaskDetailDrawer";
import { invalidateHub } from "./learning-hub/queryHelpers";

/** Card chrome (border/radius/own bg) below `lg`, unchanged from the classic
 * per-tile card look; at `lg:` the chrome is stripped since the 5 tiles then
 * share one outer bordered/divided row instead (see the stats row below). */
function Tile({ label, value, icon, accent }: { label: string; value: string | number; icon?: ReactNode; accent?: boolean }) {
  return (
    <div
      title={label}
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-hairline bg-card p-2 text-center lg:flex-row lg:items-center lg:justify-start lg:gap-2.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-left"
    >
      {icon}
      <div className="min-w-0">
        <div className={`text-base font-bold leading-tight lg:text-2xl ${accent ? "text-brand-600" : "text-ink-900"}`}>{value}</div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

/** Compact quadrant used inside the merged Analytics grid — no visible
 * heading, just a large low-opacity grayscale watermark icon bleeding off
 * the top-left corner (per the latest Claude Design mock's "card identity
 * via watermark, not text" direction). The title still exists as an
 * `sr-only` heading so screen readers get a real accessible name — the mock
 * itself flagged this as an open accessibility gap when it dropped text
 * headings, so it's added back in non-visually here.
 *
 * The watermark sits ABOVE the content (z-20 vs. the content's z-10, matching
 * the mock's own z-index:2/z-index:1 layering) so it stays visible regardless
 * of what's rendered underneath — `pointer-events-none` keeps it from
 * blocking clicks/hover on the real content. Content area has no scroll of
 * its own; each chart is expected to size itself to fit exactly. */
function Quadrant({
  icon,
  title,
  className,
  children,
  onClick,
}: {
  icon: string;
  title: string;
  className?: string;
  children: ReactNode;
  /** Optional — a plain div onClick (not a nested <a>) so children that are
   * themselves interactive (e.g. Study Time's hour/week/month toggle) can
   * still work; they just need to stopPropagation in their own handler. */
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden p-3",
        onClick && "cursor-pointer transition-colors hover:bg-paper",
        className,
      )}
      onClick={onClick}
    >
      <h3 className="sr-only">{title}</h3>
      <img src={icon} alt="" width={112} height={112} className="pointer-events-none absolute -left-4 -top-4 z-20 h-28 w-28 opacity-10 grayscale" />
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/** A gradient-filled, icon-led CTA that stands out from the rest of the
 * task list — this is the one action-oriented shortcut ("start reviewing
 * right now"), not just another informational row. Links with
 * ?startReview=1 so Vocabulary.tsx jumps straight into the flashcard queue
 * instead of just landing on the page in its default state. */
function StartRevisionCta({ dueToday }: { dueToday: number }) {
  return (
    <Link
      to="/vocabulary?startReview=1"
      className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 p-3 text-white shadow-sm transition-transform hover:scale-[1.01]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20">
        <Zap className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">Start today's revision</div>
        <div className="text-xs text-white/80">
          {dueToday} word{dueToday === 1 ? "" : "s"} due
        </div>
      </div>
    </Link>
  );
}

/** One roadmap task, tagged with its section's dedicated color (reading,
 * writing, grammar, …) — a checkbox toggles completion in place, the title
 * opens the full TaskDetailDrawer, mirroring Learning Hub's Today page
 * `PlanRow`. */
function SkillTaskRow({ task, onOpen }: { task: RoadmapTask; onOpen: (task: RoadmapTask) => void }) {
  const queryClient = useQueryClient();
  const color = task.skill ? SKILL_COLORS[task.skill] : "var(--color-ink-400)";
  const label = task.skill ? SKILL_LABELS[task.skill] : "General";
  const done = task.completedAt !== null;
  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.toggleRoadmapTask(task.id, completed),
    onSuccess: () => invalidateHub(queryClient),
  });
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-hairline bg-card py-2 pl-3 pr-3 text-sm ${done ? "opacity-60" : ""}`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <button
        onClick={() => toggle.mutate(!done)}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border text-[10px] text-white ${
          done ? "border-ink-900 bg-ink-900" : "border-hairline"
        }`}
      >
        {done && "✓"}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(task)}>
        <div className="flex items-start justify-between gap-2">
          <span className={`font-medium text-ink-900 hover:text-brand-500 ${done ? "line-through" : ""}`}>{task.title}</span>
          {done && <Check className="mt-0.5 size-3.5 shrink-0 text-ok-600" aria-hidden="true" />}
        </div>
        {task.description && <p className="mt-0.5 truncate text-xs text-ink-400">{task.description}</p>}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-600">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </div>
      </button>
    </div>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(d: Date): Date {
  const dayIdx = (d.getDay() + 6) % 7;
  const out = new Date(d);
  out.setDate(out.getDate() - dayIdx);
  return out;
}

/** Groups syllabus items into "courses" (real themes, e.g. "Verbs: present
 * tense") per level — module count/completion come straight from the
 * syllabus, and each theme's badge is colored by its items' dominant real
 * skill tag (reusing the same global skill-color map used everywhere else),
 * not a fabricated difficulty rating. */
function buildThemeCourses(items: SyllabusItem[]): Record<CefrLevel, ThemeCourse[]> {
  const groups = new Map<string, { level: CefrLevel; theme: string; total: number; done: number; skillCounts: Map<RoadmapSkill, number> }>();
  for (const item of items) {
    const theme = item.theme ?? "General";
    const key = `${item.level}|${theme}`;
    const g = groups.get(key) ?? { level: item.level, theme, total: 0, done: 0, skillCounts: new Map() };
    g.total += 1;
    if (item.completedAt) g.done += 1;
    if (item.skill) g.skillCounts.set(item.skill, (g.skillCounts.get(item.skill) ?? 0) + 1);
    groups.set(key, g);
  }
  const result: Record<CefrLevel, ThemeCourse[]> = { a1: [], a2: [], b1: [] };
  for (const g of groups.values()) {
    let dominant: RoadmapSkill | null = null;
    let max = 0;
    for (const [skill, count] of g.skillCounts) {
      if (count > max) {
        max = count;
        dominant = skill;
      }
    }
    result[g.level].push({
      theme: g.theme,
      skill: dominant,
      total: g.total,
      done: g.done,
      percent: g.total === 0 ? 0 : Math.round((g.done / g.total) * 100),
    });
  }
  return result;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: hourlyActivity } = useQuery({
    queryKey: ["activity", "hourly"],
    queryFn: api.activityHourly,
    refetchInterval: 60_000,
  });
  const { data: weekly } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview() });
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: monthlyReview } = useQuery({
    queryKey: ["roadmap", "review", "month", currentMonth],
    queryFn: () => api.roadmapMonthlyReview(currentMonth),
  });
  // full task list (all sections), not just the dashboard summary's single
  // "next incomplete" line — shared cache key with Learning Hub's Today tab
  const { data: todayFull } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday });
  const { data: syllabusData } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });

  const [weekStart, setWeekStart] = useState(() => isoDate(mondayOf(new Date())));
  const [calSelected, setCalSelected] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);
  const weekEndDate = new Date(weekStart + "T00:00:00");
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const monthsNeeded = Array.from(new Set([weekStart.slice(0, 7), isoDate(weekEndDate).slice(0, 7)]));
  const { data: calDataA } = useQuery({ queryKey: ["roadmap", "calendar", monthsNeeded[0]], queryFn: () => api.roadmapCalendar(monthsNeeded[0]!) });
  const { data: calDataB } = useQuery({
    queryKey: ["roadmap", "calendar", monthsNeeded[1]],
    queryFn: () => api.roadmapCalendar(monthsNeeded[1]!),
    enabled: monthsNeeded.length > 1,
  });
  const weekDays = [...(calDataA?.days ?? []), ...(calDataB?.days ?? [])];
  const selectedDayQuery = useQuery({
    queryKey: ["roadmap", "day", calSelected],
    queryFn: () => api.roadmapDay(calSelected as string),
    enabled: calSelected !== null,
    retry: false,
  });
  const shiftWeek = (deltaWeeks: number) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + deltaWeeks * 7);
    setWeekStart(isoDate(d));
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
          </div>
          <div className="space-y-3">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  const bySkill = weekly?.bySkill ?? [];
  const bySkillTotals = new Map<RoadmapSkill, { done: number; total: number }>();
  for (const t of bySkill) {
    const key = displaySkill(t.skill);
    const entry = bySkillTotals.get(key) ?? { done: 0, total: 0 };
    entry.done += t.done;
    entry.total += t.total;
    bySkillTotals.set(key, entry);
  }
  const skillSegments = DISPLAY_SKILLS.map((skill) => {
    const tally = bySkillTotals.get(skill);
    return { skill, label: DISPLAY_SKILL_LABELS_COMPACT[skill], color: SKILL_COLORS[skill], done: tally?.done ?? 0, total: tally?.total ?? 0 };
  });

  const levelsInProgress = data.learning.levels.filter((l) => l.total > 0);
  const defaultOpenIdx = levelsInProgress.findIndex((l) => l.total === 0 || l.percent < 100);
  const defaultOpenLevel = levelsInProgress[defaultOpenIdx === -1 ? levelsInProgress.length - 1 : defaultOpenIdx]?.level ?? "a1";
  const themeCourses = buildThemeCourses(syllabusData?.items ?? []);
  const activeCoursesCount = levelsInProgress.filter((l) => l.percent > 0 && l.percent < 100).length;

  const selectedDay = calSelected && selectedDayQuery.data ? selectedDayQuery.data.day : null;

  // openTask is a snapshot captured at click time — re-derive the live copy
  // from the freshly-fetched lists on every render so its checkbox/fields
  // never go stale after a mutation invalidates ["roadmap", "today"/"day"]
  // (same pattern as Learning Hub's Today page).
  const liveOpenTask =
    openTask &&
    (todayFull?.tasks.find((t) => t.id === openTask.id) ??
      todayFull?.backlog.flatMap((g) => g.tasks).find((t) => t.id === openTask.id) ??
      selectedDay?.tasks.find((t) => t.id === openTask.id) ??
      openTask);

  // todayFull resolves independently of (usually slightly after) the main
  // dashboard query above, which is what clears the page's top-level
  // skeleton — without distinguishing "still loading" from "confirmed
  // empty" here, the Today's Tasks card below flashes the empty-state
  // message and then jumps to the real list once todayFull arrives,
  // both a layout shift and, briefly, a wrong answer for anyone who does
  // have tasks.
  const todayLoading = todayFull === undefined;
  const noTasksAtAll = !todayLoading && data.dueToday === 0 && todayFull.tasks.length === 0;

  const firstName = getUser()?.name?.trim().split(/\s+/)[0];
  const quote = quoteOfTheDay();

  // sm/md mini-graphs: Performance merges the 9 raw skills into the 5
  // display skills the same way SkillPerformanceRadar does internally
  // (max per merged group); Study time buckets the current week's minutes
  // (already fetched for the segmented bar / lg bar chart) into 7 daily bars.
  const perfByDisplay = new Map<RoadmapSkill, number>();
  for (const d of data.learning.skillPerformance) {
    const key = displaySkill(d.skill);
    perfByDisplay.set(key, Math.max(perfByDisplay.get(key) ?? 0, d.percent));
  }
  const perfBars = DISPLAY_SKILLS.map((s) => ({
    label: DISPLAY_SKILL_LABELS_COMPACT[s],
    value: perfByDisplay.get(s) ?? 0,
    color: SKILL_COLORS[s],
  }));

  const weekMonday = mondayOf(new Date());
  const dailyTotals = new Map<string, number>();
  for (const e of weekly?.dailyMinutesBySkill ?? []) dailyTotals.set(e.date, (dailyTotals.get(e.date) ?? 0) + e.minutes);
  const weeklyTotals = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() + i);
    const key = isoDate(d);
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), value: dailyTotals.get(key) ?? 0, color: "var(--color-brand-400)" };
  });

  return (
    <>
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-2rem)] md:min-h-0 lg:h-full lg:min-h-0">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            Guten Tag{firstName ? `, ${firstName}` : ""}!
            <Hand className="size-6 text-brand-500" aria-hidden="true" />
          </h1>
          <p className="mt-0.5 text-sm text-ink-600">{quote}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.dueToday === 0 && (
            <span className="flex items-center gap-1.5 text-sm text-ink-600">
              <CheckCircle2 className="size-4 text-ok-600" aria-hidden="true" />
              Nothing due — alles erledigt
            </span>
          )}
        </div>
      </div>

      {/* sm shows 4 (no Active courses, so a single row never needs to
          scroll); md adds Active courses back for 5, same as lg — Tile
          itself stacks icon-over-value below lg and switches to lg's
          horizontal chromeless look via its own responsive classes. */}
      <div className="grid shrink-0 grid-cols-4 gap-2 md:grid-cols-5 md:gap-3 lg:gap-0 lg:divide-x lg:divide-hairline lg:rounded-xl lg:border lg:border-hairline lg:bg-card">
        <Tile
          label="Day streak"
          value={data.streak}
          accent
          icon={<img src={fireIcon} alt="" width={24} height={24} className="size-5 lg:size-6" />}
        />
        <Tile
          label="Learning Hrs"
          value={`${(data.totalLearningMinutes / 60).toFixed(1)}h`}
          icon={<img src={clockIcon} alt="" width={24} height={24} className="size-5 lg:size-6" />}
        />
        <Tile
          label="Vocab due / total"
          value={`${data.dueToday} / ${data.totalWords}`}
          accent={data.dueToday > 0}
          icon={<img src={dictionaryIcon} alt="" width={24} height={24} className="size-5 lg:size-6" />}
        />
        <Tile
          label="Quizzes completed"
          value={data.quizzesCompleted}
          icon={<img src={quizIcon} alt="" width={24} height={24} className="size-5 lg:size-6" />}
        />
        <div className="hidden md:contents">
          <Tile
            label="Active courses"
            value={activeCoursesCount}
            icon={<img src={streamingIcon} alt="" width={24} height={24} className="size-5 lg:size-6" />}
          />
        </div>
      </div>

      {/* sm/md-only: a simplified subset (today's tasks, a linear-bar
          "Continue" card, 2 compact mini-cards) replacing lg's full Courses
          accordion / radar+chart Analytics grid / Schedule column, which
          don't fit below lg — see the hidden lg:grid block further down. */}
      <div className="flex min-h-0 flex-col gap-3 md:flex-1 md:justify-evenly lg:hidden">
        <Card padding="sm" className="flex flex-col">
          <Link to="/learning?view=today" className="mb-2 flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600">
            <img src={clipboardIcon} alt="" width={16} height={16} className="size-4" />
            Today's tasks
          </Link>
          {todayLoading ? (
            <Skeleton className="h-16" />
          ) : noTasksAtAll ? (
            <p className="text-sm text-ink-600">Nothing on your plate right now — enjoy the breather.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {[
                ...(data.dueToday > 0 ? [<StartRevisionCta key="due" dueToday={data.dueToday} />] : []),
                ...(todayFull?.tasks.map((t) => <SkillTaskRow key={t.id} task={t} onOpen={setOpenTask} />) ?? []),
              ]}
            </div>
          )}
        </Card>

        <Card padding="sm" className="md:shrink-0">
          <p className="font-semibold text-ink-900">
            Continue: {defaultOpenLevel.toUpperCase()} {LEVEL_TITLES[defaultOpenLevel]}
          </p>
          {data.roadmapToday?.nextIncompleteTitle && (
            <p className="mt-0.5 text-sm text-ink-600">Next: {data.roadmapToday.nextIncompleteTitle}</p>
          )}
          <div className="relative mt-3 h-2.5 rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700"
              style={{ width: `${levelsInProgress.find((l) => l.level === defaultOpenLevel)?.percent ?? 0}%` }}
            />
          </div>
          <div className="mt-4">
            <LinearSkillBars skills={data.learning.skillProgress} />
          </div>
          <Link to="/learning?view=syllabus" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            Resume →
          </Link>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:shrink-0">
          <Link to="/learning?view=progress">
            <Card padding="sm" interactive>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-600">
                <img src={goodFeedbackIcon} alt="" width={16} height={16} className="size-4" />
                Performance
              </p>
              <div className="h-14">
                <MiniBarChart bars={perfBars} max={100} />
              </div>
            </Card>
          </Link>
          <Link to="/learning?view=progress">
            <Card padding="sm" interactive>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-600">
                <img src={studyTimeIcon} alt="" width={16} height={16} className="size-4" />
                Study time
              </p>
              <div className="h-14">
                <MiniBarChart bars={weeklyTotals} />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 gap-3 lg:grid lg:grid-cols-[7fr_3fr] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-3">
          <Card padding="sm" className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <h2 className="sr-only">My Courses</h2>
            <img
              src={onlineCertificateIcon}
              alt=""
              className="pointer-events-none absolute -left-4 -top-4 z-20 h-28 w-28 opacity-10 grayscale"
            />
            <img
              src={learningIcon}
              alt=""
              className="pointer-events-none absolute -bottom-4 -right-4 z-20 h-28 w-28 opacity-10 grayscale"
            />
            <div className="relative z-10 min-h-0 flex-1">
              <CoursesAccordion levels={levelsInProgress} courses={themeCourses} defaultOpenLevel={defaultOpenLevel} />
            </div>
          </Card>

          <div className="grid min-h-0 flex-[2] grid-cols-1 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card lg:grid-cols-2 lg:grid-rows-[1fr_1.1fr] lg:divide-y-0">
            <Quadrant
              icon={goodFeedbackIcon}
              title="Performance"
              className="lg:border-b lg:border-r lg:border-hairline"
              onClick={() => navigate("/learning?view=progress")}
            >
              <Suspense fallback={<div className="h-full w-full" />}>
                <SkillPerformanceRadar data={data.learning.skillPerformance} />
              </Suspense>
            </Quadrant>
            <Quadrant
              icon={studyTimeIcon}
              title="Study Time"
              className="lg:border-b lg:border-hairline"
              onClick={() => navigate("/learning?view=progress")}
            >
              <StudyActivityChart
                hourly={hourlyActivity?.hours ?? []}
                weekly={weekly?.dailyMinutesBySkill ?? []}
                monthly={monthlyReview?.dailyMinutesBySkill ?? []}
              />
            </Quadrant>
            <Quadrant icon={riseIcon} title="My Progress" className="lg:col-span-2">
              {todayFull?.overview && (
                <SkillProgressGauges
                  name={`German — Ausbildung Track`}
                  nextLessonLine={data.roadmapToday?.nextIncompleteTitle ?? null}
                  dayOffset={todayFull.overview.currentDayOffset}
                  totalDays={todayFull.overview.totalDays}
                  levels={data.learning.levels}
                  skills={data.learning.skillProgress}
                />
              )}
            </Quadrant>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
          <div className="shrink-0 p-3">
            {data.roadmapWeekStrip.length === 0 ? (
              <Link to="/learning?view=roadmap" className="text-sm text-brand-700 hover:underline">
                Start your 26-week roadmap →
              </Link>
            ) : (
              <RoadmapWeekStrip
                weekStart={weekStart}
                days={weekDays}
                selectedDate={calSelected}
                onSelectDay={setCalSelected}
                onShiftWeek={shiftWeek}
              />
            )}
          </div>

          <div className="shrink-0 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-600">
              <img src={taskIcon} alt="" width={16} height={16} className="size-4" />
              Tasks Completed
            </p>
            <SegmentedSkillBar segments={skillSegments} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              {selectedDay ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink-600">
                  <img src={clipboardIcon} alt="" width={16} height={16} className="size-4" />
                  {new Date(calSelected!).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </p>
              ) : (
                <Link to="/learning?view=today" className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600">
                  <img src={clipboardIcon} alt="" width={16} height={16} className="size-4" />
                  Today's Tasks
                </Link>
              )}
              {selectedDay && (
                <button className="text-xs text-brand-700 hover:underline" onClick={() => setCalSelected(null)}>
                  Back to today
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedDay ? (
                selectedDay.tasks.length === 0 ? (
                  <p className="text-sm text-ink-600">No tasks that day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.tasks.map((t) => (
                      <SkillTaskRow key={t.id} task={t} onOpen={setOpenTask} />
                    ))}
                  </div>
                )
              ) : todayLoading ? (
                <Skeleton className="h-16" />
              ) : noTasksAtAll ? (
                <p className="text-sm text-ink-600">Nothing on your plate right now — enjoy the breather.</p>
              ) : (
                <div className="space-y-2">
                  {data.dueToday > 0 && <StartRevisionCta dueToday={data.dueToday} />}
                  {todayFull?.tasks.map((t) => <SkillTaskRow key={t.id} task={t} onOpen={setOpenTask} />)}
                </div>
              )}
            </div>
          </div>

          {/* No border lines between icons or above this row — separation
              comes from spacing alone, each count shown as a
              notification-style bubble (same pattern as the sidebar's
              unread-count badge) instead of a number printed below the icon. */}
          <div className="flex shrink-0 items-center justify-around gap-2 py-3">
            {(
              [
                ["wishlist", "Wishlist", wishlistIcon],
                ["applied", "Applied", applyIcon],
                ["interview", "Interview", jobInterviewIcon],
                ["offer", "Offer", jobOfferIcon],
                ["rejected", "Rejected", rejectIcon],
              ] as const
            ).map(([key, label, icon]) => {
              const count = data.applications[key];
              return (
                <Link
                  key={key}
                  to="/applications"
                  aria-label={`${label}: ${count}`}
                  className="relative grid place-items-center rounded-full p-1.5 hover:bg-paper"
                >
                  <img src={icon} alt="" width={18} height={18} className="size-[18px]" />
                  {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-danger-solid)] px-1 text-[10px] font-bold leading-4 text-white">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    {liveOpenTask && (
      <TaskDetailDrawer task={liveOpenTask} onClose={() => setOpenTask(null)} onNavigate={(d) => navigate(`/learning?view=${d}`)} />
    )}
    </>
  );
}

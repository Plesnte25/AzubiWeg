import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, CheckCircle2, Hand } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import applyIcon from "../assets/icons/apply.png";
import clipboardIcon from "../assets/icons/clipboard.png";
import studyTimeIcon from "../assets/icons/clock (1).png";
import clockIcon from "../assets/icons/clock.png";
import dictionaryIcon from "../assets/icons/dictionary.png";
import fireIcon from "../assets/icons/fire.png";
import goodFeedbackIcon from "../assets/icons/good-feedback.png";
import jobInterviewIcon from "../assets/icons/job-interview.png";
import jobOfferIcon from "../assets/icons/job-offer.png";
import learningIcon from "../assets/icons/learning.png";
import onlineCertificateIcon from "../assets/icons/online-certificate.png";
import quizIcon from "../assets/icons/quiz.png";
import rejectIcon from "../assets/icons/reject.png";
import riseIcon from "../assets/icons/rise.png";
import streamingIcon from "../assets/icons/streaming.png";
import taskIcon from "../assets/icons/task.png";
import wishlistIcon from "../assets/icons/wishlist.png";
import { api, getUser } from "../api/client";
import type { CefrLevel, RoadmapSkill, SyllabusItem } from "../api/types";
import CoursesAccordion, { type ThemeCourse } from "../components/CoursesAccordion";
import RoadmapWeekStrip from "../components/RoadmapWeekStrip";
import SegmentedSkillBar from "../components/SegmentedSkillBar";
import SkillPerformanceRadar from "../components/SkillPerformanceRadar";
import SkillProgressGauges from "../components/SkillProgressGauges";
import StudyActivityChart from "../components/StudyActivityChart";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { quoteOfTheDay } from "../lib/quotes";
import { DISPLAY_SKILLS, DISPLAY_SKILL_LABELS_COMPACT, SKILL_COLORS, SKILL_LABELS, displaySkill } from "../lib/skills";

/** Card chrome (border/radius/own bg) below `lg`, unchanged from the classic
 * per-tile card look; at `lg:` the chrome is stripped since the 5 tiles then
 * share one outer bordered/divided row instead (see the stats row below). */
function Tile({ label, value, icon, accent }: { label: string; value: string | number; icon?: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-hairline bg-card p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-3">
      {icon}
      <div>
        <div className={`text-2xl font-bold ${accent ? "text-brand-600" : "text-ink-900"}`}>{value}</div>
        <div className="mt-0.5 text-sm text-ink-600">{label}</div>
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
function Quadrant({ icon, title, className, children }: { icon: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative flex min-h-0 flex-col overflow-hidden p-3", className)}>
      <h3 className="sr-only">{title}</h3>
      <img src={icon} alt="" className="pointer-events-none absolute -left-4 -top-4 z-20 h-28 w-28 opacity-10 grayscale" />
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

type Tone = "neutral" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-hairline bg-card",
  warning: "border-warning-100 bg-warning-50",
  danger: "border-danger-100 bg-danger-50",
};

function TaskListItem({ to, title, meta, tone = "neutral" }: { to: string; title: ReactNode; meta?: string; tone?: Tone }) {
  return (
    <Link
      to={to}
      className={`block rounded-lg border p-3 text-sm transition-colors hover:border-brand-200 ${TONE_CLASSES[tone]}`}
    >
      <div className="font-medium text-ink-900">{title}</div>
      {meta && <div className="mt-0.5 text-xs text-ink-600">{meta}</div>}
    </Link>
  );
}

/** One roadmap task, tagged with its section's dedicated color (reading, writing, grammar, …). */
function SkillTaskRow({ task }: { task: { id: string; title: string; skill: RoadmapSkill | null; completedAt: string | null } }) {
  const color = task.skill ? SKILL_COLORS[task.skill] : "var(--color-ink-400)";
  const label = task.skill ? SKILL_LABELS[task.skill] : "General";
  const done = task.completedAt !== null;
  return (
    <div
      className={`rounded-lg border border-hairline bg-card py-2 pl-3 pr-3 text-sm ${done ? "opacity-60" : ""}`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-medium text-ink-900 ${done ? "line-through" : ""}`}>{task.title}</span>
        {done && <Check className="mt-0.5 size-3.5 shrink-0 text-ok-600" aria-hidden="true" />}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-600">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
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

  const noTasksAtAll = data.dueToday === 0 && (todayFull?.tasks.length ?? 0) === 0 && data.expiringDocuments.length === 0;

  const firstName = getUser()?.name?.trim().split(/\s+/)[0];
  const quote = quoteOfTheDay();

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            Guten Tag{firstName ? `, ${firstName}` : ""}!
            <Hand className="size-6 text-brand-500" aria-hidden="true" />
          </h1>
          <p className="mt-0.5 text-sm text-ink-600">{quote}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md">
            <Award className="size-3.5" aria-hidden="true" />
            {data.gamification.points} pts
          </Badge>
          {data.dueToday === 0 && (
            <span className="flex items-center gap-1.5 text-sm text-ink-600">
              <CheckCircle2 className="size-4 text-ok-600" aria-hidden="true" />
              Nothing due — alles erledigt
            </span>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-hairline lg:rounded-xl lg:border lg:border-hairline lg:bg-card">
        <Tile label="Day streak" value={data.streak} accent icon={<img src={fireIcon} alt="" className="size-6" />} />
        <Tile
          label="Learning Hrs"
          value={`${(data.totalLearningMinutes / 60).toFixed(1)}h`}
          icon={<img src={clockIcon} alt="" className="size-6" />}
        />
        <Tile
          label="Vocab due / total"
          value={`${data.dueToday} / ${data.totalWords}`}
          accent={data.dueToday > 0}
          icon={<img src={dictionaryIcon} alt="" className="size-6" />}
        />
        <Tile
          label="Quizzes completed"
          value={data.quizzesCompleted}
          icon={<img src={quizIcon} alt="" className="size-6" />}
        />
        <Tile label="Active courses" value={activeCoursesCount} icon={<img src={streamingIcon} alt="" className="size-6" />} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[7fr_3fr] lg:overflow-hidden">
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
            <Quadrant icon={goodFeedbackIcon} title="Performance" className="lg:border-b lg:border-r lg:border-hairline">
              <SkillPerformanceRadar data={data.learning.skillPerformance} />
            </Quadrant>
            <Quadrant icon={studyTimeIcon} title="Study Time" className="lg:border-b lg:border-hairline">
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
              <img src={taskIcon} alt="" className="size-4" />
              Tasks Completed
            </p>
            <SegmentedSkillBar segments={skillSegments} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink-600">
                <img src={clipboardIcon} alt="" className="size-4" />
                {selectedDay
                  ? new Date(calSelected!).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
                  : "Today's Tasks"}
              </p>
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
                      <SkillTaskRow key={t.id} task={t} />
                    ))}
                  </div>
                )
              ) : noTasksAtAll ? (
                <p className="text-sm text-ink-600">Nothing on your plate right now — enjoy the breather.</p>
              ) : (
                <div className="space-y-2">
                  {data.dueToday > 0 && (
                    <TaskListItem
                      to="/vocabulary"
                      title="Start today's revision"
                      meta={`${data.dueToday} word${data.dueToday === 1 ? "" : "s"} due`}
                      tone="warning"
                    />
                  )}
                  {todayFull?.tasks.map((t) => <SkillTaskRow key={t.id} task={t} />)}
                  {data.expiringDocuments.map((d) => (
                    <TaskListItem
                      key={d.id}
                      to="/checklist"
                      title={d.title}
                      meta={d.expiry === "expired" ? "expired" : `due by ${d.expiresAt.slice(0, 10)}`}
                      tone={d.expiry === "expired" ? "danger" : "warning"}
                    />
                  ))}
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
                  <img src={icon} alt="" className="size-[18px]" />
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
  );
}

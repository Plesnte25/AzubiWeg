import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flame, Hand, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { RoadmapSkill } from "../api/types";
import HoursActivityChart from "../components/HoursActivityChart";
import RoadmapCalendar from "../components/RoadmapCalendar";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DonutProgress } from "../components/ui/DonutProgress";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";
import { levelStates } from "../lib/levels";

const SKILL_SEGMENTS: { key: RoadmapSkill; label: string; color: string }[] = [
  { key: "reading", label: "Reading", color: "var(--color-info-600)" },
  { key: "writing", label: "Writing", color: "var(--color-brand-500)" },
  { key: "listening", label: "Listening", color: "var(--color-ok-600)" },
  { key: "grammar", label: "Grammar", color: "var(--color-warning-500)" },
];

// every RoadmapSkill gets its own dedicated color so the day's tasks read as
// distinct sections at a glance, not just a plain list
const SKILL_COLORS: Record<RoadmapSkill, string> = {
  reading: "var(--color-info-600)",
  listening: "var(--color-ok-600)",
  writing: "var(--color-brand-500)",
  speaking: "#a855f7",
  grammar: "var(--color-warning-500)",
  vocab: "#ec4899",
  bureaucracy: "#64748b",
  milestone: "#f97316",
  reflection: "#94a3b8",
};

const SKILL_LABELS: Record<RoadmapSkill, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  grammar: "Grammar",
  vocab: "Vocab",
  bureaucracy: "Bureaucracy",
  milestone: "Milestone",
  reflection: "Reflection",
};

function Tile({ label, value, icon, accent }: { label: string; value: string | number; icon?: ReactNode; accent?: boolean }) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <div className={`text-2xl font-bold ${accent ? "text-brand-600" : "text-ink-900"}`}>{value}</div>
          <div className="mt-0.5 text-sm text-ink-600">{label}</div>
        </div>
      </div>
    </Card>
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

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  // separate from the once-per-mount dashboard query and polled — this tile
  // should visibly tick up while the tab stays open, matching the heartbeat
  const { data: activity } = useQuery({
    queryKey: ["activity", "summary"],
    queryFn: api.activitySummary,
    refetchInterval: 60_000,
  });
  const { data: weekly } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview() });
  // full task list (all sections), not just the dashboard summary's single
  // "next incomplete" line — shared cache key with Learning Hub's Today tab
  const { data: todayFull } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday });

  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calSelected, setCalSelected] = useState<string | null>(null);
  const { data: calData } = useQuery({
    queryKey: ["roadmap", "calendar", calMonth],
    queryFn: () => api.roadmapCalendar(calMonth),
  });
  const selectedDayQuery = useQuery({
    queryKey: ["roadmap", "day", calSelected],
    queryFn: () => api.roadmapDay(calSelected as string),
    enabled: calSelected !== null,
    retry: false,
  });
  const shiftCalMonth = (delta: number) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
          </div>
          <div className="space-y-4">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  const activeLevel = (() => {
    if (data.learning.levels.every((l) => l.total === 0)) return null;
    const states = levelStates(data.learning.levels);
    const activeIdx = Math.max(0, states.indexOf("active"));
    return { level: data.learning.levels[activeIdx], states, activeIdx };
  })();

  const bySkill = weekly?.bySkill ?? [];
  const namedSkillsDone = SKILL_SEGMENTS.reduce(
    (sum, s) => sum + (bySkill.find((t) => t.skill === s.key)?.done ?? 0),
    0,
  );
  const totalTasksDone = bySkill.reduce((sum, t) => sum + t.done, 0);
  const otherSkillsDone = Math.max(0, totalTasksDone - namedSkillsDone);

  const selectedDay = calSelected && selectedDayQuery.data ? selectedDayQuery.data.day : null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const hoursChartData = [...(activity?.history ?? []).map((h) => ({ date: h.date, minutes: h.minutes })), { date: todayIso, minutes: activity?.minutesToday ?? 0 }];
  const weekAvgMinutes = activity ? Math.round(activity.minutesThisWeek / 7) : 0;
  const todayDelta = activity ? activity.minutesToday - weekAvgMinutes : 0;

  const noTasksAtAll = data.dueToday === 0 && (todayFull?.tasks.length ?? 0) === 0 && data.expiringDocuments.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl">
          Guten Tag!
          <Hand className="size-6 text-brand-500" aria-hidden="true" />
        </h1>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Words" value={data.totalWords} />
        <Tile label="Due today" value={data.dueToday} accent={data.dueToday > 0} />
        <Tile label="Never reviewed" value={data.newWords} />
        <Tile label="Reviews today" value={data.reviewsToday} />
        <Tile label="Day streak" value={data.streak} accent icon={<Flame className="size-5 text-brand-500" aria-hidden="true" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col items-center text-center">
              <h2 className="mb-4 self-start text-lg font-bold tracking-tight">Words breakdown</h2>
              <DonutProgress
                size={140}
                strokeWidth={18}
                gap={6}
                segments={[
                  {
                    value: data.dueToday,
                    color: "var(--color-brand-500)",
                    label: data.totalWords > 0 && data.dueToday > 0 ? `${Math.round((data.dueToday / data.totalWords) * 100)}%` : undefined,
                  },
                  {
                    value: data.newWords,
                    color: "var(--color-warning-500)",
                    label: data.totalWords > 0 && data.newWords > 0 ? `${Math.round((data.newWords / data.totalWords) * 100)}%` : undefined,
                  },
                  {
                    value: data.reviewsToday,
                    color: "var(--color-ok-600)",
                    label: data.totalWords > 0 && data.reviewsToday > 0 ? `${Math.round((data.reviewsToday / data.totalWords) * 100)}%` : undefined,
                  },
                ]}
                max={data.totalWords}
                centerValue={data.totalWords}
                centerLabel="words"
              />
              <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand-500" />
                  Due <span className="font-medium">{data.dueToday}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-warning-500" />
                  New <span className="font-medium">{data.newWords}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ok-600" />
                  Reviewed <span className="font-medium">{data.reviewsToday}</span>
                </li>
              </ul>
            </Card>

            <Card className="flex flex-col items-center text-center">
              <div className="mb-4 flex w-full items-start justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight">Study time by skill</h2>
                <span className="text-xs text-ink-400">this week</span>
              </div>
              {totalTasksDone === 0 ? (
                <p className="text-sm text-ink-600">No roadmap tasks completed this week yet.</p>
              ) : (
                <>
                  <DonutProgress
                    size={140}
                    strokeWidth={18}
                    gap={6}
                    segments={[
                      ...SKILL_SEGMENTS.map((s) => {
                        const value = bySkill.find((t) => t.skill === s.key)?.done ?? 0;
                        return {
                          value,
                          color: s.color,
                          label: value > 0 ? `${Math.round((value / totalTasksDone) * 100)}%` : undefined,
                        };
                      }),
                      { value: otherSkillsDone, color: "var(--color-hairline)" },
                    ]}
                    centerValue={totalTasksDone}
                    centerLabel="tasks"
                  />
                  <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                    {SKILL_SEGMENTS.map((s) => (
                      <li key={s.key} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label} <span className="font-medium">{bySkill.find((t) => t.skill === s.key)?.done ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold tracking-tight">Hours Activity</h2>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-hairline px-3 py-1 text-xs font-medium text-ink-600">
                Weekly
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            {activity && (
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
                  {todayDelta < 0 ? (
                    <TrendingDown className="size-4" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="size-4" aria-hidden="true" />
                  )}
                </span>
                {todayDelta === 0 ? (
                  <p className="text-sm text-ink-600">On par with your daily average this week</p>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-brand-600">
                      {todayDelta > 0 ? "+" : "-"}
                      {Math.abs(todayDelta)}m
                    </p>
                    <p className="text-sm text-ink-600">{todayDelta > 0 ? "more" : "less"} than your daily average</p>
                  </div>
                )}
              </div>
            )}
            <HoursActivityChart data={hoursChartData} />
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>German level progress</Card.Title>
              <div className="flex items-center gap-3 text-sm text-ink-600">
                {data.learning.streak > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame className="size-3.5 text-brand-500" aria-hidden="true" />
                    {data.learning.streak}
                  </span>
                )}
                {data.learning.lastSelfTest && (
                  <span>
                    Last test{" "}
                    <span className="font-medium text-ink-900">
                      {data.learning.lastSelfTest.score}/{data.learning.lastSelfTest.total}
                    </span>
                  </span>
                )}
              </div>
            </Card.Header>
            {!activeLevel ? (
              <Link to="/learning" className="text-sm text-brand-700 hover:underline">
                Set up your syllabus — open the Learning tab to get started →
              </Link>
            ) : (
              <div className="space-y-3">
                <Link to="/learning" className="flex items-center gap-4 rounded-lg p-1 hover:bg-paper">
                  <DonutProgress
                    segments={[{ value: activeLevel.level.percent, color: "var(--color-brand-500)" }]}
                    max={100}
                    size={84}
                    strokeWidth={10}
                    centerValue={`${activeLevel.level.percent}%`}
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold uppercase">{activeLevel.level.level}</span>
                      <span className="text-ink-600">
                        {activeLevel.level.done}/{activeLevel.level.total}
                      </span>
                    </div>
                    <Badge variant="brand" size="sm" className="mt-1">
                      current level
                    </Badge>
                  </div>
                </Link>
                {activeLevel.states.some((s, i) => s === "done" && i !== activeLevel.activeIdx) && (
                  <div className="flex flex-wrap gap-2">
                    {data.learning.levels.map((l, i) =>
                      i === activeLevel.activeIdx || activeLevel.states[i] !== "done" ? null : (
                        <Badge key={l.level} variant="success" className="uppercase">
                          {l.level} <CheckCircle2 className="size-3" aria-hidden="true" />
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {(Object.values(data.applications).some((n) => n > 0) || data.lessons.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.values(data.applications).some((n) => n > 0) && (
                <Card>
                  <Card.Header>
                    <Card.Title>Application pipeline</Card.Title>
                  </Card.Header>
                  <Link to="/applications" className="flex flex-wrap gap-2">
                    {(
                      [
                        ["wishlist", "Wishlist"],
                        ["applied", "Applied"],
                        ["interview", "Interview"],
                        ["offer", "Offer"],
                        ["rejected", "Rejected"],
                      ] as const
                    ).map(([key, label]) => (
                      <Badge key={key} size="md" className="hover:border-brand-400">
                        {label} <span className="text-ink-400">{data.applications[key]}</span>
                      </Badge>
                    ))}
                  </Link>
                </Card>
              )}

              {data.lessons.length > 0 && (
                <Card>
                  <Card.Header>
                    <Card.Title>Words by lesson</Card.Title>
                  </Card.Header>
                  <ul className="flex flex-wrap gap-2">
                    {data.lessons.map((l) => (
                      <li key={l.lesson ?? "none"}>
                        <Link to={l.lesson ? `/vocabulary?lesson=${l.lesson}` : "/vocabulary"}>
                          <Badge size="md" className="hover:border-brand-400">
                            {l.lesson ?? "untagged"} <span className="text-ink-400">{l.count}</span>
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <Card.Header>
              <Card.Title>Calendar</Card.Title>
            </Card.Header>
            {data.roadmapWeekStrip.length === 0 ? (
              <Link to="/learning?group=progress" className="text-sm text-brand-700 hover:underline">
                Start your 26-week roadmap →
              </Link>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    className="grid size-7 place-items-center rounded-full hover:bg-paper"
                    onClick={() => shiftCalMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <p className="text-sm font-medium">
                    {new Date(calMonth + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </p>
                  <button
                    className="grid size-7 place-items-center rounded-full hover:bg-paper"
                    onClick={() => shiftCalMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <RoadmapCalendar month={calMonth} days={calData?.days ?? []} onSelectDay={setCalSelected} />
              </>
            )}
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>
                {selectedDay
                  ? new Date(calSelected!).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
                  : "Today's tasks"}
              </Card.Title>
              {selectedDay && (
                <button className="text-xs text-brand-700 hover:underline" onClick={() => setCalSelected(null)}>
                  Back to today
                </button>
              )}
            </Card.Header>
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
                    to="/review"
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
          </Card>

          {data.gamification.recentBadges.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Achievements</Card.Title>
                <span className="text-xs text-ink-400">
                  {data.gamification.badgeCount} badge{data.gamification.badgeCount === 1 ? "" : "s"}
                </span>
              </Card.Header>
              <div className="flex flex-wrap gap-1.5">
                {data.gamification.recentBadges.map((b) => (
                  <Badge key={b.key} variant="brand" title={new Date(b.unlockedAt).toLocaleDateString()}>
                    <Award className="size-3" aria-hidden="true" />
                    {b.label}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

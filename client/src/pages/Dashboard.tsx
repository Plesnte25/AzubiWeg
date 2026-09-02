import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Check, Fire, Sparkle } from "@phosphor-icons/react";
import { api, getUser } from "../api/client";
import type { DashboardNextTask, RoadmapSkill } from "../api/types";
import { ProfileSheet } from "../components/ProfileSheet";
import ReviewDial from "../components/ReviewDial";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Skeleton } from "../components/ui/Skeleton";
import { levelStates } from "../lib/levels";
import { SKILL_LABELS } from "../lib/skills";
import { useNavStack } from "../lib/navStack";
import { AddTaskComposer, ChapterProgressCard, localDateStr } from "./plan/planShared";
import { ExamSchedule } from "./plan/ExamSchedule";
import { bestMatchingStation, deriveStations } from "./plan/stations";
import { invalidateHub } from "./learning-hub/queryHelpers";

// The 5 skills this screen shows, in this exact order — literal per the
// handoff (README §2.5), which deliberately does NOT use this app's usual
// DISPLAY_SKILLS merge (listening stays separate from speaking here; vocab
// isn't shown at all). A dedicated set for this one screen, not a shared
// lib/skills.ts export, since no other screen groups skills this way.
const WEAKEST_STRIP_SKILLS: { skill: RoadmapSkill; short: string }[] = [
  { skill: "reading", short: "READ" },
  { skill: "listening", short: "LISTEN" },
  { skill: "grammar", short: "GRAM" },
  { skill: "writing", short: "WRITE" },
  { skill: "speaking", short: "SPEAK" },
];

const DAILY_MINUTES_GOAL = 30;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/** Best-effort task-length estimate — no explicit duration field exists on
 * RoadmapTask (only self-reported minutesSpent, which only exists after
 * completion), so this is a type-based heuristic, not real per-task data. */
function estimateFor(task: DashboardNextTask): string {
  switch (task.type) {
    case "vocab":
      return "~10 min";
    case "milestone_test":
      return "~15 min";
    case "study_source":
      return "~20 min";
    default:
      return "~10 min";
  }
}

function ctaFor(task: DashboardNextTask, push: (path: string) => void, switchTab: (path: string) => void) {
  switch (task.type) {
    case "vocab":
      return () => push("/review");
    case "milestone_test":
      return () => switchTab("/plan/self-tests");
    case "study_source":
      return () => switchTab("/plan/sources");
    default:
      return () => switchTab("/plan");
  }
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]!.slice(0, 2).toUpperCase() : (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export default function Dashboard() {
  const { switchTab, push } = useNavStack();
  const queryClient = useQueryClient();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [examScheduleOpen, setExamScheduleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: activity } = useQuery({ queryKey: ["activity", "summary", 1], queryFn: () => api.activitySummary(1) });
  // lg-only 3-column layout needs the full today's-task list (dashboard's
  // own payload only has tasksDone/tasksTotal/nextTask) and sources — both
  // real, both already fetched elsewhere in the app (Plan.tsx, Sources.tsx)
  const { data: todayFull } = useQuery({ queryKey: ["learning", "roadmap", "today"], queryFn: api.roadmapToday });
  const { data: sourcesData } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  // same query keys Plan.tsx/Stats.tsx already fetch under, so mounting
  // this page doesn't duplicate a request once either has loaded this
  // session — used by the lg-only column 1 streak strip and column 3
  // chapter-progress card below.
  const { data: week } = useQuery({ queryKey: ["roadmap", "week", undefined], queryFn: () => api.roadmapWeek() });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: progress } = useQuery({ queryKey: ["learning", "progress", "30d"], queryFn: () => api.learningProgress("30d") });
  const tomorrowDate = todayFull ? localDateStr(new Date(new Date(`${todayFull.date.slice(0, 10)}T00:00:00`).getTime() + 86_400_000)) : null;
  const { data: tomorrowFull } = useQuery({
    queryKey: ["roadmap", "day", tomorrowDate],
    queryFn: () => api.roadmapDay(tomorrowDate!),
    enabled: !!tomorrowDate,
  });
  const pullForward = useMutation({
    mutationFn: (count: number) => api.pullTasksForward(count),
    onSuccess: () => invalidateHub(queryClient),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mx-auto h-44 w-44 rounded-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const user = getUser();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const states = levelStates(data.learning.levels);
  const activeLevel = data.learning.levels[Math.max(0, states.indexOf("active"))]?.level ?? "a1";
  const activeLevelPercent = data.learning.levels.find((l) => l.level === activeLevel)?.percent ?? 0;

  const todayEntry = data.roadmapWeekStrip.find((d) => d.status === "today");
  const dayLabel = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const dayNumber = todayEntry ? todayEntry.dayOffset + 1 : null;

  const minsToday = activity?.minutesToday ?? 0;
  const minsPercent = Math.min(100, Math.round((minsToday / DAILY_MINUTES_GOAL) * 100));

  const examDate = data.examTargetDate ? new Date(`${data.examTargetDate}T00:00:00`) : null;
  const examDaysRaw = examDate ? Math.round((examDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null;
  const examAmber = examDaysRaw !== null && examDaysRaw >= 0 && examDaysRaw <= 14;

  const nextTask = data.roadmapToday?.nextTask ?? null;
  const roadmapStarted = data.roadmapToday !== null;

  const skillPerfMap = new Map(data.learning.skillPerformance.map((s) => [s.skill, s.percent]));
  const weakestStrip = WEAKEST_STRIP_SKILLS.map((s) => ({ ...s, pct: skillPerfMap.get(s.skill) ?? 0 }));
  const weakest = [...weakestStrip].sort((a, b) => a.pct - b.pct)[0]!;

  const startNextTask = () => {
    setTaskDetailOpen(false);
    if (!roadmapStarted) {
      switchTab("/plan");
      return;
    }
    if (!nextTask) {
      switchTab("/plan/self-tests");
      return;
    }
    ctaFor(nextTask, push, switchTab)();
  };

  // lg-only: column 1's streak strip (last 7 days of a 30d window already
  // fetched) and column 3's chapter-progress card (same station-matching
  // Plan.tsx's desktop right column already does).
  const last7Days = progress?.streakGrid.slice(-7) ?? [];
  const syllabusActiveLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const syllabusLevelItems = syllabus?.items.filter((i) => i.level === syllabusActiveLevel) ?? [];
  const dashboardStations = deriveStations(syllabusLevelItems);
  const matchedStation = week?.theme ? bestMatchingStation(dashboardStations, week.theme) : null;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)] lg:hidden"
      style={{ background: "radial-gradient(120% 48% at 50% 6%, #23263d 0%, #161826 64%)" }}
    >
      {/* ── header ── */}
      <div className="flex items-baseline justify-between">
        <div>
          {dayNumber !== null && (
            <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
              {dayLabel} · day {dayNumber}
            </div>
          )}
          <div className="mt-[3px] text-[29px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border px-2 py-0.5 text-micro font-medium uppercase" style={{ borderColor: "rgba(233,233,237,.16)" }}>
              {activeLevel.toUpperCase()}
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(233,233,237,.55)" }}>
              <Fire size={12} weight="fill" aria-hidden="true" />
              {data.streak} days
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Profile and settings"
            className="grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-medium"
            style={{
              letterSpacing: "-.01em",
              color: "#d2cefd",
              background: "linear-gradient(150deg,#3a3560,#272a45)",
              border: "1px solid rgba(181,171,252,.4)",
            }}
          >
            {initials(user?.name)}
          </button>
        </div>
      </div>
      <div
        className="mt-[11px] h-px shrink-0"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(233,233,237,.16) 40px, rgba(233,233,237,.16) calc(100% - 40px), transparent)",
        }}
      />

      {/* ── review dial ── */}
      <ReviewDial
        dueCount={data.dueToday}
        reviewedToday={data.reviewsToday}
        secondaryPercent={activeLevelPercent}
        onStart={() => push("/review")}
      />
      <div className="mt-2 flex justify-center gap-[18px] text-[10px]" style={{ color: "rgba(233,233,237,.62)" }}>
        <span className="flex items-center gap-[5px]">
          <i className="inline-block size-[7px] rounded-sm" style={{ background: "#9184d9" }} />
          review {data.dueToday}
        </span>
        <span className="flex items-center gap-[5px]">
          <i className="inline-block size-[7px] rounded-sm" style={{ background: "#423a6a" }} />
          new {data.newWords}
        </span>
      </div>

      {/* ── day strip ── */}
      <div className="mt-[13px] grid grid-cols-3 gap-2">
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="flex items-baseline gap-[3px]">
            <span className="tabular text-[21px] font-medium" style={{ letterSpacing: "-.02em" }}>{minsToday}</span>
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>/ {DAILY_MINUTES_GOAL}</span>
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>minutes today</div>
          <div className="mt-0.5 h-[3px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${minsPercent}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }}
            />
          </div>
        </div>
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="flex items-baseline gap-[3px]">
            <span className="tabular text-[21px] font-medium" style={{ letterSpacing: "-.02em" }}>
              {data.roadmapToday?.tasksDone ?? 0}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>/ {data.roadmapToday?.tasksTotal ?? 0}</span>
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>plan tasks</div>
          <div className="mt-0.5 h-[3px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${data.roadmapToday && data.roadmapToday.tasksTotal > 0 ? Math.round((data.roadmapToday.tasksDone / data.roadmapToday.tasksTotal) * 100) : 0}%`,
                background: "linear-gradient(90deg,#5d5294,#b5abfc)",
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExamScheduleOpen(true)}
          className="rounded-xl p-[11px] text-left"
          style={{ background: "#1c1f2c" }}
        >
          <div className="flex items-baseline gap-[3px]">
            <span className="tabular text-[21px] font-medium" style={{ letterSpacing: "-.02em", color: examAmber ? "#e4c4b6" : "#b5abfc" }}>
              {examDaysRaw === null ? "—" : examDaysRaw >= 0 ? examDaysRaw : Math.abs(examDaysRaw)}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
              {examDaysRaw === null ? "" : examDaysRaw > 0 ? "d" : examDaysRaw === 0 ? "" : "d ago"}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>to your exam</div>
          <div className="mt-[3px] text-[10px]" style={{ color: "rgba(233,233,237,.62)" }}>
            {examDate ? examDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Set a date →"}
          </div>
        </button>
      </div>

      {/* ── next in your plan hero card ── */}
      <div
        onClick={() => setTaskDetailOpen(true)}
        className="relative mt-3 cursor-pointer overflow-hidden rounded-2xl p-3.5"
        style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a, 0 12px 28px rgba(0,0,0,.4)" }}
      >
        <div
          className="animate-pulse-glow pointer-events-none absolute -top-10 -right-[34px] size-[140px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(145,132,217,.3), transparent)" }}
        />
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>Next in your plan</div>
          <span className="rounded-full border px-1.5 py-px text-[9px]" style={{ borderColor: "rgba(233,233,237,.14)", color: "rgba(233,233,237,.62)" }}>
            {nextTask?.skill ? SKILL_LABELS[nextTask.skill] : nextTask ? "Your own" : "Free"}
          </span>
        </div>
        <div className="mt-1.5 text-xl font-medium text-pretty" style={{ letterSpacing: "-.02em" }}>
          {!roadmapStarted
            ? "Start your 26-week roadmap"
            : nextTask
              ? nextTask.title
              : "Everything on today's plan is done."}
        </div>
        <div className="mt-[11px] flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!roadmapStarted) {
                switchTab("/plan");
                return;
              }
              startNextTask();
            }}
            className="min-h-[42px] rounded-[10px] px-4 text-[14px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            {!roadmapStarted ? "Get started" : nextTask ? "Start" : "Practise anyway"} →
          </button>
          {nextTask && (
            <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
              {estimateFor(nextTask)}
            </div>
          )}
        </div>
      </div>

      {/* ── weakest right now ── */}
      {/* pr reserves clearance for CaptureFab (46px + 18px right offset),
          which docks in this same bottom-right zone — without it, the FAB
          visually sits on top of the "Mastery" link on tall/sparse screens
          where mt-auto's slack pushes this block close to the tab bar. */}
      <div className="mt-auto pr-16 pt-4 pb-1">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="shrink-0 text-[10px] tracking-[.12em] whitespace-nowrap uppercase" style={{ color: "rgba(233,233,237,.5)" }}>
            Weakest right now
          </div>
          <span className="truncate text-[11px]" style={{ color: "#e4c4b6" }}>
            {SKILL_LABELS[weakest.skill]} · {weakest.pct} %
          </span>
          <button
            type="button"
            onClick={() => switchTab("/stats")}
            className="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] whitespace-nowrap"
            style={{ color: "#b5abfc" }}
          >
            Mastery ›
          </button>
        </div>
        <button type="button" onClick={() => switchTab("/stats")} className="flex w-full gap-[5px]">
          {weakestStrip.map((s) => {
            const weak = s.pct < 50;
            return (
              <div key={s.skill} className="flex flex-1 flex-col gap-[5px]">
                <div className="h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                  <div
                    className="h-full rounded-[3px] transition-[width] duration-300"
                    style={{ width: `${s.pct}%`, background: weak ? "#d19b86" : s.pct >= 70 ? "#b5abfc" : "#796cbf" }}
                  />
                </div>
                <span className="text-[10px] tracking-[.02em]" style={{ color: weak ? "#e4c4b6" : "rgba(233,233,237,.62)" }}>
                  {s.short}
                </span>
              </div>
            );
          })}
        </button>
      </div>
    </div>

    {/* ── lg+: 3-column desktop layout (German Companion Desktop.dc.html,
        id="1a") — same data as the mobile column above, laid out wider. ── */}
    <div
      className="hidden min-h-0 lg:flex lg:h-full lg:flex-col"
      style={{ background: "radial-gradient(120% 48% at 50% 6%, #23263d 0%, #161826 64%)" }}
    >
      <div className="flex items-end justify-between">
        <div>
          {dayNumber !== null && (
            <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
              {dayLabel} · day {dayNumber}
            </div>
          )}
          <div className="mt-1 text-[28px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </div>
        </div>
        <div className="flex items-center gap-[9px]">
          <button
            type="button"
            onClick={() => push("/review")}
            className="flex min-h-[38px] items-center gap-[7px] rounded-[10px] px-[15px] text-[13.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Start reviewing →
          </button>
        </div>
      </div>
      <div className="mt-4 h-px shrink-0" style={{ background: "linear-gradient(to right, rgba(233,233,237,.16), rgba(233,233,237,.16) calc(100% - 60px), transparent)" }} />

      <div className="mt-5 grid min-h-0 flex-1 grid-cols-[300px_1fr_288px] gap-5">
        {/* left column */}
        <div className="flex min-h-0 flex-col gap-3.5">
          <div className="flex flex-col items-center rounded-2xl p-[18px]" style={{ background: "linear-gradient(160deg,#232338,#1c1f2c)" }}>
            <ReviewDial dueCount={data.dueToday} reviewedToday={data.reviewsToday} secondaryPercent={activeLevelPercent} onStart={() => push("/review")} />
            <div className="mt-3 flex justify-center gap-[18px] text-[10.5px]" style={{ color: "rgba(233,233,237,.62)" }}>
              <span className="flex items-center gap-[5px]">
                <i className="inline-block size-[7px] rounded-sm" style={{ background: "#9184d9" }} />
                review {data.dueToday}
              </span>
              <span className="flex items-center gap-[5px]">
                <i className="inline-block size-[7px] rounded-sm" style={{ background: "#423a6a" }} />
                new {data.newWords}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-[13px]" style={{ background: "#1c1f2c" }}>
              <div className="flex items-baseline gap-[3px]">
                <span className="text-[22px] font-medium" style={{ letterSpacing: "-.02em" }}>{minsToday}</span>
                <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>/ {DAILY_MINUTES_GOAL}</span>
              </div>
              <div className="text-[10.5px]" style={{ color: "rgba(233,233,237,.55)" }}>minutes today</div>
              <div className="mt-[3px] h-[3px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
                <div className="h-full rounded-full" style={{ width: `${minsPercent}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
              </div>
            </div>
            <div className="rounded-xl p-[13px]" style={{ background: "#1c1f2c" }}>
              <div className="flex items-baseline gap-[3px]">
                <span className="text-[22px] font-medium" style={{ letterSpacing: "-.02em" }}>{data.roadmapToday?.tasksDone ?? 0}</span>
                <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>/ {data.roadmapToday?.tasksTotal ?? 0}</span>
              </div>
              <div className="text-[10.5px]" style={{ color: "rgba(233,233,237,.55)" }}>plan tasks</div>
              <div className="mt-[3px] h-[3px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${data.roadmapToday && data.roadmapToday.tasksTotal > 0 ? Math.round((data.roadmapToday.tasksDone / data.roadmapToday.tasksTotal) * 100) : 0}%`,
                    background: "linear-gradient(90deg,#5d5294,#b5abfc)",
                  }}
                />
              </div>
            </div>
          </div>

          {last7Days.length > 0 && (
            <button type="button" onClick={() => switchTab("/stats")} className="rounded-xl p-[14px] text-left" style={{ background: "#1c1f2c" }}>
              <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>7-day streak</div>
              <div className="mt-2.5 flex gap-[6px]">
                {last7Days.map((cell, i) => {
                  const isToday = i === last7Days.length - 1;
                  const intensity = cell.minutes === 0 ? 0 : cell.minutes < 15 ? 1 : cell.minutes < 30 ? 2 : cell.minutes < 60 ? 3 : 4;
                  const colors = ["#20222f", "#423a6a", "#5d5294", "#796cbf", "#9184d9"];
                  return (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${cell.minutes} min`}
                      className="h-[22px] flex-1 rounded-[5px]"
                      style={{ background: isToday ? "#b5abfc" : colors[intensity] }}
                    />
                  );
                })}
              </div>
            </button>
          )}

          <button type="button" onClick={() => switchTab("/stats")} className="mt-auto rounded-xl p-[14px] text-left" style={{ background: "#1c1f2c" }}>
            <div className="flex items-center gap-[9px]">
              <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>Weakest right now</div>
              <span className="text-[11px]" style={{ color: "#e4c4b6" }}>{SKILL_LABELS[weakest.skill]} · {weakest.pct} %</span>
            </div>
            <div className="mt-2.5 flex gap-[6px]">
              {weakestStrip.map((s) => {
                const weak = s.pct < 50;
                return (
                  <div key={s.skill} className="flex flex-1 flex-col gap-[5px]">
                    <div className="h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                      <div className="h-full rounded-[3px]" style={{ width: `${s.pct}%`, background: weak ? "#d19b86" : s.pct >= 70 ? "#b5abfc" : "#796cbf" }} />
                    </div>
                    <span className="text-[9.5px]" style={{ color: weak ? "#e4c4b6" : "rgba(233,233,237,.55)" }}>{s.short}</span>
                  </div>
                );
              })}
            </div>
          </button>
        </div>

        {/* middle column */}
        <div className="flex min-h-0 flex-col gap-3.5">
          <div
            onClick={() => setTaskDetailOpen(true)}
            className="relative cursor-pointer overflow-hidden rounded-2xl p-[18px]"
            style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a, 0 12px 28px rgba(0,0,0,.4)" }}
          >
            <div className="animate-pulse-glow pointer-events-none absolute -top-[50px] -right-10 size-[180px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(145,132,217,.28), transparent)" }} />
            <div className="flex items-center gap-2">
              <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>Next in your plan</div>
              <span className="rounded-full border px-1.5 py-px text-[9px]" style={{ borderColor: "rgba(233,233,237,.14)", color: "rgba(233,233,237,.62)" }}>
                {nextTask?.skill ? SKILL_LABELS[nextTask.skill] : nextTask ? "Your own" : "Free"}
              </span>
            </div>
            <div className="mt-2 text-[23px] font-medium" style={{ letterSpacing: "-.02em" }}>
              {!roadmapStarted ? "Start your 26-week roadmap" : nextTask ? nextTask.title : "Everything on today's plan is done."}
            </div>
            {roadmapStarted && (
              <div className="mt-1.5 text-[12.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.65)" }}>
                {nextTask ? (nextTask.description ?? "Part of today's roadmap plan.") : "You can still open a self-test or work ahead on new words."}
              </div>
            )}
            <div className="mt-[15px] flex items-center gap-[14px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!roadmapStarted) {
                    switchTab("/plan");
                    return;
                  }
                  startNextTask();
                }}
                className="min-h-[42px] rounded-[10px] px-[17px] text-[14px] font-medium text-white"
                style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
              >
                {!roadmapStarted ? "Get started" : nextTask ? "Start" : "Practise anyway"} →
              </button>
              {nextTask && (
                <div className="text-[11.5px]" style={{ color: "rgba(233,233,237,.55)" }}>{estimateFor(nextTask)}</div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl" style={{ background: "#1c1f2c" }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
              <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
                Today's plan · {data.roadmapToday?.tasksDone ?? 0} of {data.roadmapToday?.tasksTotal ?? 0} done
              </div>
              <div className="flex items-center gap-3">
                {todayFull && (
                  <button type="button" onClick={() => setAddingTask((v) => !v)} className="text-[11.5px]" style={{ color: "#b5abfc" }}>
                    + Add task
                  </button>
                )}
                <button type="button" onClick={() => switchTab("/plan")} className="flex items-center gap-[5px] text-[11.5px]" style={{ color: "#b5abfc" }}>
                  See plan
                </button>
              </div>
            </div>
            {addingTask && todayFull && (
              <div className="px-4 pb-2.5">
                <AddTaskComposer
                  date={todayFull.date.slice(0, 10)}
                  onDone={() => {
                    setAddingTask(false);
                    invalidateHub(queryClient);
                  }}
                />
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-[7px] overflow-y-auto px-4 pb-3.5">
              {(todayFull?.tasks ?? []).length === 0 ? (
                <p className="text-[12.5px]" style={{ color: "rgba(233,233,237,.4)" }}>Nothing planned for today yet.</p>
              ) : (
                todayFull!.tasks.map((task) => {
                  const done = task.completedAt !== null;
                  const isNext = !done && nextTask?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={isNext ? () => setTaskDetailOpen(true) : undefined}
                      className="flex items-center gap-[11px] rounded-[10px] p-3"
                      style={{
                        background: isNext ? "linear-gradient(160deg,#2b2741,#232532)" : done ? "#20222f" : "#20222f",
                        boxShadow: isNext ? "0 0 0 1px #423a6a" : "none",
                        opacity: done ? 0.6 : 1,
                        cursor: isNext ? "pointer" : "default",
                      }}
                    >
                      <div
                        className="grid size-5 shrink-0 place-items-center rounded-[6px]"
                        style={{ background: done ? "#9184d9" : "transparent", border: done ? "none" : "1.5px solid rgba(233,233,237,.28)" }}
                      >
                        {done && <Check size={12} weight="regular" style={{ color: "#161826" }} aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium" style={{ textDecoration: done ? "line-through" : "none", textDecorationColor: "rgba(233,233,237,.35)" }}>
                          {task.title}
                        </div>
                        {task.minutesSpent !== null && (
                          <div className="text-[10.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
                            {task.minutesSpent} min
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {todayFull && todayFull.tasks.length > 0 && todayFull.tasks.every((t) => t.completedAt !== null) && (
                <div className="mt-1.5 rounded-[10px] p-3.5 text-center" style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}>
                  <div className="flex items-center justify-center gap-1.5 text-[13px] font-medium" style={{ color: "#d2cefd" }}>
                    <Sparkle size={14} weight="regular" aria-hidden="true" />
                    Nice work. Keep going?
                  </div>
                  <button
                    type="button"
                    disabled={pullForward.isPending}
                    onClick={() => pullForward.mutate(3)}
                    className="mt-2.5 min-h-[36px] rounded-[9px] px-4 text-[12.5px] font-medium text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
                  >
                    {pullForward.isPending ? "Pulling in more…" : "Pull in more tasks"}
                  </button>
                </div>
              )}

              {(todayFull?.tasks.length ?? 0) <= 3 && tomorrowFull && tomorrowFull.day.tasks.length > 0 && (
                <button
                  type="button"
                  disabled={pullForward.isPending}
                  onClick={() => pullForward.mutate(3)}
                  className="mt-1.5 rounded-[10px] p-3 text-left transition-opacity hover:opacity-80"
                  style={{ border: "1px dashed rgba(233,233,237,.16)", opacity: 0.55 }}
                >
                  <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>Next day tasks · tap to pull in</div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {tomorrowFull.day.tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="truncate text-[12.5px]">{t.title}</div>
                    ))}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="flex min-h-0 flex-col gap-3.5">
          <ChapterProgressCard station={matchedStation} onOpen={() => switchTab("/plan/syllabus")} />

          {sourcesData && sourcesData.sources.length > 0 && (
            <div className="flex min-h-0 flex-col gap-[11px] overflow-hidden rounded-xl p-[14px]" style={{ background: "#1c1f2c" }}>
              <div className="flex items-center justify-between">
                <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>Sources in play</div>
                <button type="button" onClick={() => switchTab("/plan/sources")} style={{ color: "rgba(233,233,237,.35)" }}>›</button>
              </div>
              <div className="flex flex-col gap-[11px] overflow-hidden">
                {sourcesData.sources.slice(0, 3).map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center gap-[9px]">
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">{s.title}</span>
                      <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>{s.percent ?? s.completedUnits}{s.percent !== null ? "%" : ""}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-[2px]" style={{ background: "#292b31" }}>
                      <div className="h-full" style={{ width: `${s.percent ?? 0}%`, background: "linear-gradient(90deg,#5d5294,#9184d9)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={() => switchTab("/jobs")} className="mt-auto rounded-xl p-[14px] text-left" style={{ background: "#1c1f2c" }}>
            <div className="flex items-center gap-2">
              <Briefcase size={14} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
              <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>Applications</div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[20px] font-medium">{data.applications.wishlist + data.applications.applied + data.applications.interview}</span>
              <span className="text-[11.5px]" style={{ color: "rgba(233,233,237,.55)" }}>open · {data.applications.offer} offer{data.applications.offer === 1 ? "" : "s"}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

      <BottomSheet open={taskDetailOpen} onClose={() => setTaskDetailOpen(false)}>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border px-1.5 py-px text-[9.5px]" style={{ borderColor: "rgba(233,233,237,.14)", color: "rgba(233,233,237,.62)" }}>
            {nextTask?.skill ? SKILL_LABELS[nextTask.skill] : "Free"}
          </span>
          <span className="text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>today's plan</span>
        </div>
        <div className="mt-[9px] text-xl font-medium text-pretty" style={{ letterSpacing: "-.02em" }}>
          {!roadmapStarted ? "Start your 26-week roadmap" : nextTask ? nextTask.title : "Nothing left on today's plan."}
        </div>
        <div className="mt-[9px] text-[13px] leading-[1.55] text-pretty" style={{ color: "rgba(233,233,237,.7)" }}>
          {!roadmapStarted
            ? "Generates a day-by-day plan to Goethe-exam readiness from your syllabus progress."
            : nextTask
              ? (nextTask.description ?? "Part of today's roadmap plan.")
              : "You can still open a self-test or work ahead on new words."}
        </div>
        <div className="mt-[15px] flex flex-col gap-[9px]">
          <div className="flex items-center gap-2.5 rounded-[11px] px-3 py-[11px]" style={{ background: "#20222f" }}>
            <span className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>Estimated</span>
            <span className="text-[12.5px] font-medium">{nextTask ? estimateFor(nextTask) : "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-[11px] px-3 py-[11px]" style={{ background: "#20222f" }}>
            <span className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>Moves</span>
            <span className="text-[12.5px] font-medium">
              {nextTask?.skill ? SKILL_LABELS[nextTask.skill] : nextTask ? "Your own goal" : "Your choice"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-[11px] px-3 py-[11px]" style={{ background: "#20222f" }}>
            <span className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>If you skip</span>
            <span className="text-[12.5px] font-medium">{nextTask ? "Rolls into your backlog" : "—"}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-[9px]">
          <button
            type="button"
            onClick={() => setTaskDetailOpen(false)}
            className="min-h-[46px] flex-1 rounded-[11px] border text-[14px] font-medium"
            style={{ borderColor: "rgba(233,233,237,.16)" }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={startNextTask}
            className="min-h-[46px] flex-[1.5] rounded-[11px] text-[15px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Start →
          </button>
        </div>
      </BottomSheet>

      <ExamSchedule open={examScheduleOpen} onClose={() => setExamScheduleOpen(false)} />
      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={user?.name}
        email={user?.email}
        level={activeLevel}
        dayNumber={dayNumber}
        streak={data.streak}
      />
    </>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fire } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { api, getUser } from "../api/client";
import type { DashboardNextTask, RoadmapSkill } from "../api/types";
import ReviewDial from "../components/ReviewDial";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Skeleton } from "../components/ui/Skeleton";
import { levelStates } from "../lib/levels";
import { SKILL_LABELS } from "../lib/skills";
import { useNavStack } from "../lib/navStack";

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

function ctaFor(task: DashboardNextTask, navigate: ReturnType<typeof useNavigate>, switchTab: (path: string) => void) {
  switch (task.type) {
    case "vocab":
      return () => navigate("/words?startReview=1");
    case "milestone_test":
      return () => switchTab("/plan?view=test");
    case "study_source":
      return () => switchTab("/plan?view=sources");
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
  const navigate = useNavigate();
  const { switchTab } = useNavStack();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: activity } = useQuery({ queryKey: ["activity", "summary", 1], queryFn: () => api.activitySummary(1) });

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
      switchTab("/plan?view=test");
      return;
    }
    ctaFor(nextTask, navigate, switchTab)();
  };

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
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
            onClick={() => navigate("/settings")}
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
        onStart={() => navigate("/words?startReview=1")}
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
          onClick={() => switchTab("/plan?view=syllabus")}
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
    </div>
  );
}

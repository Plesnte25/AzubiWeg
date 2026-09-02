import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  BookOpen,
  Cards,
  CaretDown,
  Check,
  ListChecks,
  NotePencil,
  Path,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { RoadmapDayStatus, RoadmapTask } from "../../api/types";
import { Skeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { useNavStack } from "../../lib/navStack";
import { SKILL_LABELS } from "../../lib/skills";
import type { Destination } from "../learning-hub/destinations";
import { TaskDetailDrawer } from "../learning-hub/TaskDetailDrawer";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { AddTaskComposer, ChapterProgressCard, localDateStr } from "./planShared";
import { bestMatchingStation, deriveStations } from "./stations";

type ViewMode = "day" | "week";

function estimateMinutes(task: RoadmapTask): number {
  switch (task.type) {
    case "vocab":
      return 10;
    case "milestone_test":
      return 15;
    case "study_source":
      return 20;
    default:
      return 10;
  }
}

function fmtWeekday(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
}

/** The 7-cell read-only week strip (check/fraction/dot per day) shown in
 * Day mode — literal, matching the handoff's Plan screen exactly (no
 * chevrons/month-header; Week mode below uses its own WeekOverview). */
function WeekStrip({ days }: { days: { date: string; status: RoadmapDayStatus; done: number; total: number }[] }) {
  return (
    <div className="flex gap-[5px]">
      {days.map((d) => {
        const isToday = d.status === "today";
        const isDone = d.status === "done" && d.total > 0;
        return (
          <div
            key={d.date}
            className="flex flex-1 flex-col items-center gap-[3px] rounded-[9px] py-[7px]"
            style={{
              background: isToday ? "linear-gradient(160deg,#2b2741,#232532)" : "#1c1f2c",
              boxShadow: isToday ? "0 0 0 1px #423a6a" : "none",
            }}
          >
            <span className="text-[9px] opacity-75">{fmtWeekday(d.date)}</span>
            <span className="text-[11px] font-medium">
              {isDone ? <Check size={11} weight="bold" aria-hidden="true" /> : d.total > 0 ? `${d.done}/${d.total}` : "·"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ task, onToggle, onOpen }: { task: RoadmapTask; onToggle: (c: boolean) => void; onOpen: () => void }) {
  const done = task.completedAt !== null;
  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-2.5" style={{ background: "transparent" }}>
      <button
        type="button"
        onClick={() => onToggle(!done)}
        aria-label={done ? "Mark not done" : "Mark done"}
        className="grid size-5 shrink-0 place-items-center rounded-full"
        style={{
          background: done ? "#9184d9" : "transparent",
          border: done ? "none" : "1px solid rgba(233,233,237,.25)",
        }}
      >
        {done && <Check size={13} weight="bold" style={{ color: "#161826" }} aria-hidden="true" />}
      </button>
      <div onClick={onOpen} className="min-w-0 flex-1 cursor-pointer">
        <div className="truncate text-[14.5px]" style={{ color: done ? "rgba(233,233,237,.4)" : "#e9e9ed", textDecoration: done ? "line-through" : "none" }}>
          {task.title}
        </div>
        <div className="mt-px text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
          {task.skill ? SKILL_LABELS[task.skill] : "General"} · ~{estimateMinutes(task)} min
        </div>
      </div>
      <CaretDown size={15} weight="regular" style={{ color: "rgba(233,233,237,.3)", transform: "rotate(-90deg)" }} aria-hidden="true" />
    </div>
  );
}

const SECTION_NAV_ITEMS = [
  { label: "Syllabus", icon: Path, to: "/plan/syllabus" },
  { label: "Sources", icon: BookOpen, to: "/plan/sources" },
  { label: "Notes", icon: NotePencil, to: "/plan/notes" },
  { label: "Tests", icon: ListChecks, to: "/plan/self-tests" },
];

/** Day view's title switches between "Today" and the picked date's own
 * weekday name; Week mode still always means the current week (this app's
 * only endpoint for "an arbitrary week" is per-week-number, not wired to a
 * picker here — the date-switching ask was specifically about Day view). */
function PlanHeader({
  view,
  onView,
  selectedDate,
  onSelectDate,
}: {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
}) {
  const todayStr = localDateStr(new Date());
  const titleDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            Roadmap
          </div>
          <div className="mt-px text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            {view === "week" ? "This week" : titleDate ? titleDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Today"}
          </div>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className="rounded-full px-3 py-1 text-[11.5px] font-medium capitalize"
              style={{ background: view === v ? "#9184d9" : "transparent", color: view === v ? "#161826" : "rgba(233,233,237,.6)" }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === "day" && (
        <div className="mt-2.5 flex items-center gap-2.5">
          <input
            type="date"
            value={selectedDate ?? todayStr}
            onChange={(e) => onSelectDate(e.target.value === todayStr ? null : e.target.value)}
            className="rounded-[9px] px-2.5 py-1.5 text-[12px] outline-none"
            style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
          />
          {selectedDate && (
            <button type="button" onClick={() => onSelectDate(null)} className="text-[11.5px] font-medium" style={{ color: "#b5abfc" }}>
              Back to today
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionNavRow({ push }: { push: (to: string) => void }) {
  return (
    <div className="mt-[13px] flex gap-[7px]">
      {SECTION_NAV_ITEMS.map(({ label, icon: Icon, to }) => (
        <button
          key={to}
          type="button"
          onClick={() => push(to)}
          className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12.5px]"
          style={{ background: "#20222f" }}
        >
          <Icon size={14} weight="regular" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}


function TomorrowCard({ tomorrow }: { tomorrow: { day: { tasks: { id: string; title: string }[] } } | undefined }) {
  return (
    <div className="rounded-xl p-[13px]" style={{ border: "1px dashed rgba(233,233,237,.14)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
          Tomorrow
        </div>
        <span className="text-[10px]" style={{ color: "rgba(233,233,237,.35)" }}>
          scheduled for you
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-[5px] text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>
        {!tomorrow ? (
          <Skeleton className="h-4 w-32" />
        ) : tomorrow.day.tasks.length === 0 ? (
          <span>Nothing scheduled yet.</span>
        ) : (
          tomorrow.day.tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <Cards size={13} weight="regular" style={{ color: "rgba(233,233,237,.35)" }} aria-hidden="true" />
              {t.title}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Shown once every task on the viewed day is complete — pulls tasks from
 * upcoming days into today via the same reschedule-in-a-transaction route
 * the backlog pull-into-today/spread actions already use (see
 * server/src/routes/roadmap.ts's pull-forward route), so a completed
 * pulled-forward task logs real time exactly like any other task. */
function KeepGoingCard({ onPull, pending }: { onPull: () => void; pending: boolean }) {
  return (
    <div className="mt-1.5 rounded-[10px] p-3.5 text-center" style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}>
      <div className="flex items-center justify-center gap-1.5 text-[13px] font-medium" style={{ color: "#d2cefd" }}>
        <Sparkle size={14} weight="regular" aria-hidden="true" />
        Nice work. Keep going?
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onPull}
        className="mt-2.5 min-h-[36px] rounded-[9px] px-4 text-[12.5px] font-medium text-white disabled:opacity-50"
        style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
      >
        {pending ? "Pulling in more…" : "Pull in more tasks"}
      </button>
    </div>
  );
}

export default function Plan() {
  const { push } = useNavStack();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("day");
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);
  // null = viewing today (the common case, backed by roadmapToday's richer
  // payload); a real date string = an arbitrary day picked via PlanHeader's
  // date input, backed by roadmapDay(date) instead. Both are normalized to
  // the same {date, tasks} shape below so the rest of this component
  // doesn't need to know which source it came from.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: todayResp, isLoading: todayRespLoading } = useQuery({
    queryKey: ["roadmap", "today"],
    queryFn: api.roadmapToday,
    enabled: !selectedDate,
  });
  const { data: selectedResp, isLoading: selectedRespLoading } = useQuery({
    queryKey: ["roadmap", "day", selectedDate],
    queryFn: () => api.roadmapDay(selectedDate!),
    enabled: !!selectedDate,
  });
  const today = selectedDate ? (selectedResp ? { date: selectedResp.day.date, tasks: selectedResp.day.tasks } : undefined) : todayResp;
  const todayLoading = selectedDate ? selectedRespLoading : todayRespLoading;
  const { data: week } = useQuery({ queryKey: ["roadmap", "week", undefined], queryFn: () => api.roadmapWeek() });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const tomorrowDate = today ? localDateStr(new Date(new Date(`${today.date.slice(0, 10)}T00:00:00`).getTime() + 86_400_000)) : null;
  const { data: tomorrow } = useQuery({
    queryKey: ["roadmap", "day", tomorrowDate],
    queryFn: () => api.roadmapDay(tomorrowDate!),
    enabled: !!tomorrowDate,
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: () => invalidateHub(queryClient),
    onError: () => toast.error("Couldn't update that task — try again."),
  });
  const pullForward = useMutation({
    mutationFn: (count: number) => api.pullTasksForward(count),
    onSuccess: () => invalidateHub(queryClient),
    onError: () => toast.error("Couldn't pull in more tasks — try again."),
  });

  const liveOpenTask = openTask && (today?.tasks.find((t) => t.id === openTask.id) ?? openTask);
  const onNavigate = (d: Destination) => push(d === "sources" ? "/plan/sources" : d === "test" ? "/plan/self-tests" : "/");

  const weekDays = week?.days.map((d) => ({ date: d.date, status: d.status, done: d.tasks.filter((t) => t.completedAt !== null).length, total: d.tasks.length }));

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const levelItems = syllabus?.items.filter((i) => i.level === activeLevel) ?? [];
  const stations = deriveStations(levelItems);
  const matchedStation = week?.theme ? bestMatchingStation(stations, week.theme) : null;

  const progressPct = today && today.tasks.length > 0 ? Math.round((today.tasks.filter((t) => t.completedAt !== null).length / today.tasks.length) * 100) : 0;
  const minutesLeft = today ? Math.max(0, today.tasks.filter((t) => t.completedAt === null).reduce((n, t) => n + estimateMinutes(t), 0)) : 0;

  return (
    <>
      {/* Mobile (and md) — single column, capped-pane, unchanged from the
          pre-desktop-pass layout. */}
      <div
        className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] lg:hidden"
        style={{ background: "radial-gradient(110% 40% at 20% 4%, #22253c, #161826 58%)" }}
      >
        <PlanHeader view={view} onView={setView} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <SectionNavRow push={push} />

        {todayLoading || !today ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : view === "week" ? (
          <WeekOverview onOpenTask={setOpenTask} />
        ) : (
          <>
            {weekDays && (
              <div className="mt-[15px]">
                <WeekStrip days={weekDays} />
              </div>
            )}

            <div className="mt-4 flex items-center gap-2.5">
              <div className="h-[5px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                <div className="h-full rounded-[3px] transition-[width] duration-300" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
              </div>
              <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                {today.tasks.filter((t) => t.completedAt !== null).length} of {today.tasks.length} · {minutesLeft} min left
              </span>
            </div>

            <div className="mt-[18px] flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2.5">
              {today.tasks.length === 0 ? (
                <p className="py-6 text-center text-[13.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
                  {selectedDate ? "Nothing scheduled." : "Nothing scheduled today."}
                </p>
              ) : (
                today.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={(c) => toggle.mutate({ id: t.id, completed: c })} onOpen={() => setOpenTask(t)} />
                ))
              )}

              {!selectedDate && (
                <>
                  {today.tasks.length > 0 && today.tasks.every((t) => t.completedAt !== null) && (
                    <KeepGoingCard onPull={() => pullForward.mutate(3)} pending={pullForward.isPending} />
                  )}

                  <AddTaskComposer date={today.date.slice(0, 10)} onDone={() => invalidateHub(queryClient)} />

                  <div className="mt-1.5">
                    <TomorrowCard tomorrow={tomorrow} />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Desktop (lg+) — German Companion Desktop.dc.html id="2c": labelled
          sidebar (Layout.tsx) + a 1.4fr/1fr grid (task list vs. chapter
          progress + tomorrow preview) in Day mode; Week mode reuses
          WeekOverview widened, since the handoff has no desktop spec for it. */}
      <div className="hidden lg:mx-auto lg:my-8 lg:flex lg:max-w-[1040px] lg:flex-col lg:gap-[18px]">
        <PlanHeader view={view} onView={setView} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <SectionNavRow push={push} />

        {todayLoading || !today ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : view === "week" ? (
          <WeekOverview onOpenTask={setOpenTask} />
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <div className="flex flex-col gap-4">
              {weekDays && <WeekStrip days={weekDays} />}

              <div className="flex items-center gap-2.5">
                <div className="h-[5px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                  <div className="h-full rounded-[3px] transition-[width] duration-300" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
                </div>
                <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                  {today.tasks.filter((t) => t.completedAt !== null).length} of {today.tasks.length} · {minutesLeft} min left
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {today.tasks.length === 0 ? (
                  <p className="py-6 text-center text-[13.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
                    {selectedDate ? "Nothing scheduled." : "Nothing scheduled today."}
                  </p>
                ) : (
                  today.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={(c) => toggle.mutate({ id: t.id, completed: c })} onOpen={() => setOpenTask(t)} />
                  ))
                )}
                {!selectedDate && today.tasks.length > 0 && today.tasks.every((t) => t.completedAt !== null) && (
                  <KeepGoingCard onPull={() => pullForward.mutate(3)} pending={pullForward.isPending} />
                )}
                {!selectedDate && <AddTaskComposer date={today.date.slice(0, 10)} onDone={() => invalidateHub(queryClient)} />}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <ChapterProgressCard station={matchedStation} onOpen={() => push("/plan/syllabus")} />
              {!selectedDate && <TomorrowCard tomorrow={tomorrow} />}
            </div>
          </div>
        )}
      </div>

      {liveOpenTask && <TaskDetailDrawer task={liveOpenTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </>
  );
}

/** Week mode — a Nocturne-styled adaptation of the pre-redesign RoadmapPage's
 * richer week view (all 7 days as cards, backlog pull/spread + undo, pace
 * stats). Not in the handoff's literal Plan spec (which only shows the
 * Day/Week toggle existing, not what Week looks like) — real, previously-
 * shipped functionality worth keeping rather than dropping on the floor;
 * drag-and-drop reschedule (the one desktop-oriented, awkward-on-mobile
 * affordance) did not carry over. */
function WeekOverview({ onOpenTask }: { onOpenTask: (t: RoadmapTask) => void }) {
  const queryClient = useQueryClient();
  const { push } = useNavStack();
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "week", undefined], queryFn: () => api.roadmapWeek() });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [pendingUndo, setPendingUndo] = useState<{ id: string; fromDayOffset: number }[] | null>(null);

  useEffect(() => {
    if (!pendingUndo) return;
    const id = setTimeout(() => setPendingUndo(null), 10_000);
    return () => clearTimeout(id);
  }, [pendingUndo]);

  const pullIntoToday = useMutation({
    mutationFn: () => api.pullBacklogIntoToday(),
    onSuccess: (res) => {
      invalidateHub(queryClient);
      setPendingUndo(res.moved);
    },
    onError: () => toast.error("Couldn't pull backlog into today — try again."),
  });
  const spread = useMutation({
    mutationFn: () => api.spreadBacklog(),
    onSuccess: (res) => {
      invalidateHub(queryClient);
      setPendingUndo(res.moved);
    },
    onError: () => toast.error("Couldn't spread the backlog — try again."),
  });
  const undo = useMutation({
    mutationFn: async (moved: { id: string; fromDayOffset: number }[]) => {
      for (const m of moved) await api.rescheduleRoadmapTask(m.id, m.fromDayOffset);
    },
    onSuccess: () => {
      invalidateHub(queryClient);
      setPendingUndo(null);
    },
    onError: () => toast.error("Couldn't undo — try again."),
  });
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: () => invalidateHub(queryClient),
    onError: () => toast.error("Couldn't update that task — try again."),
  });

  if (isLoading || !data) {
    return (
      <div className="mt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const levelItems = syllabus?.items.filter((i) => i.level === activeLevel) ?? [];
  const stations = deriveStations(levelItems);
  const matchedStation = data.theme ? bestMatchingStation(stations, data.theme) : null;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2.5">
      <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
            Week {data.week} of {data.totalWeeks}
          </span>
          <span className="tabular text-[13px] font-medium">
            {data.thisWeek.done}/{data.thisWeek.total} kept
          </span>
        </div>
        {data.theme && (
          <>
            <div className="mt-1.5 text-[14px] font-medium">{data.theme}</div>
            {matchedStation && (
              <button type="button" onClick={() => push("/plan/syllabus")} className="mt-1 text-[11.5px]" style={{ color: "#b5abfc" }}>
                Open in syllabus →
              </button>
            )}
          </>
        )}
      </div>

      {data.lateAcrossPlan > 0 && (
        <div className="rounded-xl p-3.5" style={{ background: "rgba(209,155,134,.14)" }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] tracking-[.08em] uppercase" style={{ color: "#e4c4b6" }}>
              Late across the plan
            </span>
            <span className="tabular text-[15px] font-medium" style={{ color: "#e4c4b6" }}>
              {data.lateAcrossPlan}
            </span>
          </div>
          {pendingUndo ? (
            <button
              type="button"
              onClick={() => undo.mutate(pendingUndo)}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: "#e4c4b6" }}
            >
              <ArrowCounterClockwise size={13} weight="regular" aria-hidden="true" />
              Undo ({pendingUndo.length} moved)
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => pullIntoToday.mutate()} className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-medium" style={{ background: "rgba(233,233,237,.1)", color: "#e4c4b6" }}>
                Pull into today
              </button>
              <button type="button" onClick={() => spread.mutate()} className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-medium" style={{ background: "rgba(233,233,237,.1)", color: "#e4c4b6" }}>
                Spread over 3 days
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
        <div className="grid grid-cols-3 gap-2 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          <div>
            <div className="tabular text-[15px] font-medium text-white">{data.pace.plannedTasksPerDay}</div>
            planned/day
          </div>
          <div>
            <div className="tabular text-[15px] font-medium text-white">{data.pace.actualTasksPerDay}</div>
            actual/day
          </div>
          <div>
            <div className="tabular text-[15px] font-medium text-white">{data.pace.daysLeft}</div>
            days left
          </div>
        </div>
      </div>

      {data.days.map((day) => {
        const active = day.tasks.filter((t) => !t.droppedAt);
        const done = active.filter((t) => t.completedAt !== null).length;
        return (
          <div key={day.dayOffset} className="rounded-xl p-3.5" style={{ background: day.status === "today" ? "rgba(145,132,217,.1)" : "#1c1f2c", boxShadow: day.status === "today" ? "0 0 0 1px #9184d9" : "none" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium">
                {new Date(`${day.date.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                {active.length === 0 ? "rest day" : `${done}/${active.length} done`}
              </span>
            </div>
            {active.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {active.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle.mutate({ id: t.id, completed: t.completedAt === null })}
                      className="grid size-4 shrink-0 place-items-center rounded-full"
                      style={{ background: t.completedAt !== null ? "#9184d9" : "transparent", border: t.completedAt !== null ? "none" : "1px solid rgba(233,233,237,.25)" }}
                    >
                      {t.completedAt !== null && <Check size={10} weight="bold" style={{ color: "#161826" }} aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={() => onOpenTask(t)} className="min-w-0 flex-1 truncate text-left text-[13px]" style={{ color: t.completedAt !== null ? "rgba(233,233,237,.4)" : "#e9e9ed", textDecoration: t.completedAt !== null ? "line-through" : "none" }}>
                      {t.title}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

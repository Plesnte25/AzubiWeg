import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  BookOpen,
  Cards,
  CaretDown,
  Check,
  NotePencil,
  Path,
  Plus,
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
import { bestMatchingStation, deriveStations } from "./stations";

type ViewMode = "day" | "week";

const TASK_PRESETS = ["Review 10 flashcards", "Read one page in German", "Write 3 sentences"];

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

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtWeekday(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
}

/** The 7-cell read-only week strip (check/fraction/dot per day) — a
 * literal, much simpler sibling of components/RoadmapWeekStrip.tsx (which
 * stays in Week mode below, chevrons/month-header and all; this one has
 * neither, matching the handoff's Plan screen exactly). */
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
              background: isToday ? "rgba(145,132,217,.16)" : "#1c1f2c",
              boxShadow: isToday ? "0 0 0 1px #9184d9" : "none",
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

function AddTaskComposer({ date, onDone }: { date: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const add = useMutation({
    mutationFn: () => api.addRoadmapTask({ date, title: title.trim() }),
    onSuccess: () => {
      invalidateHub(queryClient);
      setTitle("");
      setOpen(false);
      onDone();
    },
    onError: () => toast.error("Couldn't add that task — try again."),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl p-[13px] text-left text-[14px]"
        style={{ border: "1px dashed rgba(145,132,217,.4)", color: "#b5abfc" }}
      >
        <Plus size={17} weight="regular" aria-hidden="true" />
        Add a task to today
      </button>
    );
  }

  return (
    <div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) add.mutate();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="e.g. Read one page of a German book"
        className="box-border w-full rounded-[11px] px-[13px] text-[14px] outline-none"
        style={{ minHeight: 44, color: "#e9e9ed", background: "#20222f", border: "1px solid #9184d9" }}
      />
      <div className="mt-2 flex flex-wrap gap-[7px]">
        {TASK_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTitle(p)}
            className="rounded-full px-[11px] py-[5px] text-[11.5px] whitespace-nowrap"
            style={{ border: "1px solid rgba(233,233,237,.14)", color: "rgba(233,233,237,.65)" }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px] font-medium"
          style={{ background: "#20222f" }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!title.trim() || add.isPending}
          onClick={() => add.mutate()}
          className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px] font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          Add task
        </button>
      </div>
    </div>
  );
}

export default function Plan() {
  const { push } = useNavStack();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("day");
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);

  const { data: today, isLoading: todayLoading } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday });
  const { data: week } = useQuery({ queryKey: ["roadmap", "week", undefined], queryFn: () => api.roadmapWeek() });
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

  const liveOpenTask = openTask && (today?.tasks.find((t) => t.id === openTask.id) ?? openTask);
  const onNavigate = (d: Destination) => push(d === "sources" ? "/plan/sources" : d === "test" ? "/plan/self-tests" : "/");

  const weekDays = week?.days.map((d) => ({ date: d.date, status: d.status, done: d.tasks.filter((t) => t.completedAt !== null).length, total: d.tasks.length }));

  return (
    <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-[18px] pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "radial-gradient(110% 40% at 20% 4%, #22253c, #161826 58%)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            Roadmap
          </div>
          <div className="mt-px text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            {view === "day" ? "Today" : "This week"}
          </div>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className="rounded-full px-3 py-1 text-[11.5px] font-medium capitalize"
              style={{ background: view === v ? "#9184d9" : "transparent", color: view === v ? "#161826" : "rgba(233,233,237,.6)" }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[13px] flex gap-[7px]">
        {[
          { label: "Syllabus", icon: Path, to: "/plan/syllabus" },
          { label: "Sources", icon: BookOpen, to: "/plan/sources" },
          { label: "Notes", icon: NotePencil, to: "/plan/notes" },
        ].map(({ label, icon: Icon, to }) => (
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
              <div
                className="h-full rounded-[3px] transition-[width] duration-300"
                style={{
                  width: `${today.tasks.length === 0 ? 0 : Math.round((today.tasks.filter((t) => t.completedAt !== null).length / today.tasks.length) * 100)}%`,
                  background: "linear-gradient(90deg,#5d5294,#b5abfc)",
                }}
              />
            </div>
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
              {today.tasks.filter((t) => t.completedAt !== null).length} of {today.tasks.length} ·{" "}
              {Math.max(0, today.tasks.filter((t) => t.completedAt === null).reduce((n, t) => n + estimateMinutes(t), 0))} min left
            </span>
          </div>

          <div className="mt-[18px] flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2.5">
            {today.tasks.length === 0 ? (
              <p className="py-6 text-center text-[13.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
                Nothing scheduled today.
              </p>
            ) : (
              today.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={(c) => toggle.mutate({ id: t.id, completed: c })} onOpen={() => setOpenTask(t)} />
              ))
            )}

            <AddTaskComposer date={today.date.slice(0, 10)} onDone={() => invalidateHub(queryClient)} />

            <div className="mt-1.5 rounded-xl p-[13px]" style={{ border: "1px dashed rgba(233,233,237,.14)" }}>
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
          </div>
        </>
      )}

      {liveOpenTask && <TaskDetailDrawer task={liveOpenTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
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

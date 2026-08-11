import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Plus, X } from "lucide-react";
import { createPortal } from "react-dom";
import { api } from "../../api/client";
import type { MovedTask, RoadmapCalendarDay, RoadmapDayStatus, RoadmapTask, RoadmapWeekDay } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import RoadmapWeekStrip from "../../components/RoadmapWeekStrip";
import { SKILL_COLORS, SKILL_LABELS } from "../../lib/skills";
import type { Destination } from "./LearningRail";
import { invalidateHub } from "./queryHelpers";
import { deriveStations } from "./stations";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

function fmtDay(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
}
function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekDaysFromRoadmapWeek(days: RoadmapWeekDay[]): RoadmapCalendarDay[] {
  return days.map((d) => ({
    date: d.date,
    dayOffset: d.dayOffset,
    theme: d.theme,
    totalTasks: d.tasks.length,
    completedTasks: d.tasks.filter((t) => t.completedAt !== null).length,
    status: d.status,
  }));
}

const tokenize = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").split(" ").filter(Boolean));

/** Roadmap week themes and Syllabus station themes were authored somewhat
 * independently (different strings for the "same" topic in several places),
 * so an exact match often misses — best-effort word-overlap, same recipe as
 * the self-test notebook-linking matcher in routes/learning.ts. */
function bestMatchingStation<T extends { theme: string }>(stations: T[], weekTheme: string): T | null {
  const exact = stations.find((s) => s.theme === weekTheme);
  if (exact) return exact;
  const weekTokens = tokenize(weekTheme);
  const scored = stations
    .map((s) => ({ station: s, score: [...weekTokens].filter((t) => tokenize(s.theme).has(t)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.station ?? null;
}

function TaskChip({
  task,
  draggable,
  onToggle,
  onDrop: onDropped,
  onOpen,
}: {
  task: RoadmapTask;
  draggable?: boolean;
  onToggle: (c: boolean) => void;
  onDrop?: () => void;
  onOpen: () => void;
}) {
  const done = task.completedAt !== null;
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:border-brand-300 ${
        draggable ? "cursor-grab border-warn-tint-200 bg-card active:cursor-grabbing" : "border-hairline bg-card"
      }`}
    >
      <button
        onClick={() => onToggle(!done)}
        className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border text-[8px] text-white ${done ? "border-ink-900 bg-ink-900" : "border-hairline"}`}
      >
        {done && "✓"}
      </button>
      <button className="min-w-0 flex-1 text-left hover:text-brand-500" onClick={onOpen}>
        <span className={`block truncate ${done ? "text-ink-400 line-through" : ""}`}>{task.title}</span>
        {task.description && <span className="mt-0.5 block truncate text-xs font-normal text-ink-400">{task.description}</span>}
      </button>
      {task.skill && (
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: `color-mix(in srgb, ${SKILL_COLORS[task.skill]} 16%, transparent)`,
            color: SKILL_COLORS[task.skill],
          }}
        >
          {SKILL_LABELS[task.skill]}
        </span>
      )}
      {onDropped && (
        <button onClick={onDropped} title="Drop this task" className="mt-0.5 shrink-0 text-xs text-ink-400 hover:text-warn-500">
          ✕
        </button>
      )}
    </div>
  );
}

function useAddTask(date: string, onClose: () => void) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () => api.addRoadmapTask({ date, title }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
  });
  return { title, setTitle, save };
}

/** lg: unchanged centered dialog via the shared Modal component. */
function AddTaskDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const { title, setTitle, save } = useAddTask(date, onClose);
  return (
    <Modal title={`Add task — ${fmtDate(date)}`} onClose={onClose} size="sm" desktopOnly>
      <div className="space-y-3">
        <input
          autoFocus
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button className="w-full" disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
          Add task
        </Button>
      </div>
    </Modal>
  );
}

/** Below lg: centered "flashcard" card over a blurred backdrop, matching
 * TodayPage's LogTimeCard / vocabulary/ReviewModal.tsx's shell — no
 * separate title-bar chrome, just the card with a small corner close
 * button, replacing the previous sheetOnSm full-screen takeover. */
function AddTaskCard({ date, onClose }: { date: string; onClose: () => void }) {
  const { title, setTitle, save } = useAddTask(date, onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-[6px] lg:hidden">
      <div className="relative w-full max-w-sm rounded-2xl border border-hairline bg-card p-5 shadow-xl">
        <button className="absolute right-3 top-3 grid size-7 place-items-center rounded-full hover:bg-paper" onClick={onClose} title="Close">
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 className="mb-3 text-base font-semibold">Add task — {fmtDate(date)}</h2>
        <div className="space-y-3">
          <input
            autoFocus
            className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button className="w-full" disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Add task
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const BEAD: Record<RoadmapDayStatus, string> = {
  done: "size-[11px] bg-ink-900 border-2 border-paper",
  overdue: "size-[11px] bg-ink-900 border-2 border-paper",
  today: "size-[17px] bg-brand-500 border-[3px] border-paper shadow-[0_0_0_3px_var(--color-brand-50)]",
  upcoming: "size-[9px] bg-card border-2 border-[var(--color-hairline)]",
};

/** The road: a bead + connecting line per day, redone from scratch after
 * the previous version (a single line spanning the whole list, computed
 * from JS-tracked isFirst/isLast + inline top/bottom pixel offsets) drifted
 * out of alignment under variable row heights. This version has no
 * cross-row math at all — each day owns a small rail column that's a flex
 * item of its own row, so it auto-stretches (align-items: stretch, the flex
 * default) to exactly that row's real rendered height, collapsed or
 * expanded, with zero JS involved. The line is two segments (fixed-height
 * above the bead, flex-1 below it) *within that same stretched column*, so
 * it always reaches exactly this row's own top and bottom — nothing to get
 * out of sync. The tradeoff: the line has a small visible break at each
 * gap between day cards (a common, deliberate look in real timeline UIs,
 * e.g. GitHub's commit graph) rather than one unbroken line — that's the
 * price of a design with no shared cross-row state to drift. */
function DayRail({ status, isFirst, isLast }: { status: RoadmapDayStatus; isFirst: boolean; isLast: boolean }) {
  const tone = status === "upcoming" ? "bg-[var(--color-hairline)]" : "bg-ink-900";
  return (
    <div className="flex w-5 shrink-0 flex-col items-center self-stretch" aria-hidden="true">
      <div className={`w-0.5 shrink-0 ${isFirst ? "bg-transparent" : tone}`} style={{ height: 18 }} />
      <div className="flex h-9 shrink-0 items-center justify-center">
        <span className={`shrink-0 rounded-full ${BEAD[status]}`} />
      </div>
      <div className={`w-0.5 flex-1 ${isLast ? "bg-transparent" : tone}`} />
    </div>
  );
}

/** One day's plan — a collapsible card (today starts open, every other day
 * starts collapsed to a brief header: date, status, done-count, progress
 * bar). The add-task button stays a sibling of the collapse toggle, not
 * nested inside it — matching TodayPage's CollapsibleSection's same
 * nested-button concern for its "Reschedule all" action. Drag-and-drop
 * reschedule targets the whole card, so it still works while collapsed. */
function DayCard({
  day,
  isFirst,
  isLast,
  onAddTask,
  onOpenTask,
}: {
  day: RoadmapWeekDay;
  isFirst: boolean;
  isLast: boolean;
  onAddTask: (date: string) => void;
  onOpenTask: (task: RoadmapTask) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(day.status === "today");
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: () => invalidateHub(queryClient),
  });
  const drop = useMutation({
    mutationFn: (id: string) => api.updateRoadmapTask(id, { dropped: true }),
    onSuccess: () => invalidateHub(queryClient),
  });
  const reschedule = useMutation({
    mutationFn: (taskId: string) => api.rescheduleRoadmapTask(taskId, day.dayOffset),
    onSuccess: () => invalidateHub(queryClient),
  });

  // Deutschland-Context ("bureaucracy") tasks are real roadmap content but
  // stay confined to the Checklist page — not shown (or counted) in this
  // day's visible task list/progress.
  const activeTasks = day.tasks.filter((t) => !t.droppedAt && t.skill !== "bureaucracy");
  const isRest = activeTasks.length === 0;
  const done = activeTasks.filter((t) => t.completedAt !== null).length;

  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) reschedule.mutate(taskId);
  };

  const cardClass =
    day.status === "overdue"
      ? "border-warn-tint-100 bg-warn-tint-50"
      : day.status === "today"
        ? "border-[1.5px] border-ink-900 bg-card"
        : "border-hairline bg-card";

  return (
    <div className="flex gap-3">
      <DayRail status={day.status} isFirst={isFirst} isLast={isLast} />
      <div
        className={`min-w-0 flex-1 rounded-[18px] border p-3.5 transition-colors hover:border-brand-300 ${cardClass}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
      <div className="flex items-center justify-between gap-2">
        {isRest ? (
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="text-[13px] font-bold">
              {fmtDay(day.date)}, {fmtDate(day.date)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <ChevronDown className={`size-3.5 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            <span className="truncate text-[13px] font-bold">
              {fmtDay(day.date)}, {fmtDate(day.date)}
            </span>
            {day.status === "overdue" && <span className="shrink-0 text-[11px] font-semibold text-warn-700">overdue</span>}
            {day.status === "today" && <span className="shrink-0 text-[11px] font-semibold text-brand-500">today</span>}
            <span className="shrink-0 text-xs text-ink-400">
              {done}/{activeTasks.length} done
            </span>
          </button>
        )}
        <button onClick={() => onAddTask(day.date.slice(0, 10))} title="Add a task" className="shrink-0 text-ink-400 hover:text-ink-900">
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {!isRest &&
        (activeTasks.length <= 12 ? (
          <div className="mt-2 flex gap-1">
            {activeTasks.map((t) => (
              <div key={t.id} className={`h-1 flex-1 rounded-full ${t.completedAt !== null ? "bg-ink-900" : "bg-hairline"}`} />
            ))}
          </div>
        ) : (
          // too many tasks for a legible segment-per-task row (e.g. a day that
          // absorbed a big backlog pull) — fall back to one proportional bar
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-hairline">
            <div className="h-full rounded-full bg-ink-900" style={{ width: `${(done / activeTasks.length) * 100}%` }} />
          </div>
        ))}

      {isRest ? (
        <p className="mt-2 text-sm text-ink-400">Rest day.</p>
      ) : (
        open && (
          <div className="mt-2.5 space-y-1.5">
            {activeTasks.map((t) => (
              <TaskChip
                key={t.id}
                task={t}
                draggable={day.status === "overdue" || day.status === "upcoming"}
                onToggle={(completed) => toggle.mutate({ id: t.id, completed })}
                onDrop={day.status === "overdue" && t.completedAt === null ? () => drop.mutate(t.id) : undefined}
                onOpen={() => onOpenTask(t)}
              />
            ))}
          </div>
        )
      )}
      </div>
    </div>
  );
}

const UNDO_WINDOW_MS = 10_000;

export function RoadmapPage({ onNavigate }: { onNavigate: (d: Destination) => void }) {
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<number | undefined>(undefined);
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "week", week], queryFn: () => api.roadmapWeek(week) });
  const { data: weekReview } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview() });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [addTaskDate, setAddTaskDate] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);
  // openTask is a snapshot captured at click time — after a mutation inside
  // the drawer invalidates ["roadmap", "week"] and it refetches, that
  // snapshot goes stale unless re-derived from the freshly-fetched days on
  // every render (same fix as TodayPage's identical openTask pattern).
  const liveOpenTask = openTask && (data?.days.flatMap((d) => d.tasks).find((t) => t.id === openTask.id) ?? openTask);
  const [pendingUndo, setPendingUndo] = useState<MovedTask[] | null>(null);

  useEffect(() => {
    if (!pendingUndo) return;
    const id = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
    return () => clearTimeout(id);
  }, [pendingUndo]);

  const pullIntoToday = useMutation({
    mutationFn: () => api.pullBacklogIntoToday(),
    onSuccess: (res) => {
      invalidateHub(queryClient);
      setPendingUndo(res.moved);
    },
  });
  const spread = useMutation({
    mutationFn: () => api.spreadBacklog(),
    onSuccess: (res) => {
      invalidateHub(queryClient);
      setPendingUndo(res.moved);
    },
  });
  const undo = useMutation({
    mutationFn: async (moved: MovedTask[]) => {
      for (const m of moved) await api.rescheduleRoadmapTask(m.id, m.fromDayOffset);
    },
    onSuccess: () => {
      invalidateHub(queryClient);
      setPendingUndo(null);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-[18px]" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_288px]">
          <div className="space-y-3.5">
            <Skeleton className="h-16 w-full rounded-[18px]" />
            <Skeleton className="h-16 w-full rounded-[18px]" />
            <Skeleton className="h-16 w-full rounded-[18px]" />
          </div>
          <Skeleton className="h-64 w-full rounded-[18px]" />
        </div>
      </div>
    );
  }

  const currentWeek = data.weeksOverview.find((w) => w.isCurrentWeek)?.week ?? data.week;

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const levelItems = syllabus?.items.filter((i) => i.level === activeLevel) ?? [];
  const stations = deriveStations(levelItems);
  const matchedStation = data.theme ? bestMatchingStation(stations, data.theme) : null;
  const matchedDone = matchedStation?.items.filter((i) => i.completedAt !== null).length ?? 0;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[23px] font-bold tracking-[-0.02em]">
            Roadmap · week {data.week} of {data.totalWeeks}
          </h1>
          <p className="text-[13px] text-ink-600">
            {fmtDate(data.weekStart)} – {fmtDate(data.weekEnd)}
            {data.theme && ` · ${data.theme}`} · {data.thisWeek.done} of {data.thisWeek.total} tasks kept
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400"
            onClick={() => setWeek(currentWeek)}
            title="Jump to current week"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
          </button>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
            onClick={() => setAddTaskDate(new Date().toISOString().slice(0, 10))}
            title="Add a task"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden shrink-0 gap-1.5 lg:flex">
          <Button size="sm" variant={week === undefined || week === currentWeek ? "primary" : "outline"} onClick={() => setWeek(currentWeek)}>
            Today
          </Button>
          <Button size="sm" onClick={() => setAddTaskDate(new Date().toISOString().slice(0, 10))} leftIcon={<Plus className="size-3.5" aria-hidden="true" />}>
            Task
          </Button>
        </div>
      </div>

      <div className="rounded-[18px] border border-hairline bg-card p-4">
        <RoadmapWeekStrip
          // data.weekStart is a program week anchored to roadmapStartedAt, not
          // necessarily a calendar Monday — RoadmapWeekStrip doesn't require
          // that, it just renders 7 days forward from whatever it's given.
          weekStart={data.weekStart.slice(0, 10)}
          days={weekDaysFromRoadmapWeek(data.days)}
          selectedDate={null}
          onSelectDay={() => {}}
          onShiftWeek={(delta) => setWeek((w) => (w ?? data.week) + delta)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0 space-y-3.5">
          {data.days.map((day, i) => (
            <DayCard
              key={day.dayOffset}
              day={day}
              isFirst={i === 0}
              isLast={i === data.days.length - 1}
              onAddTask={setAddTaskDate}
              onOpenTask={setOpenTask}
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 md:grid md:grid-cols-3 lg:flex lg:flex-col">
          <div className="rounded-[18px] border border-hairline bg-card p-3.5 transition-colors hover:border-brand-300">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">This week</p>
            <p className="mt-1 text-lg font-bold">
              {data.thisWeek.done} <span className="text-sm font-normal text-ink-400">of {data.thisWeek.total}</span>
            </p>
            <div className="mt-2 flex h-[6px] gap-0.5 overflow-hidden rounded-full bg-warn-tint-100">
              <div className="rounded-full bg-ink-900" style={{ width: `${data.thisWeek.total === 0 ? 0 : (data.thisWeek.done / data.thisWeek.total) * 100}%` }} />
            </div>
            {weekReview && <p className="mt-2 text-xs text-ink-400">{weekReview.loggedMinutes} min logged</p>}

            {data.theme && (
              <>
                <div className="my-3 border-t border-hairline" />
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Week theme</p>
                <p className="mt-1 text-sm font-medium">{data.theme}</p>
                {matchedStation && (
                  <p className="mt-1 text-xs text-ink-600">
                    Station in the {activeLevel?.toUpperCase()} route. Closes when {matchedStation.items.length} of {matchedStation.items.length} items are
                    done — {matchedDone} done now.
                  </p>
                )}
                <button onClick={() => onNavigate("syllabus")} className="mt-1.5 text-xs font-semibold text-brand-500 hover:underline">
                  Open in syllabus →
                </button>
              </>
            )}
          </div>

          <div className="rounded-[18px] border border-warn-tint-100 bg-warn-tint-50 p-3.5 transition-colors hover:border-warn-tint-200">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-warn-700">Late across the plan</p>
            <p className="mt-1 text-lg font-bold text-warn-700">{data.lateAcrossPlan}</p>
            {pendingUndo ? (
              <Button size="sm" variant="outline" loading={undo.isPending} onClick={() => undo.mutate(pendingUndo)}>
                Undo ({pendingUndo.length} moved)
              </Button>
            ) : (
              data.lateAcrossPlan > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" loading={pullIntoToday.isPending} onClick={() => pullIntoToday.mutate()}>
                    Pull all into today
                  </Button>
                  <Button size="sm" variant="outline" loading={spread.isPending} onClick={() => spread.mutate()}>
                    Spread over 3 days
                  </Button>
                </div>
              )
            )}
          </div>

          <div className="rounded-[18px] border border-hairline bg-card p-3.5 transition-colors hover:border-brand-300">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Pace</p>
            <div className="mt-1.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-600">Planned</span>
                <span className="font-medium">{data.pace.plannedTasksPerDay}/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600">Actual</span>
                <span className="font-medium">{data.pace.actualTasksPerDay}/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600">Days left</span>
                <span className="font-medium">{data.pace.daysLeft}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {addTaskDate && (
        <>
          <AddTaskDialog date={addTaskDate} onClose={() => setAddTaskDate(null)} />
          <AddTaskCard date={addTaskDate} onClose={() => setAddTaskDate(null)} />
        </>
      )}
      {liveOpenTask && <TaskDetailDrawer task={liveOpenTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
  );
}

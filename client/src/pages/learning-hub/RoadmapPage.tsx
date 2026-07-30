import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "../../api/client";
import type { MovedTask, RoadmapTask, RoadmapWeekDay } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import type { Destination } from "./LearningRail";
import { invalidateHub } from "./queryHelpers";
import { deriveStations } from "./stations";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

const SKILL_LABEL: Record<string, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  bureaucracy: "Context",
  milestone: "Milestone",
  reflection: "Rest",
};

function fmtDay(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
}
function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
        draggable ? "cursor-grab border-warn-tint-200 bg-card active:cursor-grabbing" : "border-hairline bg-card"
      }`}
    >
      <button
        onClick={() => onToggle(!done)}
        className={`grid size-3.5 shrink-0 place-items-center rounded border text-[8px] text-white ${done ? "border-ink-900 bg-ink-900" : "border-hairline"}`}
      >
        {done && "✓"}
      </button>
      <button className="min-w-0 flex-1 truncate text-left hover:text-brand-500" onClick={onOpen}>
        <span className={done ? "text-ink-400 line-through" : ""}>{task.title}</span>
      </button>
      {task.skill && <span className="shrink-0 text-[10px] text-ink-400">{SKILL_LABEL[task.skill]}</span>}
      {onDropped && (
        <button onClick={onDropped} title="Drop this task" className="shrink-0 text-xs text-ink-400 hover:text-warn-500">
          ✕
        </button>
      )}
    </div>
  );
}

function AddTaskDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () => api.addRoadmapTask({ date, title }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
  });
  return (
    <Modal title={`Add task — ${fmtDate(date)}`} onClose={onClose} size="sm">
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

const BEAD: Record<string, string> = {
  done: "size-[11px] bg-ink-900 border-2 border-card",
  overdue: "size-[11px] bg-ink-900 border-2 border-card",
  today: "size-[17px] bg-brand-500 border-[3px] border-card shadow-[0_0_0_3px_var(--color-brand-50)]",
  upcoming: "size-[9px] bg-card border-2 border-[var(--color-hairline)]",
};

function DayRow({
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

  const activeTasks = day.tasks.filter((t) => !t.droppedAt);
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

  // Each row owns its own line segment (spanning its own full height, not a
  // percentage guess across the whole list) so alignment can never drift
  // when rows have wildly different heights (a day with 30+ carried-over
  // tasks next to a plain rest day) — the previous single full-height
  // gradient div assumed every row was the same height to compute where its
  // color transition should land, which broke the moment that stopped being
  // true. The first/last row's segment is trimmed to start/end exactly at
  // its own bead instead of running past it.
  const lineColor = day.status === "upcoming" ? "bg-[var(--color-hairline)]" : "bg-ink-900";
  const lineStyle: React.CSSProperties = isFirst ? { top: 18, bottom: 0 } : isLast ? { top: 0, height: 18 } : { top: 0, bottom: 0 };

  return (
    <div className="relative flex gap-3">
      <div className="w-[52px] shrink-0 pt-3.5 text-right">
        <p className="text-[11.5px] text-ink-400">{fmtDay(day.date)}</p>
        <p className="text-[13px] font-bold">{fmtDate(day.date).split(" ")[1]}</p>
      </div>
      <div className={`absolute left-[52px] w-[2px] -translate-x-1/2 ${lineColor}`} style={lineStyle} />
      <span
        className={`absolute left-[52px] top-[18px] z-10 -translate-x-1/2 -translate-y-1/2 rounded-full ${BEAD[day.status] ?? BEAD.upcoming}`}
      />
      <div className={`mb-2.5 min-w-0 flex-1 rounded-2xl border p-3.5 ${cardClass}`} onDragOver={onDragOver} onDrop={onDrop}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {day.status === "overdue" && <span className="text-[11px] font-semibold text-warn-700">overdue</span>}
            {day.status === "today" && <span className="text-[11px] font-semibold text-brand-500">today</span>}
            {!isRest && (
              <span className="text-xs text-ink-400">
                {done}/{activeTasks.length} done
              </span>
            )}
          </div>
          <button onClick={() => onAddTask(day.date.slice(0, 10))} title="Add a task" className="text-ink-400 hover:text-ink-900">
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        {!isRest &&
          (activeTasks.length <= 12 ? (
            <div className="mb-2 flex gap-1">
              {activeTasks.map((t) => (
                <div key={t.id} className={`h-1 flex-1 rounded-full ${t.completedAt !== null ? "bg-ink-900" : "bg-hairline"}`} />
              ))}
            </div>
          ) : (
            // too many tasks for a legible segment-per-task row (e.g. a day that
            // absorbed a big backlog pull) — fall back to one proportional bar
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-hairline">
              <div className="h-full rounded-full bg-ink-900" style={{ width: `${(done / activeTasks.length) * 100}%` }} />
            </div>
          ))}
        {isRest ? (
          <p className="text-sm text-ink-400">Rest day.</p>
        ) : (
          <div className="space-y-1.5">
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
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const currentWeek = data.weeksOverview.find((w) => w.isCurrentWeek)?.week ?? data.week;
  const maxTasks = Math.max(1, ...data.weeksOverview.map((w) => w.taskCount));

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const levelItems = syllabus?.items.filter((i) => i.level === activeLevel) ?? [];
  const stations = deriveStations(levelItems);
  const matchedStation = data.theme ? bestMatchingStation(stations, data.theme) : null;
  const matchedDone = matchedStation?.items.filter((i) => i.completedAt !== null).length ?? 0;

  return (
    <div className="rounded-[18px] border border-hairline bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-bold">
            Roadmap · week {data.week} of {data.totalWeeks}
          </h1>
          <p className="text-[13px] text-ink-600">
            {fmtDate(data.weekStart)} – {fmtDate(data.weekEnd)}
            {data.theme && ` · ${data.theme}`} · {data.thisWeek.done} of {data.thisWeek.total} tasks kept
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setWeek((w) => (w ?? data.week) - 1)}>
            <ChevronLeft className="size-3.5" aria-hidden="true" /> Week {data.week - 1}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWeek((w) => (w ?? data.week) + 1)}>
            Week {data.week + 1} <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
          <Button size="sm" variant={week === undefined || week === currentWeek ? "primary" : "outline"} onClick={() => setWeek(currentWeek)}>
            Today
          </Button>
          <Button size="sm" onClick={() => setAddTaskDate(new Date().toISOString().slice(0, 10))} leftIcon={<Plus className="size-3.5" aria-hidden="true" />}>
            Task
          </Button>
        </div>
      </div>

      {/* 26-week program strip */}
      <div className="mt-4 rounded-[13px] border border-hairline bg-paper p-3">
        <div className="flex h-[26px] items-end gap-px">
          {data.weeksOverview.map((w) => {
            const height = Math.max(3, Math.round((w.taskCount / maxTasks) * 26));
            const color = w.isCurrentWeek
              ? "bg-brand-500"
              : w.isExamWeek
                ? "bg-ink-900"
                : w.week < currentWeek
                  ? "bg-[var(--color-hairline)]"
                  : "bg-card";
            return (
              <button
                key={w.week}
                title={`Week ${w.week}${w.isExamWeek ? " · exam week" : ""}`}
                onClick={() => setWeek(w.week)}
                className={`flex-1 rounded-[1px] ${color}`}
                style={{ height }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-400">
          <span>Week 1</span>
          <span>exam weeks</span>
          <span>Week {data.totalWeeks}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="relative min-w-0">
          {data.days.map((day, i) => (
            <DayRow
              key={day.dayOffset}
              day={day}
              isFirst={i === 0}
              isLast={i === data.days.length - 1}
              onAddTask={setAddTaskDate}
              onOpenTask={setOpenTask}
            />
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-[13px] border border-hairline p-3.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">This week</p>
            <p className="mt-1 text-lg font-bold">
              {data.thisWeek.done} <span className="text-sm font-normal text-ink-400">of {data.thisWeek.total}</span>
            </p>
            <div className="mt-2 flex h-[6px] gap-0.5 overflow-hidden rounded-full bg-warn-tint-100">
              <div className="rounded-full bg-ink-900" style={{ width: `${data.thisWeek.total === 0 ? 0 : (data.thisWeek.done / data.thisWeek.total) * 100}%` }} />
            </div>
            {weekReview && <p className="mt-2 text-xs text-ink-400">{weekReview.loggedMinutes} min logged</p>}
          </div>

          <div className="rounded-[13px] border border-warn-tint-100 bg-warn-tint-50 p-3.5">
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

          {data.theme && (
            <div className="rounded-[13px] border border-hairline p-3.5">
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
            </div>
          )}

          <div className="rounded-[13px] border border-hairline p-3.5">
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

      {addTaskDate && <AddTaskDialog date={addTaskDate} onClose={() => setAddTaskDate(null)} />}
      {openTask && <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
  );
}

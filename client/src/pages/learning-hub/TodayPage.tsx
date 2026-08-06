import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { ChevronDown, Clock, Play, X } from "lucide-react";
import { api } from "../../api/client";
import type { RoadmapTask, RoadmapTaskType } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { SKILL_COLORS, SKILL_LABELS } from "../../lib/skills";
import type { Destination } from "./LearningRail";
import { invalidateHub } from "./queryHelpers";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import toDoListIcon from "../../assets/icons/to-do-list.png";
import deadlineIcon from "../../assets/icons/deadline.png";
import calendarDeadlineIcon from "../../assets/icons/calendar-deadline-date.png";
import sevenDaysIcon from "../../assets/icons/7-days.png";
import examIcon from "../../assets/icons/exam.png";

const MAX_VISIBLE = 5;

const TYPE_CTA: Partial<Record<RoadmapTaskType, { label: string; to: Destination }>> = {
  vocab: { label: "Open vocab →", to: "today" },
  study_source: { label: "Open source →", to: "sources" },
  milestone_test: { label: "Take test →", to: "test" },
};

function PlanRow({
  task,
  late,
  onNavigate,
  onOpen,
}: {
  task: RoadmapTask;
  late?: number;
  onNavigate: (d: Destination) => void;
  onOpen: (task: RoadmapTask) => void;
}) {
  const queryClient = useQueryClient();
  const done = task.completedAt !== null;
  const cta = TYPE_CTA[task.type];
  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.toggleRoadmapTask(task.id, completed),
    onSuccess: () => invalidateHub(queryClient),
  });

  return (
    <div className="flex items-center gap-3 border-t border-hairline py-3 first:border-t-0">
      <button
        onClick={() => toggle.mutate(!done)}
        className={`grid size-4 shrink-0 place-items-center rounded-[5px] border text-[10px] text-white ${
          done ? "border-ink-900 bg-ink-900" : "border-hairline"
        }`}
      >
        {done && "✓"}
      </button>
      <button className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium hover:text-brand-500" onClick={() => onOpen(task)}>
        <span className={done ? "text-ink-400 line-through" : ""}>{task.title}</span>
      </button>
      {task.skill && (
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold"
          style={{
            backgroundColor: `color-mix(in srgb, ${SKILL_COLORS[task.skill]} 16%, transparent)`,
            color: SKILL_COLORS[task.skill],
          }}
        >
          {SKILL_LABELS[task.skill]}
        </span>
      )}
      {late !== undefined && (
        <span className="shrink-0 text-[11.5px] font-medium text-warn-500">
          {late} day{late === 1 ? "" : "s"} late
        </span>
      )}
      {cta && !done && (
        <button onClick={() => onNavigate(cta.to)} className="shrink-0 text-[12px] font-semibold text-brand-500 hover:underline">
          {cta.label}
        </button>
      )}
    </div>
  );
}

/** Caps a task list to MAX_VISIBLE with an inline "+N more" expand — avoids
 * unbounded lists forcing page scroll on lg (carried-over backlogs can run
 * into the dozens). */
function CappedTaskList({
  tasks,
  onNavigate,
  onOpen,
  lateByTaskId,
}: {
  tasks: RoadmapTask[];
  onNavigate: (d: Destination) => void;
  onOpen: (task: RoadmapTask) => void;
  lateByTaskId?: Map<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, MAX_VISIBLE);
  const hidden = tasks.length - shown.length;
  return (
    <>
      {shown.map((t) => (
        <PlanRow key={t.id} task={t} late={lateByTaskId?.get(t.id)} onNavigate={onNavigate} onOpen={onOpen} />
      ))}
      {hidden > 0 && (
        <button onClick={() => setExpanded(true)} className="w-full border-t border-hairline py-2 text-center text-xs font-medium text-brand-500 hover:underline">
          +{hidden} more
        </button>
      )}
      {expanded && tasks.length > MAX_VISIBLE && (
        <button onClick={() => setExpanded(false)} className="w-full border-t border-hairline py-2 text-center text-xs font-medium text-ink-400 hover:underline">
          Show less
        </button>
      )}
    </>
  );
}

/** A single collapsible card section — used for "Today's tasks" (open by
 * default) and "Carried over" (closed by default, `warn` tone). The toggle
 * button wraps only the title/chevron, never the optional `action` (e.g.
 * "Reschedule all"), which renders as a sibling — nesting a second
 * interactive element inside the toggle button would be invalid HTML and
 * would double-fire the collapse on click. */
function CollapsibleSection({
  title,
  meta,
  defaultOpen,
  warn,
  action,
  children,
}: {
  title: string;
  meta?: string;
  defaultOpen: boolean;
  warn?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={warn ? "rounded-[18px] border border-warn-tint-100 bg-warn-tint-50" : "rounded-[18px] border border-hairline bg-card"}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={`size-3.5 shrink-0 transition-transform ${warn ? "text-warn-700" : "text-ink-400"} ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className={`truncate text-[13.5px] font-bold ${warn ? "text-warn-700" : "text-ink-900"}`}>
            {title}
            {meta && <span className="font-normal"> · {meta}</span>}
          </span>
        </button>
        {action}
      </div>
      {open && <div className="px-4 pb-3.5">{children}</div>}
    </div>
  );
}

/** Custom listbox replacing a native `<select>` — the browser's own dropdown
 * popup (position/style) can't be reliably controlled cross-browser and
 * rendered badly in testing (top-left, unstyled). Modeled on StateTabs.tsx's
 * `GroupByDropdown`, simplified: no createPortal-to-body escape hatch needed
 * since this always lives inside a plain floating card with no clipping
 * `overflow` ancestor (unlike GroupByDropdown's horizontally-scrollable row). */
function TaskPicker({ tasks, value, onChange }: { tasks: RoadmapTask[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = tasks.find((t) => t.id === value);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-left text-sm"
      >
        <span className="min-w-0 truncate">{selected?.title ?? "Select a task"}</span>
        <ChevronDown className={`size-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-hairline bg-card p-1 shadow-lg">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t.id === value}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm ${
                t.id === value ? "bg-brand-600 text-white" : "hover:bg-paper"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useLogTime(tasks: RoadmapTask[], onClose: () => void) {
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [minutes, setMinutes] = useState("15");
  const save = useMutation({
    mutationFn: () => {
      const task = tasks.find((t) => t.id === taskId);
      const prev = task?.minutesSpent ?? 0;
      return api.updateRoadmapTask(taskId, { minutesSpent: prev + Number(minutes) });
    },
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
  });
  return { taskId, setTaskId, minutes, setMinutes, save };
}

/** lg: unchanged centered dialog via the shared Modal component. */
function LogTimeDialog({ tasks, onClose }: { tasks: RoadmapTask[]; onClose: () => void }) {
  const { taskId, setTaskId, minutes, setMinutes, save } = useLogTime(tasks, onClose);

  if (tasks.length === 0) {
    return (
      <Modal title="Log study time" onClose={onClose} size="sm" desktopOnly>
        <p className="text-sm text-ink-600">No tasks scheduled today to log time against.</p>
      </Modal>
    );
  }

  return (
    <Modal title="Log study time" onClose={onClose} size="sm" desktopOnly>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-ink-600">Task</label>
          <TaskPicker tasks={tasks} value={taskId} onChange={setTaskId} />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600">Minutes</label>
          <input
            type="number"
            min={1}
            max={600}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-sm"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

/** Below lg: centered "flashcard" card over a blurred backdrop, matching
 * vocabulary/ReviewModal.tsx's shell exactly — no separate title-bar chrome,
 * just the card with a small corner close button. */
function LogTimeCard({ tasks, onClose }: { tasks: RoadmapTask[]; onClose: () => void }) {
  const { taskId, setTaskId, minutes, setMinutes, save } = useLogTime(tasks, onClose);

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
        <h2 className="mb-3 text-base font-semibold">Log study time</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-ink-600">No tasks scheduled today to log time against.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-600">Task</label>
              <TaskPicker tasks={tasks} value={taskId} onChange={setTaskId} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600">Minutes</label>
              <input
                type="number"
                min={1}
                max={600}
                className="mt-1 w-full rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-sm"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function TodayPage({ onNavigate }: { onNavigate: (d: Destination) => void }) {
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const activated = status?.activated ?? false;

  const { data: today, isLoading } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday, enabled: activated });
  const { data: weekReview } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview(), enabled: activated });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: quizResults } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });

  const [showLogTime, setShowLogTime] = useState(false);
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);
  // openTask is a snapshot captured at click time — after a mutation inside
  // the drawer invalidates ["roadmap", "today"] and it refetches, that
  // snapshot goes stale (its checkbox stops reflecting reality) unless we
  // re-derive the live copy from the freshly-fetched list on every render.
  const liveOpenTask =
    openTask &&
    (today?.tasks.find((t) => t.id === openTask.id) ??
      today?.backlog.flatMap((g) => g.tasks).find((t) => t.id === openTask.id) ??
      openTask);

  const dueCount = wordsData?.words.filter((w) => w.state === "due").length ?? 0;
  const overdueTasks = today?.backlog.reduce((n, g) => n + g.tasks.length, 0) ?? 0;
  const tasksTotal = today?.tasks.length ?? 0;
  const tasksDone = today?.tasks.filter((t) => t.completedAt !== null).length ?? 0;
  const todayPercent = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const activeItems = syllabus?.items.filter((i) => i.level === activeLevel) ?? [];
  const doneCount = activeItems.filter((i) => i.completedAt !== null).length;
  const scheduledCount = activeItems.filter((i) => i.completedAt === null && i.roadmapDayOffset !== null).length;
  const untouchedCount = activeItems.length - doneCount - scheduledCount;
  const nextUp = syllabus?.levels.find((l) => l.level === activeLevel)?.nextUp;

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const startTodaysPlan = () => {
    const first = today?.tasks.find((t) => t.completedAt === null);
    if (first) setOpenTask(first);
  };

  // Personalized "Test yourself" blurb — compares the latest two results so
  // returning users see a trend ("trending up"/"down from") instead of the
  // old static "at your current level" copy.
  const results = quizResults?.results ?? [];
  const latestResult = results[0];
  const prevResult = results[1];
  const levelLabel = activeLevel ? activeLevel.toUpperCase() : "your";
  let testBlurb: string;
  if (!latestResult) {
    testBlurb = `A quick mixed test at your ${levelLabel} level.`;
  } else if (!prevResult) {
    testBlurb = `${levelLabel} · last score ${latestResult.score}/${latestResult.total}`;
  } else {
    const latestPct = latestResult.score / latestResult.total;
    const prevPct = prevResult.score / prevResult.total;
    if (latestPct > prevPct) {
      testBlurb = `${levelLabel} · trending up — last score ${latestResult.score}/${latestResult.total} (was ${prevResult.score}/${prevResult.total} two tests ago)`;
    } else if (latestPct < prevPct) {
      testBlurb = `${levelLabel} · last score ${latestResult.score}/${latestResult.total} (down from ${prevResult.score}/${prevResult.total})`;
    } else {
      testBlurb = `${levelLabel} · holding steady at ${latestResult.score}/${latestResult.total}`;
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[23px] font-bold tracking-[-0.02em]">Today — {dateLabel}</h1>
          <p className="text-[13px] text-ink-600">
            {activated ? `${tasksDone} of ${tasksTotal} done · ` : ""}
            {dueCount} cards due
            {activated && overdueTasks > 0 && ` · ${overdueTasks} tasks carried over`}
          </p>
        </div>
        {activated && (
          <>
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <button
                className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400"
                onClick={() => setShowLogTime(true)}
                title="Log study time"
              >
                <Clock className="size-4" aria-hidden="true" />
              </button>
              <button
                className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
                onClick={startTodaysPlan}
                title="Start today's plan"
              >
                <Play className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="hidden shrink-0 gap-2 lg:flex">
              <Button variant="outline" size="sm" onClick={() => setShowLogTime(true)}>
                Log study time
              </Button>
              <Button size="sm" onClick={startTodaysPlan}>
                Start today's plan
              </Button>
            </div>
          </>
        )}
      </div>

      {activated && (
        <div className="flex rounded-2xl border border-hairline bg-card">
          {[
            { value: `${todayPercent}%`, label: "Today's tasks", color: "", icon: toDoListIcon },
            { value: String(dueCount), label: "Vocab due", color: "text-brand-500", icon: deadlineIcon },
            { value: String(overdueTasks), label: "Overdue tasks", color: "text-warn-500", icon: calendarDeadlineIcon },
            { value: String(weekReview?.loggedMinutes ?? 0), label: "Min. this week", color: "", icon: sevenDaysIcon },
            {
              value: quizResults?.results[0] ? `${quizResults.results[0].score}/${quizResults.results[0].total}` : "—",
              label: "Last self-test",
              color: "text-ok-600",
              icon: examIcon,
            },
          ].map((cell, i) => (
            <div
              key={cell.label}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-3.5 text-center md:flex-row md:justify-start md:gap-2.5 md:px-4 md:py-4 md:text-left ${i < 4 ? "border-r border-[var(--color-hairline)]" : ""}`}
            >
              <img src={cell.icon} alt="" className="size-4 shrink-0 md:size-5" />
              <div className="min-w-0">
                <p className={`text-[15px] font-bold md:text-[21px] ${cell.color}`}>{cell.value}</p>
                <p className="text-[9px] leading-tight text-ink-400 md:mt-1 md:text-[11px]">{cell.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0 space-y-3.5">
          {!activated ? (
            <div className="rounded-[18px] border border-hairline bg-card p-4">
              <h3 className="font-semibold">Vocab &amp; syllabus</h3>
              <p className="mt-1 text-sm text-ink-600">
                {dueCount} vocab card{dueCount === 1 ? "" : "s"} due.{" "}
                {nextUp && (
                  <>
                    Next up in {activeLevel?.toUpperCase()}: <span className="font-medium text-ink-900">{nextUp.title}</span>
                  </>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onNavigate("today")}>
                  Review vocab
                </Button>
                <Button size="sm" variant="outline" onClick={() => onNavigate("syllabus")}>
                  Open syllabus
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {syllabus && activeItems.length > 0 && (
                <div className="rounded-[18px] border border-hairline bg-card p-4">
                  <p className="text-[13.5px] font-bold">Where you are — {activeLevel?.toUpperCase()}</p>
                  <div className="mt-3 flex h-[9px] gap-0.5 rounded-full bg-paper p-0">
                    <div className="rounded-full bg-brand-500" style={{ flex: doneCount || 0.001 }} />
                    <div className="rounded-full bg-brand-100" style={{ flex: scheduledCount || 0.001 }} />
                    <div className="rounded-full bg-[var(--color-hairline)]" style={{ flex: untouchedCount || 0.001 }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-400">
                    {doneCount} done / {scheduledCount} scheduled / {untouchedCount} untouched
                  </p>
                </div>
              )}

              <CollapsibleSection title="Today's tasks" defaultOpen>
                {today && today.tasks.length === 0 ? (
                  <p className="py-2 text-sm text-ink-400">No tasks scheduled for today.</p>
                ) : (
                  <CappedTaskList tasks={today?.tasks ?? []} onNavigate={onNavigate} onOpen={setOpenTask} />
                )}
              </CollapsibleSection>

              {today && today.backlog.length > 0 && (
                <CollapsibleSection
                  title="Carried over"
                  meta={`${overdueTasks} task${overdueTasks === 1 ? "" : "s"}, ${today.backlog.length} day${today.backlog.length === 1 ? "" : "s"}`}
                  defaultOpen={false}
                  warn
                  action={
                    <button onClick={() => onNavigate("roadmap")} className="shrink-0 text-xs font-semibold text-warn-700 hover:underline">
                      Reschedule all
                    </button>
                  }
                >
                  <CappedTaskList
                    tasks={today.backlog.flatMap((g) => g.tasks)}
                    lateByTaskId={new Map(today.backlog.flatMap((g) => g.tasks.map((t) => [t.id, g.daysOverdue] as const)))}
                    onNavigate={onNavigate}
                    onOpen={setOpenTask}
                  />
                </CollapsibleSection>
              )}
            </>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-col gap-3.5 lg:flex lg:flex-col ${
            quizResults && quizResults.weakestTopics.length > 0 ? "md:grid md:grid-cols-2" : ""
          }`}
        >
          <div className="rounded-[18px] border border-hairline bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">Self-test</p>
            <h3 className="mt-0.5 font-semibold">Test yourself</h3>
            <p className="mt-1 text-sm text-ink-600">{testBlurb}</p>
            <Button className="mt-3 w-full" onClick={() => onNavigate("test")}>
              Start a test
            </Button>
          </div>

          {quizResults && quizResults.weakestTopics.length > 0 && (
            <div className="rounded-[18px] border border-hairline bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">Weak areas</p>
              <h3 className="mt-0.5 font-semibold">Still shaky on:</h3>
              <div className="mt-2 space-y-1.5">
                {quizResults.weakestTopics.map((w) => (
                  <div key={w.topic} className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">{w.topic}</span>
                    <span className={w.percent < 50 ? "font-medium text-brand-500" : "font-medium text-warn-500"}>{w.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLogTime && today && (
        <>
          <LogTimeDialog tasks={today.tasks} onClose={() => setShowLogTime(false)} />
          <LogTimeCard tasks={today.tasks} onClose={() => setShowLogTime(false)} />
        </>
      )}
      {liveOpenTask && <TaskDetailDrawer task={liveOpenTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
  );
}

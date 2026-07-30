import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { RoadmapCalendarDay, RoadmapTask, RoadmapTaskType } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import RoadmapWeekStrip from "../../components/RoadmapWeekStrip";
import type { Destination } from "./LearningRail";
import { invalidateHub } from "./queryHelpers";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

const MAX_VISIBLE = 5;

const TYPE_CTA: Partial<Record<RoadmapTaskType, { label: string; to: Destination }>> = {
  vocab: { label: "Open vocab →", to: "today" },
  study_source: { label: "Open source →", to: "sources" },
  milestone_test: { label: "Take test →", to: "test" },
};

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
    <div className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
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
        <span className="shrink-0 rounded-full bg-paper px-2.5 py-0.5 text-[10.5px] font-semibold text-ink-600">
          {SKILL_LABEL[task.skill]}
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

function LogTimeDialog({ tasks, onClose }: { tasks: RoadmapTask[]; onClose: () => void }) {
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

  if (tasks.length === 0) {
    return (
      <Modal title="Log study time" onClose={onClose} size="sm">
        <p className="text-sm text-ink-600">No tasks scheduled today to log time against.</p>
      </Modal>
    );
  }

  return (
    <Modal title="Log study time" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-ink-600">Task</label>
          <select
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-sm"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
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

function weekDaysFromRoadmapWeek(days: { date: string; dayOffset: number; theme: string | null; tasks: RoadmapTask[]; status: string }[]): RoadmapCalendarDay[] {
  return days.map((d) => ({
    date: d.date,
    dayOffset: d.dayOffset,
    theme: d.theme,
    totalTasks: d.tasks.length,
    completedTasks: d.tasks.filter((t) => t.completedAt !== null).length,
    status: d.status as RoadmapCalendarDay["status"],
  }));
}

export function TodayPage({ onNavigate }: { onNavigate: (d: Destination) => void }) {
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const activated = status?.activated ?? false;

  const { data: today, isLoading } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday, enabled: activated });
  const { data: week } = useQuery({ queryKey: ["roadmap", "week"], queryFn: () => api.roadmapWeek(), enabled: activated });
  const { data: weekReview } = useQuery({ queryKey: ["roadmap", "review", "week"], queryFn: () => api.roadmapWeeklyReview(), enabled: activated });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: quizResults } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });

  const [showLogTime, setShowLogTime] = useState(false);
  const [openTask, setOpenTask] = useState<RoadmapTask | null>(null);

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

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-0.02em]">Today — {dateLabel}</h1>
          <p className="text-[13px] text-ink-600">
            {activated ? `${tasksDone} of ${tasksTotal} done · ` : ""}
            {dueCount} cards due
            {activated && overdueTasks > 0 && ` · ${overdueTasks} tasks carried over`}
          </p>
        </div>
        {activated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLogTime(true)}>
              Log study time
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const first = today?.tasks.find((t) => t.completedAt === null);
                if (first) setOpenTask(first);
              }}
            >
              Start today's plan
            </Button>
          </div>
        )}
      </div>

      {activated && (
        <div className="flex rounded-2xl border border-hairline bg-card">
          {[
            { value: `${todayPercent}%`, label: "Today's tasks", color: "" },
            { value: String(dueCount), label: "Vocab due", color: "text-brand-500" },
            { value: String(overdueTasks), label: "Overdue tasks", color: "text-warn-500" },
            { value: String(weekReview?.loggedMinutes ?? 0), label: "Min. this week", color: "" },
            {
              value: quizResults?.results[0] ? `${quizResults.results[0].score}/${quizResults.results[0].total}` : "—",
              label: "Last self-test",
              color: "text-ok-600",
            },
          ].map((cell, i) => (
            <div key={cell.label} className={`flex-1 px-4 py-3.5 ${i < 4 ? "border-r border-[var(--color-hairline)]" : ""}`}>
              <p className={`text-[21px] font-bold ${cell.color}`}>{cell.value}</p>
              <p className="mt-1 text-[11px] text-ink-400">{cell.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="space-y-3">
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
              <div className="rounded-[18px] border border-hairline bg-card p-4">
                {today && today.tasks.length === 0 ? (
                  <p className="py-2 text-sm text-ink-400">No tasks scheduled for today.</p>
                ) : (
                  <CappedTaskList tasks={today?.tasks ?? []} onNavigate={onNavigate} onOpen={setOpenTask} />
                )}
              </div>

              {today && today.backlog.length > 0 && (
                <div className="rounded-[18px] border border-warn-tint-100 bg-warn-tint-50">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <p className="text-[13.5px] font-bold text-warn-700">
                      Carried over · {overdueTasks} task{overdueTasks === 1 ? "" : "s"}, {today.backlog.length} day{today.backlog.length === 1 ? "" : "s"}
                    </p>
                    <button onClick={() => onNavigate("roadmap")} className="text-xs font-semibold text-warn-700 hover:underline">
                      Reschedule all
                    </button>
                  </div>
                  <div className="px-4 pb-2">
                    <CappedTaskList
                      tasks={today.backlog.flatMap((g) => g.tasks)}
                      lateByTaskId={new Map(today.backlog.flatMap((g) => g.tasks.map((t) => [t.id, g.daysOverdue] as const)))}
                      onNavigate={onNavigate}
                      onOpen={setOpenTask}
                    />
                  </div>
                </div>
              )}

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
                  {nextUp && (
                    <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                      <div>
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Next up</p>
                        <p className="text-sm font-medium">{nextUp.title}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onNavigate("syllabus")}>
                        Open syllabus
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          {activated && week && (
            <div className="rounded-[18px] border border-hairline bg-card p-4">
              <RoadmapWeekStrip
                weekStart={week.weekStart.slice(0, 10)}
                days={weekDaysFromRoadmapWeek(week.days)}
                selectedDate={null}
                onSelectDay={() => onNavigate("roadmap")}
                onShiftWeek={() => onNavigate("roadmap")}
              />
              <p className="mt-2 text-center text-xs text-ink-400">
                {week.thisWeek.done} of {week.thisWeek.total} tasks done this week
              </p>
            </div>
          )}

          <div className="rounded-[18px] border border-hairline bg-card p-4">
            <h3 className="font-semibold">Test yourself</h3>
            <p className="mt-1 text-sm text-ink-600">A quick mixed test at your current level.</p>
            <Button className="mt-3 w-full" onClick={() => onNavigate("test")}>
              Start a test
            </Button>
            {quizResults && quizResults.results.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-hairline pt-2 text-xs text-ink-600">
                {quizResults.results.slice(0, 2).map((r) => (
                  <div key={r.id} className="flex justify-between">
                    <span>{new Date(r.takenAt).toLocaleDateString()}</span>
                    <span className="font-medium text-ink-900">
                      {r.score}/{r.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {quizResults && quizResults.weakestTopics.length > 0 && (
            <div className="rounded-[18px] border border-hairline bg-card p-4">
              <h3 className="font-semibold">Weak areas</h3>
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

      {showLogTime && today && <LogTimeDialog tasks={today.tasks} onClose={() => setShowLogTime(false)} />}
      {openTask && <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
  );
}

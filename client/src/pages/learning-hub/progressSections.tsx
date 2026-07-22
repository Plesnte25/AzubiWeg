import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type {
  RoadmapOverview,
  RoadmapSkill,
  RoadmapTask,
  RoadmapTaskType,
} from "../../api/types";
import { Attachments } from "../../components/Attachments";
import AudioRecorder from "../../components/AudioRecorder";
import FillBar from "../../components/FillBar";
import RoadmapCalendar from "../../components/RoadmapCalendar";
import { LEVEL_LABELS } from "./contentSections";

const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
const fmtShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

const TYPE_CTA: Partial<Record<RoadmapTaskType, { label: string; to: string }>> = {
  vocab: { label: "Go to Review →", to: "/review" },
  study_source: { label: "Go to Sources →", to: "/learning?group=content&tab=sources" },
  milestone_test: { label: "Take a self-test →", to: "/learning?group=review&tab=tests" },
};

const SKILLS: { key: RoadmapSkill; label: string }[] = [
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "bureaucracy", label: "Deutschland Context" },
  { key: "grammar", label: "Grammar" },
  { key: "vocab", label: "Vocab" },
];

/**
 * A single task row. The checkbox toggles completion inline; clicking the
 * title expands a detail panel (journal entry, minutes spent, attachments,
 * and — for speaking tasks — a recorder) shared across Today/Backlog/
 * Calendar-day-detail/Journal views.
 */
function TaskRow({ task, onToggle }: { task: RoadmapTask; onToggle: (completed: boolean) => void }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [journalDraft, setJournalDraft] = useState(task.journalEntry ?? "");
  const [minutesDraft, setMinutesDraft] = useState(task.minutesSpent?.toString() ?? "");
  const done = task.completedAt !== null;
  const cta = TYPE_CTA[task.type];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["learning"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.updateRoadmapTask>[1]) => api.updateRoadmapTask(task.id, data),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-paper">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-1 accent-brand-500"
            checked={done}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="min-w-0" onClick={() => setExpanded((v) => !v)}>
            <span className={`cursor-pointer font-medium ${done ? "text-ink-400 line-through" : ""}`}>
              {task.title}
            </span>
            {task.description && <span className="block text-sm text-ink-600">{task.description}</span>}
            {task.syllabusItem && (
              <span className="ml-2 inline-block rounded-full bg-paper px-2 py-0.5 text-xs text-ink-400">
                From syllabus: {LEVEL_LABELS[task.syllabusItem.level]}
                {task.syllabusItem.theme ? ` › ${task.syllabusItem.theme}` : ""}
              </span>
            )}
          </span>
        </label>
        {cta && !done && (
          <Link to={cta.to} className="shrink-0 text-sm text-brand-600 hover:underline">
            {cta.label}
          </Link>
        )}
        <button
          className="shrink-0 text-xs text-ink-400 hover:text-ink-900"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide details" : "Details"}
        </button>
      </div>

      {expanded && (
        <div className="ml-7 mt-2 space-y-2 border-l border-hairline pl-3">
          <textarea
            className="w-full rounded-lg border border-hairline bg-paper px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Notes, reflections, self-rating…"
            value={journalDraft}
            onChange={(e) => setJournalDraft(e.target.value)}
            onBlur={() => {
              if (journalDraft !== (task.journalEntry ?? "")) {
                update.mutate({ journalEntry: journalDraft || null });
              }
            }}
          />
          <div className="flex items-center gap-2 text-sm">
            <label className="text-ink-600">Minutes spent:</label>
            <input
              type="number"
              min={0}
              max={1440}
              className="w-20 rounded-lg border border-hairline bg-paper px-2 py-1 text-sm"
              value={minutesDraft}
              onChange={(e) => setMinutesDraft(e.target.value)}
              onBlur={() => {
                const n = minutesDraft === "" ? null : Number(minutesDraft);
                if (n !== task.minutesSpent) update.mutate({ minutesSpent: n });
              }}
            />
          </div>
          {task.skill === "speaking" && (
            <AudioRecorder roadmapTaskId={task.id} onUploaded={invalidate} />
          )}
          <Attachments files={task.files} parent={{ roadmapTaskId: task.id }} onChanged={invalidate} />
        </div>
      )}
    </div>
  );
}

export function ActivationCard() {
  const queryClient = useQueryClient();
  const [customDate, setCustomDate] = useState("");
  const activate = useMutation({
    mutationFn: () => api.activateRoadmap(customDate || undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  return (
    <div className="rounded-xl border border-hairline bg-card p-6 text-center">
      <h2 className="text-lg font-semibold">Start your 26-week roadmap</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
        Day 1 starts today by default — 182 days, A0 to B1, with a calendar you can follow day by day.
      </p>
      <div className="mx-auto mt-4 max-w-xs">
        <input
          type="date"
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">Optional — leave blank to start today</p>
      </div>
      <button
        className="mt-4 rounded-full bg-ink-900 px-5 py-2 text-sm font-medium text-white hover:bg-ink-900/90 disabled:opacity-60"
        onClick={() => activate.mutate()}
        disabled={activate.isPending}
      >
        {activate.isPending ? "Starting…" : "Start roadmap"}
      </button>
      {activate.isError && <p className="mt-2 text-sm text-danger-600">{(activate.error as Error).message}</p>}
    </div>
  );
}

function OverviewHeader({ overview, theme }: { overview: RoadmapOverview; theme: string | null }) {
  return (
    <div className="rounded-xl border border-hairline bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-600">
          Day {overview.currentDayOffset + 1} of {overview.totalDays}
          {theme && <span className="text-ink-400"> — {theme}</span>}
        </p>
        <p className="text-xs text-ink-400">
          {overview.tasksDone}/{overview.tasksTotal} tasks done ({overview.percent}%)
        </p>
      </div>
      <div className="mt-2">
        <FillBar percent={overview.percent} />
      </div>
    </div>
  );
}

export function TodaySection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["learning"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <OverviewHeader overview={data.overview} theme={data.theme} />

      <div className="rounded-xl border border-hairline bg-card p-4">
        <h3 className="font-semibold">Today — {fmtDay(data.date)}</h3>
        <div className="mt-2 divide-y divide-hairline">
          {data.tasks.length === 0 ? (
            <p className="py-3 text-sm text-ink-400">No tasks scheduled for today.</p>
          ) : (
            data.tasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={(completed) => toggle.mutate({ id: t.id, completed })} />
            ))
          )}
        </div>
      </div>

      {data.backlog.length > 0 && (
        <div className="rounded-xl border border-danger-600/30 bg-danger-50 p-4">
          <h3 className="font-semibold text-danger-600">Carried from earlier days</h3>
          <div className="mt-3 space-y-4">
            {data.backlog.map((group) => (
              <div key={group.dayId}>
                <p className="text-sm font-medium text-ink-600">
                  {fmtShort(group.date)} — {group.daysOverdue} day{group.daysOverdue === 1 ? "" : "s"} overdue
                  {group.theme && ` · ${group.theme}`}
                </p>
                <div className="mt-1 divide-y divide-hairline">
                  {group.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={(completed) => toggle.mutate({ id: t.id, completed })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BacklogSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["roadmap", "backlog"], queryFn: api.roadmapBacklog });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["learning"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!data || data.groups.length === 0) {
    return (
      <p className="rounded-xl border border-hairline bg-card p-6 text-center text-ink-400">
        No backlog — you're all caught up.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        {data.totalOverdueTasks} overdue task{data.totalOverdueTasks === 1 ? "" : "s"} across {data.groups.length} day
        {data.groups.length === 1 ? "" : "s"}.
      </p>
      {data.groups.map((group) => (
        <div key={group.dayId} className="rounded-xl border border-hairline bg-card p-4">
          <p className="text-sm font-medium">
            {fmtDay(group.date)} — {group.daysOverdue} day{group.daysOverdue === 1 ? "" : "s"} overdue
            {group.theme && ` · ${group.theme}`}
          </p>
          <div className="mt-2 divide-y divide-hairline">
            {group.tasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={(completed) => toggle.mutate({ id: t.id, completed })} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarSection() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap", "calendar", month],
    queryFn: () => api.roadmapCalendar(month),
  });
  const dayQuery = useQuery({
    queryKey: ["roadmap", "day", selectedDate],
    queryFn: () => api.roadmapDay(selectedDate as string),
    enabled: selectedDate !== null,
    retry: false,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["learning"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: invalidate,
  });

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-hairline bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button className="rounded-full px-2 py-1 text-sm hover:bg-paper" onClick={() => shiftMonth(-1)}>
            ← Prev
          </button>
          <p className="font-semibold">
            {new Date(month + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button className="rounded-full px-2 py-1 text-sm hover:bg-paper" onClick={() => shiftMonth(1)}>
            Next →
          </button>
        </div>
        {isLoading ? (
          <p className="text-ink-400">Loading…</p>
        ) : (
          <RoadmapCalendar month={month} days={data?.days ?? []} onSelectDay={setSelectedDate} />
        )}
      </div>
      <div className="rounded-xl border border-hairline bg-card p-4">
        {!selectedDate ? (
          <p className="text-sm text-ink-400">Click a day to see its tasks.</p>
        ) : dayQuery.isLoading ? (
          <p className="text-ink-400">Loading…</p>
        ) : dayQuery.isError ? (
          <p className="text-sm text-ink-400">No roadmap day here.</p>
        ) : dayQuery.data ? (
          <>
            <h3 className="font-semibold">{fmtDay(selectedDate)}</h3>
            {dayQuery.data.day.theme && <p className="text-sm text-ink-600">{dayQuery.data.day.theme}</p>}
            <div className="mt-2 divide-y divide-hairline">
              {dayQuery.data.day.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={(completed) => toggle.mutate({ id: t.id, completed })} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Filtered view over RoadmapTask by skill — this *is* the Writing/Speaking/
 * Listening/Reading/Deutschland-Context "journal" experience, no separate
 * pages per skill. */
export function JournalSection() {
  const queryClient = useQueryClient();
  const [skill, setSkill] = useState<RoadmapSkill>("writing");
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap", "journal", skill],
    queryFn: () => api.roadmapJournal(skill),
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["learning"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleRoadmapTask(id, completed),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {SKILLS.map((s) => (
          <button
            key={s.key}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              skill === s.key
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-hairline text-ink-600 hover:bg-paper"
            }`}
            onClick={() => setSkill(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-hairline bg-card p-4">
        {isLoading ? (
          <p className="text-ink-400">Loading…</p>
        ) : !data || data.tasks.length === 0 ? (
          <p className="text-sm text-ink-400">No {SKILLS.find((s) => s.key === skill)?.label.toLowerCase()} tasks yet.</p>
        ) : (
          <div className="divide-y divide-hairline">
            {data.tasks.map((t) => (
              <div key={t.id}>
                <p className="pt-2 text-xs text-ink-400">
                  {fmtShort(t.day.date)}
                  {t.day.theme && ` · ${t.day.theme}`}
                </p>
                <TaskRow task={t} onToggle={(completed) => toggle.mutate({ id: t.id, completed })} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, Check, Pause, Play } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { RoadmapTask, RoadmapTaskType } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import AudioRecorder from "../../components/AudioRecorder";
import { NoteComposer } from "../../components/notes/NoteComposer";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { formatMmSs, liveTimerSeconds } from "../../lib/taskTimer";
import { SKILL_LABELS } from "../../lib/skills";
import type { Destination } from "./destinations";
import { invalidateHub } from "./queryHelpers";

const TYPE_CTA: Partial<Record<RoadmapTaskType, { label: string; to: Destination }>> = {
  vocab: { label: "Open vocab →", to: "today" },
  study_source: { label: "Open source →", to: "sources" },
  milestone_test: { label: "Take test →", to: "test" },
};

// Same estimate heuristic Plan.tsx's own estimateMinutes() uses — no real
// per-task estimate field exists, and the design mock's "10 min estimate"
// is exactly this kind of type-based number, not a stored value.
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

const QUICK_ADD_SECONDS = [5 * 60, 10 * 60, 15 * 60];

/** The running stopwatch — start/pause, a fill bar against the type-based
 * estimate, quick-add pills, and an "Enter manually" correction. Always
 * re-derives its displayed total from the task's own server-stored
 * (timerSeconds, timerRunningSince) pair on every refetch/tick rather than
 * accumulating locally, so a timer left running keeps counting correctly
 * across a close/reopen, a tab reload, or a different device — the design
 * spec's explicit persistence requirement. */
function TaskTimer({ task, onUpdate, pending }: { task: RoadmapTask; onUpdate: (data: Parameters<typeof api.updateRoadmapTask>[1]) => void; pending: boolean }) {
  // Forces a re-render once a second while running so the displayed elapsed
  // time (recomputed fresh from the task's own server state below, not from
  // this counter) keeps ticking — the counter's value itself is unused.
  const [, forceTick] = useState(0);
  const running = task.timerRunningSince !== null;
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState("");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = liveTimerSeconds(task);
  const estimateSeconds = estimateMinutes(task) * 60;
  const fillPct = Math.min(100, (elapsed / estimateSeconds) * 100);

  return (
    <div className="rounded-[14px] p-4" style={{ background: "#20222f" }}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Time logged
        </div>
        <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
          {Math.round(elapsed / 60)} / {estimateMinutes(task)} min estimate
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <div className="font-mono text-[40px] font-medium tabular-nums" style={{ letterSpacing: "-.02em" }}>
          {formatMmSs(elapsed)}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => onUpdate({ timerAction: running ? "pause" : "start" })}
          className="ml-auto flex min-h-[38px] items-center gap-1.5 rounded-[9px] px-4 text-[13px] font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          {running ? <Pause size={14} weight="fill" aria-hidden="true" /> : <Play size={14} weight="fill" aria-hidden="true" />}
          {running ? "Running" : "Start"}
        </button>
        <button
          type="button"
          title="Reset logged time"
          disabled={pending}
          onClick={() => {
            if (confirm("Reset this task's logged time to 0?")) onUpdate({ timerAction: "reset" });
          }}
          className="hidden shrink-0 rounded-[9px] p-2 lg:grid lg:place-items-center"
          style={{ color: "rgba(233,233,237,.5)" }}
        >
          <ArrowCounterClockwise size={16} weight="regular" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "rgba(233,233,237,.08)" }}>
        <div className="h-full rounded-[3px]" style={{ width: `${fillPct}%`, background: "linear-gradient(to right,#423a6a,#9184d9)" }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {QUICK_ADD_SECONDS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => onUpdate({ setSeconds: elapsed + s })}
            className="rounded-full px-2.5 py-1 text-[11.5px]"
            style={{ border: "1px solid rgba(233,233,237,.16)", color: "rgba(233,233,237,.7)" }}
          >
            +{s / 60} min
          </button>
        ))}
        {manualOpen ? (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              type="number"
              min={0}
              value={manualDraft}
              onChange={(e) => setManualDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const n = Number(manualDraft);
                if (!Number.isNaN(n) && n >= 0) onUpdate({ setSeconds: Math.round(n * 60) });
                setManualOpen(false);
              }}
              placeholder="min"
              className="w-16 rounded-[7px] px-2 py-1 text-[12.5px] outline-none"
              style={{ background: "#161826", border: "1px solid rgba(233,233,237,.16)", color: "#e9e9ed" }}
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setManualDraft(String(Math.round(elapsed / 60)));
              setManualOpen(true);
            }}
            className="text-[11.5px] font-medium"
            style={{ color: "#b5abfc" }}
          >
            Enter manually
          </button>
        )}
      </div>
    </div>
  );
}

/** This task's own Notes — proper `Note` rows linked via roadmapTaskId
 * (inheriting the task's skill), not the old single journalEntry field.
 * Browsable later in the Notes tab under "My notes", filterable by skill. */
function TaskNotesSection({ task, onChanged }: { task: RoadmapTask; onChanged: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["notes", "task", task.id], queryFn: () => api.taskNotes(task.id) });
  const notes = data?.notes ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Notes on this task{notes.length > 0 ? ` (${notes.length})` : ""}
        </div>
      </div>
      {!isLoading && notes.length > 0 && (
        <div className="mt-2 space-y-2">
          {notes.map((note) => (
            <NoteEditor key={note.id} note={note} onChanged={onChanged} />
          ))}
        </div>
      )}
      <div className="mt-2.5">
        <NoteComposer roadmapTaskId={task.id} skill={task.skill} onCreated={onChanged} />
      </div>
    </div>
  );
}

/**
 * Task detail on the standard `BottomSheet` primitive — a centered 560px
 * dialog at md+ (widened via BottomSheet's className override), a slide-up
 * sheet below md. Reskinned per the Claude Design handoff's turn 9a: a
 * running stopwatch (TaskTimer above) replacing the old static
 * DurationPicker dial, plus a persistent notes composer, instead of the
 * pre-Nocturne shell this previously was.
 */
export function TaskDetailDrawer({
  task,
  onClose,
  onNavigate,
}: {
  task: RoadmapTask;
  onClose: () => void;
  onNavigate: (d: Destination) => void;
}) {
  const queryClient = useQueryClient();
  // Local open state (rather than requiring every caller to keep this
  // permanently mounted, the usual BottomSheet pattern) so the close
  // animation still plays even though callers conditionally render this
  // component itself (`{openTask && <TaskDetailDrawer .../>}`).
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    setTimeout(onClose, 400);
  }

  const invalidate = () => invalidateHub(queryClient);
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.updateRoadmapTask>[1]) => api.updateRoadmapTask(task.id, data),
    onSuccess: invalidate,
  });
  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.toggleRoadmapTask(task.id, completed),
    onSuccess: invalidate,
  });

  const done = task.completedAt !== null;
  const typeCta = TYPE_CTA[task.type];

  return (
    <BottomSheet open={open} onClose={close} className="lg:max-w-[560px]">
      <div className="mb-4 pr-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => toggle.mutate(!done)}
            aria-label={done ? "Mark not done" : "Mark done"}
            className="grid size-6 shrink-0 place-items-center rounded-full"
            style={{ background: done ? "#9184d9" : "transparent", border: done ? "none" : "1px solid rgba(233,233,237,.25)" }}
          >
            {done && <Check size={13} weight="bold" style={{ color: "#161826" }} aria-hidden="true" />}
          </button>
          <h2 className={`text-[18px] font-medium ${done ? "line-through" : ""}`} style={{ color: done ? "rgba(233,233,237,.5)" : "#e9e9ed" }}>
            {task.title}
          </h2>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.skill && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: "rgba(145,132,217,.16)", color: "#d2cefd" }}>
              {SKILL_LABELS[task.skill]}
            </span>
          )}
          {task.syllabusItem && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: "rgba(233,233,237,.08)", color: "rgba(233,233,237,.6)" }}>
              {task.syllabusItem.level.toUpperCase()}
              {task.syllabusItem.theme ? ` · ${task.syllabusItem.theme}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {task.description && <p className="text-[13.5px]" style={{ color: "rgba(233,233,237,.62)" }}>{task.description}</p>}

        <div className="flex flex-wrap items-center gap-4">
          {typeCta && !done && (
            <button type="button" onClick={() => onNavigate(typeCta.to)} className="text-[13px] font-semibold" style={{ color: "#b5abfc" }}>
              {typeCta.label}
            </button>
          )}
          {task.syllabusItem && (
            <button
              type="button"
              onClick={() => onNavigate("syllabus")}
              className="text-[13px] font-semibold"
              style={{ color: "#b5abfc" }}
            >
              View in syllabus →
            </button>
          )}
        </div>

        <TaskTimer task={task} onUpdate={(data) => update.mutate(data)} pending={update.isPending} />

        {task.files.length > 0 && <Attachments files={task.files} parent={{ roadmapTaskId: task.id }} onChanged={invalidate} renderTrigger={() => null} />}

        {task.skill === "speaking" && <AudioRecorder roadmapTaskId={task.id} onUploaded={invalidate} />}

        <TaskNotesSection task={task} onChanged={invalidate} />

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              toggle.mutate(true);
              close();
            }}
            className="min-h-[44px] flex-[1.5] rounded-[11px] text-[14px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} weight="bold" aria-hidden="true" />
              Mark complete
            </span>
          </button>
          <button type="button" onClick={close} className="min-h-[44px] flex-1 rounded-[11px] border text-[14px] font-medium" style={{ borderColor: "rgba(233,233,237,.16)" }}>
            Done
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

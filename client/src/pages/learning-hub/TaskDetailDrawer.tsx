import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { RoadmapTask, RoadmapTaskType } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import AudioRecorder from "../../components/AudioRecorder";
import { NoteComposer } from "../../components/notes/NoteComposer";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { DurationPicker } from "../../components/ui/DurationPicker";
import type { Destination } from "./destinations";
import { invalidateHub } from "./queryHelpers";

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

/** This task's own Notes — proper `Note` rows linked via roadmapTaskId
 * (inheriting the task's skill), not the old single journalEntry field.
 * Browsable later in the Notes tab under "My notes", filterable by skill. */
function TaskNotesSection({ task, onChanged }: { task: RoadmapTask; onChanged: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["notes", "task", task.id], queryFn: () => api.taskNotes(task.id) });
  const notes = data?.notes ?? [];

  return (
    <div>
      <p className="text-caption font-semibold text-ink-400">Notes{notes.length > 0 ? ` (${notes.length})` : ""}</p>
      {!isLoading && notes.length > 0 && (
        <div className="mt-1.5 space-y-2">
          {notes.map((note) => (
            <NoteEditor key={note.id} note={note} onChanged={onChanged} />
          ))}
        </div>
      )}
      <div className="mt-2">
        <NoteComposer roadmapTaskId={task.id} skill={task.skill} onCreated={onChanged} />
      </div>
    </div>
  );
}

/** The fields shared by both chrome variants below — description, syllabus
 * breadcrumb, CTA, minutes, audio recorder, attachments, notes, done button.
 * Only the header (checkbox/title/skill-badge/close button) and outer shell
 * differ between the slide-over (lg) and the centered card (below lg). */
function TaskDetailBody({
  task,
  minutesDraft,
  setMinutesDraft,
  update,
  cta,
  done,
  onNavigate,
  invalidate,
  onDone,
}: {
  task: RoadmapTask;
  minutesDraft: string;
  setMinutesDraft: (v: string) => void;
  update: ReturnType<typeof useMutation<unknown, Error, Parameters<typeof api.updateRoadmapTask>[1]>>;
  cta: { label: string; to: Destination } | undefined;
  done: boolean;
  onNavigate: (d: Destination) => void;
  invalidate: () => void;
  onDone: () => void;
}) {
  // DurationPicker's onChange fires on every drag tick (each 5-min snap),
  // not just on release — debounce the actual save so dragging across the
  // dial doesn't fire a PATCH per tick.
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitMinutes = (n: number) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      if (n !== task.minutesSpent) update.mutate({ minutesSpent: n === 0 ? null : n });
    }, 400);
  };

  return (
    <div className="space-y-4">
      {task.description && <p className="text-body text-ink-600">{task.description}</p>}
      {task.syllabusItem && (
        <div>
          <p className="text-caption text-ink-400">
            From syllabus: {task.syllabusItem.level.toUpperCase()}
            {task.syllabusItem.theme ? ` › ${task.syllabusItem.theme}` : ""}
          </p>
          {task.syllabusItem.description && <p className="mt-1 text-body text-ink-600">{task.syllabusItem.description}</p>}
        </div>
      )}

      {cta && !done && (
        <button onClick={() => onNavigate(cta.to)} className="text-body font-semibold text-brand-500 hover:underline">
          {cta.label}
        </button>
      )}

      {/* the dial is the primary, always-visible control here — no toggle
          hiding it behind a plain-text "12 min" state, per an explicit
          user ask for a more efficient minimal dial matching the rest of
          the app's UI (the dial itself, DurationPicker, was already real —
          it was just hidden behind an extra click most of the time). */}
      <div className="flex items-center gap-2.5 rounded-md bg-paper p-2.5">
        <Clock className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
        <DurationPicker
          value={minutesDraft === "" ? 0 : Number(minutesDraft)}
          onChange={(n) => {
            setMinutesDraft(String(n));
            commitMinutes(n);
          }}
          max={180}
        />
      </div>

      {task.files.length > 0 && <Attachments files={task.files} parent={{ roadmapTaskId: task.id }} onChanged={invalidate} renderTrigger={() => null} />}

      {task.skill === "speaking" && <AudioRecorder roadmapTaskId={task.id} onUploaded={invalidate} />}

      <TaskNotesSection task={task} onChanged={invalidate} />

      <Button variant="outline" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/**
 * Task detail on the standard `BottomSheet` primitive (slide-up sheet below
 * md, centered dialog at md+) — previously two bespoke shells (a right-
 * anchored slide-over at lg, a blurred-backdrop centered card below lg),
 * each with its own hand-rolled focus-trap. That predated BottomSheet and
 * used a colored/blurred scrim BottomSheet doesn't.
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
  const [minutesDraft, setMinutesDraft] = useState(task.minutesSpent?.toString() ?? "");
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
  // most task types get no CTA at all beyond a description/syllabus
  // breadcrumb; a syllabus-linked "generic" task (e.g. the daily reading/
  // listening/speaking/writing slots) still has somewhere concrete to learn
  // more, even without a dedicated task type of its own
  const cta = TYPE_CTA[task.type] ?? (task.type === "generic" && task.syllabusItem ? { label: "View in Syllabus →", to: "syllabus" as Destination } : undefined);

  return (
    <BottomSheet open={open} onClose={close}>
      <div className="mb-4 pr-8">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle.mutate(!done)}
            className={`grid size-5 shrink-0 place-items-center rounded-sm border text-micro text-white ${done ? "border-ink-900 bg-ink-900" : "border-hairline"}`}
          >
            {done && <Check size={12} weight="bold" aria-hidden="true" />}
          </button>
          <h2 className={`text-body-lg font-semibold ${done ? "text-ink-400 line-through" : ""}`}>{task.title}</h2>
        </div>
        {task.skill && (
          <span className="mt-1.5 inline-block rounded-full bg-paper px-2.5 py-0.5 text-caption font-semibold text-ink-600">
            {SKILL_LABEL[task.skill]}
          </span>
        )}
      </div>
      <TaskDetailBody
        task={task}
        minutesDraft={minutesDraft}
        setMinutesDraft={setMinutesDraft}
        update={update}
        cta={cta}
        done={done}
        onNavigate={onNavigate}
        invalidate={invalidate}
        onDone={close}
      />
    </BottomSheet>
  );
}

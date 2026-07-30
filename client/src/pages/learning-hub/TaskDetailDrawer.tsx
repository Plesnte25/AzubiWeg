import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../../api/client";
import type { RoadmapTask, RoadmapTaskType } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import AudioRecorder from "../../components/AudioRecorder";
import { Button } from "../../components/ui/Button";
import type { Destination } from "./LearningRail";
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

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Slide-over task detail — same focus-trap/Escape behavior as Modal.tsx, but
 * anchored to the right edge instead of centered, so it reads as "more info
 * about the thing you clicked" rather than a blocking dialog.
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
  const ref = useRef<HTMLDivElement>(null);
  const [journalDraft, setJournalDraft] = useState(task.journalEntry ?? "");
  const [minutesDraft, setMinutesDraft] = useState(task.minutesSpent?.toString() ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // mount closed, then flip on next frame so the transform transition runs
    const id = requestAnimationFrame(() => setVisible(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 200);
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
  const cta = TYPE_CTA[task.type];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-ink-900/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        tabIndex={-1}
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-hairline bg-card p-5 shadow-xl outline-none transition-transform duration-200 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle.mutate(!done)}
                className={`grid size-5 shrink-0 place-items-center rounded-[6px] border text-[11px] text-white ${done ? "border-ink-900 bg-ink-900" : "border-hairline"}`}
              >
                {done && "✓"}
              </button>
              <h2 className={`text-lg font-semibold ${done ? "text-ink-400 line-through" : ""}`}>{task.title}</h2>
            </div>
            {task.skill && (
              <span className="mt-1.5 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-600">
                {SKILL_LABEL[task.skill]}
              </span>
            )}
          </div>
          <button className="shrink-0 text-ink-400 hover:text-ink-900" onClick={close} title="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          {task.description && <p className="text-sm text-ink-600">{task.description}</p>}
          {task.syllabusItem && (
            <p className="text-xs text-ink-400">
              From syllabus: {task.syllabusItem.level.toUpperCase()}
              {task.syllabusItem.theme ? ` › ${task.syllabusItem.theme}` : ""}
            </p>
          )}

          {cta && !done && (
            <button onClick={() => onNavigate(cta.to)} className="text-sm font-semibold text-brand-500 hover:underline">
              {cta.label}
            </button>
          )}

          <div>
            <label className="text-xs font-medium text-ink-600">Notes</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
              rows={4}
              placeholder="Notes, reflections, self-rating…"
              value={journalDraft}
              onChange={(e) => setJournalDraft(e.target.value)}
              onBlur={() => {
                if (journalDraft !== (task.journalEntry ?? "")) update.mutate({ journalEntry: journalDraft || null });
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label className="text-ink-600">Minutes spent</label>
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

          {task.skill === "speaking" && <AudioRecorder roadmapTaskId={task.id} onUploaded={invalidate} />}

          <Attachments files={task.files} parent={{ roadmapTaskId: task.id }} onChanged={invalidate} />

          <Button variant="outline" className="w-full" onClick={close}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

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

/** The fields shared by both chrome variants below — description, syllabus
 * breadcrumb, CTA, notes, minutes, audio recorder, attachments, done button.
 * Only the header (checkbox/title/skill-badge/close button) and outer shell
 * differ between the slide-over (lg) and the centered card (below lg). */
function TaskDetailBody({
  task,
  journalDraft,
  setJournalDraft,
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
  journalDraft: string;
  setJournalDraft: (v: string) => void;
  minutesDraft: string;
  setMinutesDraft: (v: string) => void;
  update: ReturnType<typeof useMutation<unknown, Error, Parameters<typeof api.updateRoadmapTask>[1]>>;
  cta: { label: string; to: Destination } | undefined;
  done: boolean;
  onNavigate: (d: Destination) => void;
  invalidate: () => void;
  onDone: () => void;
}) {
  return (
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

      <Button variant="outline" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/**
 * Task detail — a right-anchored slide-over at lg (same focus-trap/Escape
 * behavior as Modal.tsx), and a centered "flashcard" card below lg matching
 * vocabulary/ReviewModal.tsx's shell (blurred backdrop, no separate
 * title-bar chrome). Both shells share the same state/mutations, defined
 * once here, and both render the same TaskDetailBody — only the header
 * chrome and outer wrapper differ.
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [journalDraft, setJournalDraft] = useState(task.journalEntry ?? "");
  const [minutesDraft, setMinutesDraft] = useState(task.minutesSpent?.toString() ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // mount closed, then flip on next frame so the drawer's slide-in transition runs
    const id = requestAnimationFrame(() => setVisible(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      const activeRef = window.innerWidth >= 1024 ? drawerRef : cardRef;
      if (e.key === "Tab" && activeRef.current) {
        const focusables = activeRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
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

  const body = (
    <TaskDetailBody
      task={task}
      journalDraft={journalDraft}
      setJournalDraft={setJournalDraft}
      minutesDraft={minutesDraft}
      setMinutesDraft={setMinutesDraft}
      update={update}
      cta={cta}
      done={done}
      onNavigate={onNavigate}
      invalidate={invalidate}
      onDone={close}
    />
  );

  return (
    <>
      {/* below lg: centered flashcard-style card over a blurred backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-[6px] lg:hidden"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={task.title}
          tabIndex={-1}
          className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-hairline bg-card p-5 shadow-xl outline-none"
        >
          <button className="absolute right-3 top-3 grid size-7 place-items-center rounded-full hover:bg-paper" onClick={close} title="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="mb-4 pr-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle.mutate(!done)}
                className={`grid size-5 shrink-0 place-items-center rounded-[6px] border text-[11px] text-white ${done ? "border-ink-900 bg-ink-900" : "border-hairline"}`}
              >
                {done && "✓"}
              </button>
              <h2 className={`text-base font-semibold ${done ? "text-ink-400 line-through" : ""}`}>{task.title}</h2>
            </div>
            {task.skill && (
              <span className="mt-1.5 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-600">
                {SKILL_LABEL[task.skill]}
              </span>
            )}
          </div>
          {body}
        </div>
      </div>

      {/* lg: right-anchored slide-over */}
      <div
        className={`fixed inset-0 z-50 hidden justify-end bg-ink-900/40 transition-opacity duration-200 lg:flex ${visible ? "opacity-100" : "opacity-0"}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          ref={drawerRef}
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
          {body}
        </div>
      </div>
    </>
  );
}

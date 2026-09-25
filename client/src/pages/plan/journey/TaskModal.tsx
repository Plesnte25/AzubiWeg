import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HourglassMedium, Play } from "@phosphor-icons/react";
import { ApiError, api } from "../../../api/client";
import type { RoadmapTask, SyllabusItem } from "../../../api/types";
import { Modal } from "../../../components/ui/Modal";
import { PillButton } from "../../../components/ui/PillButton";
import { toast } from "../../../components/ui/Toast";
import { useNavStack } from "../../../lib/navStack";
import { SKILL_COLORS } from "../../../lib/skills";
import { KIND_LABELS, clock, taskEstimateMinutes, taskKind } from "../../../lib/tasks";
import { stripHtml } from "../../../lib/text";
import { stationKey } from "./model";
import { TopicWorkspace } from "./TopicWorkspace";
import { useLiveSeconds, useTaskTimerActions } from "./useTaskTimer";

/*
 * Task modal (AzubiPlanJourney.dc.html modal k "task"): opens a ticket task or a station topic. A roadmap task gets
 * the stopwatch (the one app-wide timer, +5/+10/+15 min); a topic with no roadmap task has no timer to show. A linked
 * syllabus topic brings its workspace (exercise, audio, rubric). Notes on this task, "Pin to notes" (the keyboard/tap
 * alternative to dragging onto the Notes tile), and Mark done / Reopen.
 */

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TYPE_CTA: Partial<Record<RoadmapTask["type"], { label: string; to: string }>> = {
  vocab: { label: "Start the review", to: "/review" },
  milestone_test: { label: "Take the self-test", to: "/plan/self-tests/run" },
};

export function TaskModal({
  taskId,
  itemId,
  origin,
  items,
  stationNotesKey,
  onClose,
  onOpenLibrary,
}: {
  taskId?: string;
  itemId?: string;
  /** "Today's ticket" or "Station N" for the tag chip. */
  origin: string;
  items: SyllabusItem[];
  /** The station new notes and pins attach to (the task's own station if it has one). */
  stationNotesKey: string | null;
  onClose: () => void;
  onOpenLibrary: () => void;
}) {
  const queryClient = useQueryClient();
  const { push } = useNavStack();
  const item = itemId ? items.find((i) => i.id === itemId) ?? null : null;
  const resolvedTaskId = taskId ?? item?.roadmapTaskId ?? null;
  const { data: taskData } = useQuery({ queryKey: ["learning", "roadmap", "task", resolvedTaskId], queryFn: () => api.roadmapTask(resolvedTaskId!), enabled: !!resolvedTaskId });
  const task = taskData?.task ?? null;
  const topic = item ?? (task?.syllabusItemId ? items.find((i) => i.id === task.syllabusItemId) ?? null : null);

  const timer = useTaskTimerActions();
  const seconds = useLiveSeconds(task);
  const running = !!task?.timerRunningSince;
  const estimate = task ? taskEstimateMinutes(task.type) : 10;
  const kind = task ? taskKind(task) : topic?.skill ? { label: KIND_LABELS[topic.skill], color: SKILL_COLORS[topic.skill] } : { label: "Topic", color: "var(--lilac)" };
  const title = task?.title ?? topic?.title ?? "Task";
  const done = task ? !!task.completedAt : topic ? topic.masteryState === "passed" || topic.masteryState === "mastered" || !!topic.completedAt : false;
  const noteKey = topic?.theme ? stationKey(topic.level, topic.theme) : stationNotesKey;

  const notesQueryKey = ["notes", task ? "task" : "item", task?.id ?? topic?.id];
  const { data: notesData } = useQuery({
    queryKey: notesQueryKey,
    queryFn: () => (task ? api.taskNotes(task.id) : api.syllabusItemNotes(topic!.id)),
    enabled: !!task || !!topic,
  });
  const notes = notesData?.notes ?? [];
  const [draft, setDraft] = useState("");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
  };
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

  const saveNote = useMutation({
    mutationFn: (pin: boolean) =>
      api.createNote({
        title: pin ? `Pinned: ${title}` : null,
        body: pin ? `<p>${escapeHtml(`${title} (${kind.label}, ${estimate} min)`)}</p>` : draft.trim().split(/\n+/).map((l) => `<p>${escapeHtml(l)}</p>`).join(""),
        skill: task?.skill ?? topic?.skill ?? null,
        roadmapTaskId: task?.id ?? null,
        syllabusItemId: task ? null : (topic?.id ?? null),
        stationKey: noteKey,
        pinned: pin,
      }),
    onSuccess: (_, pin) => {
      if (!pin) setDraft("");
      toast.success(pin ? "Pinned to the station's notes" : "Note saved");
      refresh();
    },
    onError,
  });

  const toggleDone = useMutation({
    mutationFn: async (): Promise<unknown> => (task ? api.toggleRoadmapTask(task.id, !done) : api.toggleSyllabusItem(topic!.id, !done)),
    onSuccess: () => {
      toast.success(done ? "Task reopened" : task && seconds > 0 ? `Done · ${clock(seconds)} logged` : "Done");
      refresh();
      if (!done) onClose();
    },
    onError: (e) => (e instanceof ApiError && e.status === 409 ? toast.error("Pass the exercise below first") : onError(e)),
  });

  const cta = task ? TYPE_CTA[task.type] : undefined;
  const addMinutes = (m: number) => task && timer.mutate({ id: task.id, setSeconds: seconds + m * 60 });

  return (
    <Modal
      title={title}
      tag={`${origin} · ${kind.label}`}
      subtitle={`Estimate ${estimate} min${done ? " · done" : ""}${running ? " · timer running" : ""}`}
      bg={kind.color}
      width={600}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} disabled={saveNote.isPending || (!task && !topic)} onClick={() => saveNote.mutate(true)}>
            Pin to notes
          </PillButton>
          <PillButton className="flex-1" disabled={toggleDone.isPending || (!task && !topic)} onClick={() => toggleDone.mutate()}>
            {done ? "Reopen task" : "Mark done"}
          </PillButton>
        </>
      }
    >
      {task && (
        <div
          className="flex shrink-0 flex-col gap-2.5"
          style={{ padding: 14, border: "2.5px solid var(--line)", borderRadius: 18, background: "var(--sky)", color: "var(--onTile)", boxShadow: "3px 3px 0 var(--shadow)" }}
        >
          <div className="flex items-center gap-2.5">
            <span role="timer" className="flex-1" style={{ fontFamily: "var(--font-mono)", fontSize: "calc(var(--k) * 44px)", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {clock(seconds)}
            </span>
            <button
              type="button"
              onClick={() => timer.mutate({ id: task.id, action: running ? "pause" : "start" })}
              disabled={timer.isPending}
              className="flex cursor-pointer items-center gap-1.5"
              style={{ height: 40, padding: "0 14px", border: "2.5px solid var(--line)", borderRadius: 999, background: running ? "var(--tomato)" : "var(--btn)", color: running ? "var(--onTile)" : "var(--btnText)", fontWeight: 700, fontSize: 14, boxShadow: "2px 2px 0 var(--shadow)" }}
            >
              {running ? <HourglassMedium size={15} weight="fill" aria-hidden="true" /> : <Play size={15} weight="fill" aria-hidden="true" />}
              {running ? "Pause" : seconds > 0 ? "Resume" : "Start"}
            </button>
          </div>
          <div className="overflow-hidden" style={{ height: 14, borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain)", boxSizing: "border-box" }}>
            <div
              style={{
                width: `${Math.min(100, (seconds / (estimate * 60)) * 100)}%`,
                height: "100%",
                background: seconds > estimate * 60 ? "var(--tomato)" : "var(--mint)",
                borderRight: seconds > 0 && seconds < estimate * 60 ? "2px solid var(--line)" : "none",
                transition: "width .3s",
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {clock(seconds)} of {estimate} min{seconds > estimate * 60 ? " · over estimate" : ""}
            </span>
            <div className="flex gap-1.5">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addMinutes(m)}
                  className="cursor-pointer"
                  style={{ height: 32, padding: "0 12px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 13 }}
                >
                  +{m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {task?.description && <span style={{ fontSize: 14, fontWeight: 600 }}>{task.description}</span>}
      {cta && (
        <PillButton height={42} className="self-start" onClick={() => push(cta.to)}>
          {cta.label}
        </PillButton>
      )}
      {task?.type === "study_source" && (
        <PillButton height={42} variant="secondary" className="self-start" onClick={onOpenLibrary}>
          Open the Library
        </PillButton>
      )}

      {topic && <TopicWorkspace itemId={topic.id} onCompleted={refresh} />}

      {(task || topic) && (
        <div className="flex shrink-0 flex-col gap-2">
          <span className="uppercase" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>
            Notes on this task · {notes.length}
          </span>
          {notes.map((n) => (
            <div key={n.id} style={{ padding: "9px 11px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
              {n.title && <b>{n.title} · </b>}
              {stripHtml(n.body ?? "")}
            </div>
          ))}
          <div className="flex items-stretch gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What tripped you up?"
              aria-label="Note on this task"
              style={{ flex: 1, height: 52, resize: "none", padding: 10, border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 14, boxSizing: "border-box" }}
            />
            <button
              type="button"
              disabled={!draft.trim() || saveNote.isPending}
              onClick={() => saveNote.mutate(false)}
              className="cursor-pointer disabled:cursor-default disabled:opacity-50"
              style={{ width: 84, border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14 }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

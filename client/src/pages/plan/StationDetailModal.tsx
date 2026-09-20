import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, BookOpen, Paperclip, Plus, SkipForward, Trash, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { SyllabusItem, SyllabusMistakeCategory } from "../../api/types";
import AudioRecorder from "../../components/AudioRecorder";
import { Attachments } from "../../components/Attachments";
import { NoteComposer } from "../../components/notes/NoteComposer";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { CircleIconButton } from "../../components/ui/CircleIconButton";
import { Textarea } from "../../components/ui/Textarea";
import type { Station } from "./stations";

/** Merges the 3 legacy fields into one editable value (nothing already
 * written is lost) but every future save writes the whole thing back to
 * `examples` only — `exceptions`/`commonMistakes` are cleared on first edit.
 * See server/src/prisma/schema.prisma's SyllabusItem for why the columns
 * themselves aren't dropped (older rows may still carry real content). */
function mergedNotebookValue(item: SyllabusItem): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

/** One borderless composer for an item's free-text notes plus file
 * attachments — replaces the old separately-bordered Notebook box and
 * Attachments' own bordered "+ notes" button with a single soft-filled
 * (no hard border/ring), claude.ai-composer-style unit: a plain textarea,
 * with a circular "+" trigger sitting directly in the same box to attach a
 * file, and already-attached files shown alongside it. */
function NotesComposer({ item, onChanged }: { item: SyllabusItem; onChanged: () => void }) {
  const [draft, setDraft] = useState(mergedNotebookValue(item));
  const update = useMutation({
    mutationFn: (value: string) => api.updateSyllabusNotebook(item.id, { examples: value || null, exceptions: null, commonMistakes: null }),
    onSuccess: onChanged,
  });

  return (
    <div className="mt-2">
      <Textarea
        variant="ghost"
        className="text-caption"
        rows={2}
        placeholder="Type a note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== mergedNotebookValue(item)) update.mutate(draft);
        }}
        footer={
          <Attachments
            files={item.files}
            parent={{ syllabusItemId: item.id }}
            onChanged={onChanged}
            renderTrigger={({ onClick, uploading }) => (
              <CircleIconButton
                icon={<Plus size={14} weight="regular" aria-hidden="true" />}
                title={uploading ? "Uploading…" : "Attach a file"}
                onClick={onClick}
                disabled={uploading}
              />
            )}
          />
        }
      />
    </div>
  );
}

/** A non-current or non-grammar item's "+ notes" affordance — previously a
 * bare Attachments default button labeled "+ notes" that actually only
 * opened the OS file picker (no note editor at all). Now opens a real
 * NoteComposer (a proper Note row linked via syllabusItemId, browsable
 * later in the Notes tab, same pattern as TaskDetailDrawer's
 * TaskNotesSection for roadmap tasks) and lists any notes already linked to
 * this item; file attachment stays available as its own, separately
 * labeled paperclip trigger rather than being folded into "+ notes". */
function ItemNotesSection({ item, onChanged }: { item: SyllabusItem; onChanged: () => void }) {
  const [composing, setComposing] = useState(false);
  const { data } = useQuery({ queryKey: ["notes", "syllabusItem", item.id], queryFn: () => api.syllabusItemNotes(item.id) });
  const notes = data?.notes ?? [];

  return (
    <div className="mt-1.5 pl-[26px]">
      {notes.length > 0 && (
        <div className="mb-1.5 space-y-2">
          {notes.map((note) => (
            <NoteEditor key={note.id} note={note} onChanged={onChanged} />
          ))}
        </div>
      )}
      {composing ? (
        <NoteComposer
          syllabusItemId={item.id}
          onCreated={() => {
            setComposing(false);
            onChanged();
          }}
        />
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setComposing(true)} className="text-caption text-ink-600 hover:text-ink-900">
            + notes
          </button>
          <Attachments
            files={item.files}
            parent={{ syllabusItemId: item.id }}
            onChanged={onChanged}
            renderTrigger={({ onClick, uploading }) => (
              <CircleIconButton
                icon={<Paperclip size={13} weight="regular" aria-hidden="true" />}
                title={uploading ? "Uploading…" : "Attach a file"}
                onClick={onClick}
                disabled={uploading}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

export function StationDetailModal({
  station,
  resolvedIdx,
  isPreview,
  skipped,
  currentItemId,
  onToggleItem,
  onDeleteItem,
  onSkip,
  onAddItem,
  onChanged,
  onClose,
}: {
  station: Station;
  resolvedIdx: number;
  isPreview: boolean;
  skipped: boolean;
  currentItemId: string | undefined;
  onToggleItem: (id: string, completed: boolean) => void;
  onDeleteItem: (id: string) => void;
  onSkip: () => void;
  onAddItem: () => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const closedCount = station.items.filter((i) => i.completedAt !== null).length;
  const panelRef = useRef<HTMLDivElement>(null);
  const [workspaceItemId, setWorkspaceItemId] = useState<string | null>(null);

  // Anchored below the page's own heading (a plain child of the header's
  // relative wrapper — see SyllabusPage.tsx), not a portaled/centered
  // dialog, so it isn't built on the shared Modal component. Still needs
  // its own Escape + body-scroll-lock, matching TodayPage's LogTimeCard /
  // RoadmapPage's AddTaskCard precedent for a non-Modal overlay this
  // session.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // deferred one tick so the same click that opened the panel (a station
    // node click) doesn't immediately bubble into this listener and close it
    const id = requestAnimationFrame(() => document.addEventListener("pointerdown", onPointerDown));
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(id);
    };
  }, [onClose]);

  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`Station ${resolvedIdx + 1} · ${station.theme}`} className="animate-slide-up rounded-xl bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body font-bold">
            Station {resolvedIdx + 1} · {station.theme}
          </p>
          <p className="text-caption text-ink-600">
            {station.items.length} items · {closedCount}/{station.items.length} closed
            {isPreview && <span className="ml-2 rounded-full bg-ink-50 px-2 py-0.5 text-micro font-semibold text-ink-600">preview</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isPreview && (
            <>
              <CircleIconButton icon={<Plus size={16} weight="regular" aria-hidden="true" />} title="Add item" onClick={onAddItem} />
              <CircleIconButton
                icon={skipped ? <ArrowCounterClockwise size={16} weight="regular" aria-hidden="true" /> : <SkipForward size={16} weight="regular" aria-hidden="true" />}
                title={skipped ? "Un-skip station" : "Skip station"}
                onClick={onSkip}
              />
            </>
          )}
          <CircleIconButton icon={<X size={16} weight="regular" aria-hidden="true" />} title="Close" onClick={onClose} />
        </div>
      </div>

      <div className="divide-y divide-hairline">
        {station.items.map((item) => {
          const isCurrent = currentItemId === item.id;
          return (
            <div key={item.id} className={`px-4 py-2.5 ${isCurrent ? "bg-brand-50" : ""}`}>
              <div className="flex items-center gap-2.5">
                <button
                  disabled={isPreview}
                  onClick={() => onToggleItem(item.id, item.completedAt === null)}
                  className={`grid size-[17px] shrink-0 place-items-center rounded-full border text-micro text-white disabled:cursor-not-allowed ${
                    item.completedAt !== null ? "border-brand-solid bg-brand-solid" : isCurrent ? "border-2 border-brand-500" : "border-2 border-hairline"
                  }`}
                >
                  {item.completedAt !== null && "✓"}
                </button>
                <div className="min-w-0 flex-1">
                  <span className={`block text-body ${item.completedAt !== null ? "text-ink-400 line-through" : ""}`}>{item.title}</span>
                  {item.description && <span className="mt-0.5 block truncate text-caption text-ink-600">{item.description}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceItemId(item.id)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-ink-50 px-2 py-1 text-micro font-semibold text-ink-700 hover:bg-brand-50"
                >
                  <BookOpen size={13} aria-hidden="true" />
                  Study
                </button>
                {isCurrent && <span className="shrink-0 rounded-full bg-brand-solid px-2 py-0.5 text-micro font-semibold text-white">on today</span>}
                {item.reviewDue && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-800">review due</span>}
                {!item.reviewDue && item.masteryState === "mastered" && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-micro font-semibold text-emerald-800">mastered</span>}
                {item.skippedAt && <span className="shrink-0 text-micro text-ink-600">skipped</span>}
                {!isPreview && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.title}"? This can't be undone.`)) onDeleteItem(item.id);
                    }}
                    title="Delete item"
                    className="shrink-0 text-ink-400 hover:text-danger-600"
                  >
                    <Trash size={14} weight="regular" aria-hidden="true" />
                  </button>
                )}
              </div>
              {!isPreview && isCurrent && item.category === "grammar" && <NotesComposer item={item} onChanged={onChanged} />}
              {!isPreview && !(isCurrent && item.category === "grammar") && <ItemNotesSection item={item} onChanged={onChanged} />}
            </div>
          );
        })}
      </div>
      {workspaceItemId && (
        <TopicWorkspace
          itemId={workspaceItemId}
          onCompleted={() => {
            onChanged();
            setWorkspaceItemId(null);
          }}
          onClose={() => setWorkspaceItemId(null)}
        />
      )}
    </div>
  );
}

export function TopicWorkspace({ itemId, onCompleted, onClose }: { itemId: string; onCompleted: () => void; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["learning", "workspace", itemId], queryFn: () => api.syllabusWorkspace(itemId) });
  const [answer, setAnswer] = useState("");
  const [mistakeCategory, setMistakeCategory] = useState<SyllabusMistakeCategory | "">("");
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [rubric, setRubric] = useState({ taskFulfilled: false, grammarChecked: false, understandable: false });
  const [showTranscript, setShowTranscript] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.item.resourceTranscript || data.item.skill !== "listening" || data.item.resourceAudioUrl) return;
    let active = true;
    let objectUrl: string | null = null;
    setGeneratedAudioUrl(null);
    setAudioError(null);
    api.syllabusAudio(itemId)
      .then((audio) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(audio);
        setGeneratedAudioUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (active) setAudioError(error instanceof Error ? error.message : "The lesson recording could not be loaded.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data?.item.resourceAudioUrl, data?.item.resourceTranscript, data?.item.skill, itemId]);
  const submit = useMutation({
    mutationFn: () => api.submitSyllabusExercise(
      itemId,
      answer || (data?.item.exerciseType === "self_check" ? "self-check" : "audio"),
      mistakeCategory || null,
      data?.item.skill === "writing" || data?.item.exerciseType === "speaking_audio" || data?.item.exerciseType === "self_check" ? rubric : null,
    ),
    onSuccess: (result) => {
      if (result.passed && data?.item.exerciseType !== "speaking_audio") onCompleted();
    },
  });

  if (isLoading || !data) return <div className="mt-3 rounded-xl bg-card p-4 text-caption text-ink-600">Loading lesson…</div>;
  const { item } = data;
  return (
    <section className="mt-3 rounded-2xl border border-hairline bg-card p-4 shadow-card" aria-label={`Study ${item.title}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Topic workspace</p>
          <h3 className="mt-1 text-body font-bold text-ink-900">{item.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-caption text-ink-600 hover:text-ink-900">Close</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.skill && <span className="rounded-full bg-ink-50 px-2 py-1 text-micro font-semibold uppercase tracking-[.08em] text-ink-700">{item.skill}</span>}
        {item.exerciseType && <span className="rounded-full bg-brand-50 px-2 py-1 text-micro font-semibold uppercase tracking-[.08em] text-brand-700">{item.exerciseType.replace("_", " ")}</span>}
      </div>

      {item.learningOutcome && (
        <div className="mt-4 rounded-xl bg-ink-50 p-3">
          <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Outcome</p>
          <p className="mt-1 text-caption text-ink-700">{item.learningOutcome}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {item.resourceTitle && (
          <div className="rounded-xl border border-hairline bg-ink-50 p-3">
            <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Study</p>
            <h4 className="mt-1 text-caption font-bold text-ink-900">{item.resourceTitle}</h4>
            {item.resourceBody && <p className="mt-1 whitespace-pre-line text-caption text-ink-700">{item.resourceBody}</p>}
          </div>
        )}

        {item.skill === "listening" && (
          <div className="rounded-xl border border-hairline bg-ink-50 p-3">
            <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Listening</p>
            {item.resourceAudioUrl || generatedAudioUrl ? (
              <>
                <audio className="mt-2 w-full" controls preload="metadata" src={item.resourceAudioUrl ?? generatedAudioUrl ?? undefined}>
                  Your browser cannot play this audio source.
                </audio>
                <p className="mt-2 text-micro text-ink-600">Listen twice: first for the main idea, then for key details.</p>
                {item.listeningPrompt && <p className="mt-2 text-caption text-ink-700"><strong>Listen for:</strong> {item.listeningPrompt}</p>}
              </>
            ) : (
              <>
                <p className="mt-2 text-caption text-ink-600">
                  {item.resourceTranscript ? "Preparing the lesson recording…" : "No recording is available for this lesson yet."}
                </p>
                {audioError && <p className="mt-2 text-caption text-danger-700">{audioError}</p>}
                {item.listeningPrompt && <p className="mt-2 text-caption text-ink-700"><strong>Listen for:</strong> {item.listeningPrompt}</p>}
              </>
            )}
            {item.resourceTranscript && (
              <div className="mt-3 border-t border-hairline pt-2">
                <button
                  type="button"
                  className="text-caption font-semibold text-ink-700 hover:text-ink-900"
                  onClick={() => setShowTranscript((visible) => !visible)}
                  aria-expanded={showTranscript}
                >
                  {showTranscript ? "Hide transcript" : "Reveal transcript after listening"}
                </button>
                {showTranscript && <p className="mt-2 whitespace-pre-line text-caption text-ink-700">{item.resourceTranscript}</p>}
              </div>
            )}
          </div>
        )}

        {item.guidedPractice && (
          <div className="rounded-xl border border-hairline bg-brand-50 p-3">
            <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Practice</p>
            <p className="mt-1 text-caption text-ink-700">{item.guidedPractice}</p>
          </div>
        )}

        {item.exercisePrompt && (
          <div className="rounded-xl border border-hairline bg-ink-50 p-3">
            <p className="text-micro font-semibold uppercase tracking-[.12em] text-ink-600">Exercise</p>
            <p className="mt-1 text-caption text-ink-700">{item.exercisePrompt}</p>

            {item.exerciseType === "multiple_choice" && item.exerciseOptions?.options?.length ? (
              <div className="mt-3 space-y-2">
                {item.exerciseOptions.options.map((option, index) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-card p-2 text-caption text-ink-900">
                    <input type="radio" name={`exercise-${item.id}`} checked={answer === String(index)} onChange={() => setAnswer(String(index))} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : item.exerciseType === "listening_audio" || item.exerciseType === "speaking_audio" ? (
              <div className="mt-3 rounded-lg border border-hairline bg-card p-3">
                <p className="text-caption text-ink-600">
                  {item.exerciseType === "listening_audio" ? "Listen to the assigned audio, then upload your spoken summary or answer." : "Record yourself completing this speaking task."}
                </p>
                <div className="mt-2">
                  <AudioRecorder syllabusItemId={item.id} onUploaded={() => setAudioUploaded(true)} />
                </div>
                {audioUploaded && <p className="mt-2 text-caption text-ok-700">Audio uploaded. Submit it for feedback.</p>}
              </div>
            ) : (
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={3}
                className="mt-3 w-full rounded-lg border border-hairline bg-card p-2 text-caption text-ink-900 outline-none focus:border-brand-500"
                placeholder={item.exerciseType === "correction" ? "Write the corrected German sentence…" : "Write your answer in German…"}
              />
            )}

            {(item.skill === "writing" || item.exerciseType === "speaking_audio" || item.exerciseType === "self_check") && (
              <fieldset className="mt-3 rounded-lg border border-hairline bg-card p-3">
                <legend className="px-1 text-caption font-semibold text-ink-700">
                  {item.exerciseType === "speaking_audio"
                    ? "Before submitting, review your recording"
                    : item.exerciseType === "self_check"
                      ? "Confirm your understanding"
                      : "Before submitting, check your work"}
                </legend>
                {([
                  ["taskFulfilled", item.exerciseType === "speaking_audio" ? "I completed every part of the speaking prompt." : item.exerciseType === "self_check" ? "I can explain the target concept." : "I answered every part of the prompt."],
                  ["grammarChecked", item.exerciseType === "speaking_audio" ? "I listened to my recording once." : item.exerciseType === "self_check" ? "I can produce a correct example." : "I checked verb forms, articles, and word order."],
                  ["understandable", item.exerciseType === "speaking_audio" ? "My message is understandable without reading the prompt." : item.exerciseType === "self_check" ? "I know what to review if I am unsure." : "A German learner could understand my meaning."],
                ] as const).map(([key, label]) => (
                  <label key={key} className="mt-2 flex items-start gap-2 text-caption text-ink-700">
                    <input
                      type="checkbox"
                      checked={rubric[key]}
                      onChange={(event) => setRubric((current) => ({ ...current, [key]: event.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <label className="mt-3 block text-caption text-ink-600">
              If it is incorrect, what felt difficult?
              <select
                value={mistakeCategory}
                onChange={(event) => setMistakeCategory(event.target.value as SyllabusMistakeCategory | "")}
                className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2 text-caption text-ink-900 outline-none focus:border-brand-500"
              >
                <option value="">Choose after an incorrect attempt</option>
                <option value="gender_article">Gender / article</option>
                <option value="case">Case</option>
                <option value="word_order">Word order</option>
                <option value="conjugation">Conjugation</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="spelling">Spelling</option>
                <option value="pronunciation">Pronunciation</option>
                <option value="listening_detail">Listening detail</option>
                <option value="collocation">Collocation</option>
                <option value="other">Other</option>
              </select>
            </label>

            <button
              type="button"
              disabled={submit.isPending || (item.exerciseType === "listening_audio" || item.exerciseType === "speaking_audio" ? !audioUploaded : item.exerciseType === "self_check" ? Object.values(rubric).filter(Boolean).length < 3 : answer.trim().length === 0)}
              onClick={() => submit.mutate()}
              className="mt-3 rounded-lg bg-brand-solid px-3 py-2 text-caption font-semibold text-white disabled:opacity-50"
            >
              {submit.isPending ? "Checking…" : "Check and complete"}
            </button>
            {submit.data && (
              <p className={`mt-2 text-caption ${submit.data.passed ? "text-ok-700" : "text-danger-600"}`}>
                {submit.data.feedback}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

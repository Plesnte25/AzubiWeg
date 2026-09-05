import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, Paperclip, Plus, SkipForward, Trash, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { SyllabusItem } from "../../api/types";
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
          <button type="button" onClick={() => setComposing(true)} className="text-caption text-ink-400 hover:text-ink-600">
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
          <p className="text-caption text-ink-400">
            {station.items.length} items · {closedCount}/{station.items.length} closed
            {isPreview && <span className="ml-2 rounded-full bg-ink-50 px-2 py-0.5 text-micro font-semibold text-ink-400">preview</span>}
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
                    item.completedAt !== null ? "border-ok-600 bg-ok-600" : isCurrent ? "border-2 border-brand-500" : "border-2 border-hairline"
                  }`}
                >
                  {item.completedAt !== null && "✓"}
                </button>
                <div className="min-w-0 flex-1">
                  <span className={`block text-body ${item.completedAt !== null ? "text-ink-400 line-through" : ""}`}>{item.title}</span>
                  {item.description && <span className="mt-0.5 block truncate text-caption text-ink-400">{item.description}</span>}
                </div>
                {isCurrent && <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-micro font-semibold text-white">on today</span>}
                {item.skippedAt && <span className="shrink-0 text-micro text-ink-400">skipped</span>}
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
    </div>
  );
}

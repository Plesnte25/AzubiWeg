import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, SkipForward, Trash2, Undo2, X } from "lucide-react";
import { api } from "../../api/client";
import type { SyllabusItem } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import type { Station } from "./stations";

/** Merges the 3 legacy fields into one editable value (nothing already
 * written is lost) but every future save writes the whole thing back to
 * `examples` only — `exceptions`/`commonMistakes` are cleared on first edit.
 * See server/src/prisma/schema.prisma's SyllabusItem for why the columns
 * themselves aren't dropped (older rows may still carry real content). */
function mergedNotebookValue(item: SyllabusItem): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

/** A small circular icon-button, matching this session's established
 * search/info/CTA idiom (Vocabulary.tsx, TodayPage.tsx) — used here both for
 * the modal's own +Item/Skip header actions and as the file-attach trigger
 * embedded in the notes composer below. */
function CircleIconButton({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
    </button>
  );
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
    <div className="mt-2 rounded-[10px] bg-paper p-2.5">
      <textarea
        className="w-full resize-none border-0 bg-transparent text-xs outline-none"
        rows={2}
        placeholder="Type a note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== mergedNotebookValue(item)) update.mutate(draft);
        }}
      />
      <div className="mt-1.5">
        <Attachments
          files={item.files}
          parent={{ syllabusItemId: item.id }}
          onChanged={onChanged}
          renderTrigger={({ onClick, uploading }) => (
            <CircleIconButton icon={<Plus className="size-3.5" aria-hidden="true" />} title="Attach a file" onClick={onClick} disabled={uploading} />
          )}
        />
      </div>
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
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`Station ${resolvedIdx + 1} · ${station.theme}`} className="animate-slide-up rounded-[18px] border border-hairline bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold">
            Station {resolvedIdx + 1} · {station.theme}
          </p>
          <p className="text-xs text-ink-400">
            {station.items.length} items · {closedCount}/{station.items.length} closed
            {isPreview && <span className="ml-2 rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-400">preview</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isPreview && (
            <>
              <CircleIconButton icon={<Plus className="size-4" aria-hidden="true" />} title="Add item" onClick={onAddItem} />
              <CircleIconButton
                icon={skipped ? <Undo2 className="size-4" aria-hidden="true" /> : <SkipForward className="size-4" aria-hidden="true" />}
                title={skipped ? "Un-skip station" : "Skip station"}
                onClick={onSkip}
              />
            </>
          )}
          <CircleIconButton icon={<X className="size-4" aria-hidden="true" />} title="Close" onClick={onClose} />
        </div>
      </div>

      <div className="max-h-[60vh] divide-y divide-hairline overflow-y-auto rounded-2xl border border-hairline">
        {station.items.map((item) => {
          const isCurrent = currentItemId === item.id;
          return (
            <div key={item.id} className={`px-4 py-2.5 ${isCurrent ? "bg-[var(--color-brand-50)]" : ""}`}>
              <div className="flex items-center gap-2.5">
                <button
                  disabled={isPreview}
                  onClick={() => onToggleItem(item.id, item.completedAt === null)}
                  className={`grid size-[17px] shrink-0 place-items-center rounded-full border text-[9px] text-white disabled:cursor-not-allowed ${
                    item.completedAt !== null ? "border-ok-600 bg-ok-600" : isCurrent ? "border-2 border-brand-500" : "border-2 border-hairline"
                  }`}
                >
                  {item.completedAt !== null && "✓"}
                </button>
                <span className={`flex-1 text-[13px] ${item.completedAt !== null ? "text-ink-400 line-through" : ""}`}>{item.title}</span>
                {isCurrent && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">on today</span>}
                {item.skippedAt && <span className="text-[10px] text-ink-400">skipped</span>}
                {!isPreview && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.title}"? This can't be undone.`)) onDeleteItem(item.id);
                    }}
                    title="Delete item"
                    className="shrink-0 text-ink-400 hover:text-danger-600"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {!isPreview && isCurrent && item.category === "grammar" && <NotesComposer item={item} onChanged={onChanged} />}
              {!isPreview && !(isCurrent && item.category === "grammar") && (
                <div className="mt-1.5 pl-[26px]">
                  <Attachments files={item.files} parent={{ syllabusItemId: item.id }} onChanged={onChanged} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LinkSimple, Plus } from "@phosphor-icons/react";
import type { Note } from "../../api/types";
import { NoteComposer } from "../../components/notes/NoteComposer";
import { NoteEditor } from "../../components/notes/NoteEditor";
import type { Station } from "./stations";

function focusComposer() {
  const el = document.getElementById("station-notes-composer");
  el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  el?.querySelector<HTMLElement>("[contenteditable]")?.focus();
}

/**
 * The Syllabus desktop screen's column 3 (Claude Design handoff turn 7a) —
 * replaces the old shared-with-Sources 3rd column entirely. Drop a
 * StationAccordion item row here (or click its "+ note" action) to point
 * the persistent composer at that item — same dataTransfer/dragOver-
 * highlight convention as Vocabulary.tsx's word rows onto NotesDock.tsx,
 * just a syllabus-item-id payload instead of a word-id.
 *
 * The composer's target is lifted state (`composerItemId`, owned by
 * SyllabusDesktop.tsx) rather than something this component creates a note
 * against immediately on drop/click: the server rejects a title-and-body-
 * less Note outright (a real, correct validation — a truly blank note isn't
 * a thing anywhere in this app), so "attach a note to it" has to mean
 * "aim the composer here," not "silently create an empty row."
 */
export function StationNotesPanel({
  station,
  notes,
  composerItemId,
  onComposerItemChange,
}: {
  station: Station;
  notes: Note[];
  composerItemId: string | null;
  onComposerItemChange: (itemId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const composerItem = station.items.find((i) => i.id === composerItemId) ?? null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["learning", "syllabus", "station-notes", station.theme] });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between">
        <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-600)" }}>
          Notes · this station
        </div>
        <button type="button" onClick={focusComposer} className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: "var(--color-brand-700)" }}>
          <Plus size={12} weight="bold" aria-hidden="true" />
          New
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const itemId = e.dataTransfer.getData("text/syllabus-item-id");
          if (station.items.some((i) => i.id === itemId)) {
            onComposerItemChange(itemId);
            focusComposer();
          }
        }}
        className="mt-3 rounded-[11px] px-3 py-3.5 text-center text-[11.5px]"
        style={{
          border: `1.5px dashed ${dragOver ? "var(--color-brand-500)" : "var(--color-brand-500)"}`,
          background: dragOver ? "var(--color-brand-50)" : "transparent",
          color: "var(--color-ink-400)",
        }}
      >
        Drag a task here to attach a note to it
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {notes.length === 0 ? (
          <p className="py-6 text-center text-[12px]" style={{ color: "var(--color-ink-600)" }}>
            No notes for this station yet.
          </p>
        ) : (
          notes.map((note) => {
            const linkedItem = station.items.find((i) => i.id === note.syllabusItemId);
            return (
              <div key={note.id} className="rounded-xl p-2.5" style={{ background: "var(--color-card)" }}>
                {linkedItem ? (
                  <div className="mb-1 flex items-center gap-1 text-micro font-medium" style={{ color: "var(--color-brand-800)" }}>
                    <LinkSimple size={10} weight="regular" aria-hidden="true" />
                    {linkedItem.title}
                  </div>
                ) : (
                  <div className="mb-1 text-micro" style={{ color: "var(--color-ink-600)" }}>
                    not linked to a task
                  </div>
                )}
                <NoteEditor note={note} onChanged={invalidate} />
              </div>
            );
          })
        )}
      </div>

      <div id="station-notes-composer" className="mt-2.5 rounded-[11px] p-2.5" style={{ border: "1px solid var(--color-hairline)" }}>
        {composerItem ? (
          <>
            <div className="mb-1.5 flex items-center gap-1 text-micro font-medium" style={{ color: "var(--color-brand-700)" }}>
              <LinkSimple size={10} weight="regular" aria-hidden="true" />
              Note for: {composerItem.title}
            </div>
            <NoteComposer key={composerItem.id} syllabusItemId={composerItem.id} onCreated={invalidate} />
          </>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--color-ink-600)" }}>
            Add an item to this station to start taking notes.
          </p>
        )}
      </div>
    </div>
  );
}

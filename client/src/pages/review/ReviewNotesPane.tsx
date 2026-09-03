import { useQueryClient, useQuery } from "@tanstack/react-query";
import { NotePencil } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { NoteComposer } from "../../components/notes/NoteComposer";

function noteSnippet(body: string | null): string {
  if (!body) return "";
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

/**
 * The desktop review layout's 4th pane (German Companion Desktop.dc.html
 * id="1c") — a composer pre-linked to the card on screen (Note.wordId, so
 * "notes taken mid-session attach to the card automatically" per the
 * handoff) plus that word's earlier notes below. Scoped to the current
 * word rather than NotesDock's app-wide drag-and-drop list, since here the
 * link target is already known (no drop target needed).
 */
export function ReviewNotesPane({ wordId }: { wordId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["notes", "word", wordId], queryFn: () => api.wordNotes(wordId) });
  const notes = data?.notes ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto px-[18px] py-[18px]">
      <div className="flex items-center gap-1.5">
        <NotePencil size={14} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
        <div className="text-[13.5px] font-medium" style={{ letterSpacing: "-.01em" }}>
          Notes
        </div>
      </div>

      <div className="mt-3">
        <NoteComposer wordId={wordId} onCreated={() => queryClient.invalidateQueries({ queryKey: ["notes", "word", wordId] })} />
      </div>

      {notes.length > 0 && (
        <>
          <div className="mt-4 text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.35)" }}>
            Earlier
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl p-3" style={{ background: "#1c1f2c" }}>
                <div className="truncate text-[13px] font-medium">{note.title || "(untitled)"}</div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                  {noteSnippet(note.body) || "empty note"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

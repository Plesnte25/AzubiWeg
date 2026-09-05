import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NotePencil, Plus } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { toast } from "../../components/ui/Toast";
import { NoteEditorContent } from "../plan/NoteEditor";

function noteSnippet(body: string | null): string {
  if (!body) return "";
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

/**
 * The Words desktop screen's 3rd column (German Companion Desktop.dc.html
 * id="1b") — drag a word from the list onto a note here to link it
 * (`api.updateNote(noteId, { wordId })`, already real — see schema.prisma's
 * Word.notes/Note.wordId comment). One adaptation from the literal handoff:
 * the mock drops a word onto whichever note is being actively typed in a
 * live in-dock composer; this app has no reusable embedded note-composer
 * component to put there, so instead each note row in the recent list is
 * its own drop target — drop directly onto the note you want linked. Same
 * real capability, a more discoverable interaction, no new composer needed.
 */
export function NotesDock({ draggingHeadword }: { draggingHeadword: string | null }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed() });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const link = useMutation({
    mutationFn: ({ noteId, wordId }: { noteId: string; wordId: string }) => api.updateNote(noteId, { wordId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Linked to note");
    },
    onError: () => toast.error("Couldn't link that word — try again."),
  });

  const notes = data?.notes ?? [];

  if (creating) {
    return (
      <div className="flex h-full flex-col overflow-y-auto rounded-xl" style={{ background: "#1c1f2c" }}>
        <NoteEditorContent
          id="new"
          embedded
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-[18px] py-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium" style={{ letterSpacing: "-.01em" }}>
          Notes
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New note"
          title="New note"
          className="grid size-6 place-items-center rounded-full"
          style={{ background: "#20222f", color: "#e9e9ed" }}
        >
          <Plus size={13} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-0.5 text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
        {notes.length} note{notes.length === 1 ? "" : "s"}
      </div>

      <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-2">
        {notes.length === 0 ? (
          <p className="py-6 text-center text-[12.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
            No notes yet.
          </p>
        ) : (
          notes.map((note) => {
            const isDragOver = dragOverId === note.id;
            return (
              <div
                key={note.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(note.id);
                }}
                onDragLeave={() => setDragOverId((v) => (v === note.id ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverId(null);
                  const wordId = e.dataTransfer.getData("text/word-id");
                  if (wordId) link.mutate({ noteId: note.id, wordId });
                }}
                className="rounded-xl p-3 transition-colors"
                style={{
                  background: isDragOver ? "rgba(145,132,217,.16)" : "#1c1f2c",
                  boxShadow: isDragOver ? "0 0 0 1px #9184d9" : "none",
                }}
              >
                {isDragOver && draggingHeadword ? (
                  <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: "#d2cefd" }}>
                    <NotePencil size={13} weight="regular" aria-hidden="true" />
                    Drop &ldquo;{draggingHeadword}&rdquo; to attach it
                  </div>
                ) : (
                  <>
                    <div className="truncate text-[13px] font-medium">{note.title || "(untitled)"}</div>
                    <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                      {noteSnippet(note.body) || "empty note"}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { Note } from "../../api/types";
import { Attachments } from "../Attachments";
import { CircleIconButton } from "../ui/CircleIconButton";
import { MinimalTiptap } from "./MinimalTiptap";

/** Freeform-note editor — edit-on-blur (matches every other edit-an-existing-
 * row textarea in the app), attachments, delete. Shared by the Notes tab and
 * a task's Notes section. */
export function NoteEditor({ note, onChanged }: { note: Note; onChanged: () => void }) {
  const [draft, setDraft] = useState(note.body ?? "");
  const update = useMutation({
    mutationFn: (body: string) => api.updateNote(note.id, { body: body || null }),
    onSuccess: onChanged,
  });
  const remove = useMutation({ mutationFn: () => api.deleteNote(note.id), onSuccess: onChanged });

  return (
    <div className="mt-2">
      <MinimalTiptap
        content={draft}
        onChange={setDraft}
        onBlur={() => {
          if (draft !== (note.body ?? "")) update.mutate(draft);
        }}
      />
      <div className="mt-1.5 flex items-center gap-1.5">
        <Attachments
          files={note.files}
          parent={{ noteId: note.id }}
          onChanged={onChanged}
          renderTrigger={({ onClick, uploading }) => (
            <CircleIconButton
              icon={<Plus className="size-3.5" aria-hidden="true" />}
              title="Attach a photo or file"
              onClick={onClick}
              disabled={uploading}
            />
          )}
        />
        <button
          className="ml-auto text-ink-400 hover:text-danger-600"
          title="Delete note"
          onClick={() => {
            if (confirm("Delete this note? This can't be undone.")) remove.mutate();
          }}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

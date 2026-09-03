import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import { api } from "../../api/client";
import type { RoadmapSkill } from "../../api/types";
import { stripHtml } from "../../lib/text";
import { Button } from "../ui/Button";
import { MinimalTiptap, MinimalTiptapToolbar } from "./MinimalTiptap";

/**
 * Freeform-note create composer, shared by the Notes tab and a task's Notes
 * section — explicit submit, not blur-to-save (there's no precedent in the
 * app for blur-to-save on record CREATION, only on editing an existing row).
 * Optional link fields pre-tag the created Note (e.g. a task's Notes section
 * passes its own roadmapTaskId + skill so every note it creates is already
 * linked, no re-tagging needed; the review session's notes pane passes
 * wordId so a note taken mid-session attaches to the card on screen,
 * matching the handoff's desktop Review layout) — the Notes tab's own
 * composer omits them, creating untagged/freeform notes exactly as before.
 */
export function NoteComposer({
  roadmapTaskId,
  syllabusItemId,
  skill,
  wordId,
  onCreated,
}: {
  roadmapTaskId?: string;
  syllabusItemId?: string;
  skill?: RoadmapSkill | null;
  wordId?: string;
  onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const plain = stripHtml(draft).trim();
  const wordCount = plain ? plain.split(/\s+/).length : 0;
  const create = useMutation({
    mutationFn: () => api.createNote({ body: draft, roadmapTaskId, syllabusItemId, skill: skill ?? undefined, wordId }),
    onSuccess: ({ note }) => {
      setDraft("");
      onCreated(note.id);
    },
  });

  return (
    <div>
      <MinimalTiptap
        content={draft}
        onChange={setDraft}
        onEditorReady={setEditor}
        placeholder="Type a note — a quick thought, a photo of a handwritten page, anything…"
      />
      <MinimalTiptapToolbar editor={editor} wordCount={wordCount} />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {create.isError && <span className="text-caption text-danger-600">{String(create.error)}</span>}
        <Button size="sm" className="ml-auto" disabled={!stripHtml(draft)} loading={create.isPending} onClick={() => create.mutate()}>
          Add note
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { RoadmapSkill } from "../../api/types";
import { stripHtml } from "../../lib/text";
import { Button } from "../ui/Button";
import { MinimalTiptap } from "./MinimalTiptap";

/**
 * Freeform-note create composer, shared by the Notes tab and a task's Notes
 * section — explicit submit, not blur-to-save (there's no precedent in the
 * app for blur-to-save on record CREATION, only on editing an existing row).
 * Optional link fields pre-tag the created Note (e.g. a task's Notes section
 * passes its own roadmapTaskId + skill so every note it creates is already
 * linked, no re-tagging needed) — the Notes tab's own composer omits them,
 * creating untagged/freeform notes exactly as before.
 */
export function NoteComposer({
  roadmapTaskId,
  syllabusItemId,
  skill,
  onCreated,
}: {
  roadmapTaskId?: string;
  syllabusItemId?: string;
  skill?: RoadmapSkill | null;
  onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const create = useMutation({
    mutationFn: () => api.createNote({ body: draft, roadmapTaskId, syllabusItemId, skill: skill ?? undefined }),
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
        placeholder="Type a note — a quick thought, a photo of a handwritten page, anything…"
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {create.isError && <span className="text-caption text-danger-600">{String(create.error)}</span>}
        <Button size="sm" className="ml-auto" disabled={!stripHtml(draft)} loading={create.isPending} onClick={() => create.mutate()}>
          Add note
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotePencil } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { stripHtml } from "../../lib/text";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * lg review pane 4: a quick composer linked to the card on screen (Note.wordId — notes taken mid-session attach to
 * the word) plus that word's earlier notes. Same textarea + Save shape as the Plan journey's notes tile.
 */
export function ReviewNotesPane({ wordId }: { wordId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const { data } = useQuery({ queryKey: ["notes", "word", wordId], queryFn: () => api.wordNotes(wordId) });
  const notes = data?.notes ?? [];
  const save = useMutation({
    mutationFn: () =>
      api.createNote({
        body: draft
          .trim()
          .split(/\n+/)
          .map((l) => `<p>${escapeHtml(l)}</p>`)
          .join(""),
        wordId,
      }),
    onSuccess: () => {
      setDraft("");
      toast.success("Note saved to this word");
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the note"),
  });

  return (
    <Tile bg="var(--mint)" tilt={-0.6} radius={24} className="flex h-full flex-col gap-3" style={{ padding: 18 }}>
      <span className="inline-flex items-center gap-1.5 uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
        <NotePencil size={16} weight="fill" aria-hidden="true" />
        Notes · {notes.length}
      </span>
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What tripped you up?"
          aria-label="Note on this word"
          rows={2}
          style={{ flex: 1, minHeight: 48, padding: "8px 12px", background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 14, fontSize: 14, fontWeight: 500, resize: "none" }}
        />
        <button
          type="button"
          disabled={!draft.trim() || save.isPending}
          onClick={() => save.mutate()}
          className="press shrink-0 cursor-pointer self-stretch disabled:cursor-default disabled:opacity-50"
          style={{ padding: "0 14px", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "3px 3px 0 var(--shadow)" }}
        >
          Save
        </button>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {notes.map((n) => (
          <div key={n.id} style={{ background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 14, padding: "10px 12px" }}>
            {n.title && <div style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</div>}
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--plainMuted)" }}>{stripHtml(n.body ?? "").slice(0, 160) || "empty note"}</div>
          </div>
        ))}
      </div>
    </Tile>
  );
}

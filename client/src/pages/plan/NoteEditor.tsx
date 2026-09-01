import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { CaretLeft, LinkSimple, Tag, Trash, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Note, Word } from "../../api/types";
import { MinimalTiptap } from "../../components/notes/MinimalTiptap";
import { useNavStack } from "../../lib/navStack";
import { stripHtml } from "../../lib/text";
import { findLinkableWord, wordLinkLabel } from "../../lib/wordLink";

function formatStamp(note: Note | null): string {
  if (!note) return "New note · not saved yet";
  const d = new Date(note.updatedAt);
  return `${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })} · saved`;
}

/**
 * Note.body is Tiptap HTML (existing notes already store real bold/list
 * formatting, edited elsewhere via MinimalTiptap) — a literal plain
 * <textarea> bound to it would show raw "<strong>" tags on open and corrupt
 * formatting on save, so this keeps MinimalTiptap for the body instead of
 * the handoff's flush textarea (deviation is about real data, not taste;
 * see CLAUDE.md). Its own bold/italic/list toolbar doubles as the literal
 * bottom toolbar row (real formatting instead of the handoff's decorative
 * icons); the tag/link icons in that row are dropped since the tag chips
 * and link banner above already cover those actions.
 */
function NoteEditorForm({ note, words }: { note: Note | null; words: Word[] }) {
  const { goBack, backLabel, push } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isNew = note === null;

  const [title, setTitle] = useState(note?.title ?? "");
  const [bodyHtml, setBodyHtml] = useState(note?.body ?? "");
  const [contextTag, setContextTag] = useState<string | null>(
    note?.contextTag ?? (isNew ? ((location.state as { contextTag?: string } | null)?.contextTag ?? null) : null),
  );
  const [wordId, setWordId] = useState<string | null>(note?.wordId ?? null);
  const [linkedWord, setLinkedWord] = useState<Word | null>(
    note?.wordId ? (words.find((w) => w.id === note.wordId) ?? null) : null,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const create = useMutation({
    mutationFn: (data: { title: string | null; body: string | null; contextTag: string | null; wordId: string | null }) =>
      api.createNote(data),
    onSuccess: () => {
      invalidate();
      goBack();
    },
  });
  const update = useMutation({
    mutationFn: (patch: Partial<Pick<Note, "title" | "body" | "contextTag" | "wordId">>) => api.updateNote(note!.id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteNote(note!.id),
    onSuccess: () => {
      invalidate();
      goBack();
    },
  });

  // live word-link detection, debounced against the plain-text body so a
  // ~100+ word deck isn't rescanned on every keystroke
  const [bodyPlain, setBodyPlain] = useState(() => stripHtml(bodyHtml));
  useEffect(() => {
    const t = setTimeout(() => setBodyPlain(stripHtml(bodyHtml)), 400);
    return () => clearTimeout(t);
  }, [bodyHtml]);
  const suggestion = useMemo(
    () => (wordId ? null : findLinkableWord(bodyPlain, words, wordId)),
    [bodyPlain, words, wordId],
  );

  const linkWord = (w: Word) => {
    setWordId(w.id);
    setLinkedWord(w);
    if (!isNew) update.mutate({ wordId: w.id });
  };

  // creation is explicit-submit (no precedent in this app for blur-to-save
  // on record CREATION, only on editing an existing row — see
  // NoteComposer.tsx) and skips ever writing an empty note; editing an
  // existing note stays blur-to-save like every other field in the app
  const finish = () => {
    if (isNew) {
      const t = title.trim();
      const hasContent = t || stripHtml(bodyHtml).trim();
      if (hasContent) {
        create.mutate({ title: t || null, body: bodyHtml || null, contextTag, wordId });
        return;
      }
    }
    goBack();
  };

  const wordCount = bodyPlain.trim() ? bodyPlain.trim().split(/\s+/).length : 0;

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+30px)]"
      style={{ background: "#161826" }}
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
        <button type="button" onClick={finish} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <span className="flex items-center gap-4" style={{ color: "rgba(233,233,237,.5)" }}>
          {!isNew && (
            <button
              type="button"
              title="Delete note"
              onClick={() => {
                if (confirm("Delete this note? This can't be undone.")) remove.mutate();
              }}
              style={{ color: "inherit" }}
            >
              <Trash size={16} weight="regular" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={finish} className="text-[13px] font-medium" style={{ color: "#b5abfc" }}>
            Done
          </button>
        </span>
      </div>

      <div className="mt-3.5 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.35)" }}>
        {formatStamp(note)}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!isNew && title !== (note!.title ?? "")) update.mutate({ title: title || null });
        }}
        placeholder="Note title"
        className="mt-1.5 border-0 bg-transparent p-0 text-[22px] font-medium outline-none"
        style={{ color: "#e9e9ed", letterSpacing: "-.02em" }}
      />

      <div className="mt-3 flex-1">
        <MinimalTiptap
          content={bodyHtml}
          onChange={setBodyHtml}
          onBlur={() => {
            if (!isNew && bodyHtml !== (note!.body ?? "")) update.mutate({ body: bodyHtml || null });
          }}
          placeholder="Write what you noticed…"
          className="min-h-[140px] bg-transparent p-0"
          autoFocus={isNew}
        />
      </div>

      {suggestion && (
        <div
          className="mt-2 flex items-center gap-[9px] rounded-[11px] px-3 py-2.5"
          style={{ background: "rgba(145,132,217,.09)", boxShadow: "0 0 0 1px rgba(145,132,217,.3)" }}
        >
          <LinkSimple size={15} weight="regular" style={{ color: "#b5abfc", flexShrink: 0 }} aria-hidden="true" />
          <div className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.75)" }}>
            Link "{wordLinkLabel(suggestion)}" to this note?
          </div>
          <button type="button" onClick={() => linkWord(suggestion)} className="text-[12px] font-medium" style={{ color: "#b5abfc" }}>
            Link
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 py-2.5">
        {contextTag && (
          <span
            className="inline-flex items-center gap-[5px] rounded-full py-1 pr-1 pl-2.5 text-[11.5px]"
            style={{ background: "rgba(145,132,217,.18)", color: "#d2cefd", boxShadow: "0 0 0 1px rgba(145,132,217,.4)" }}
          >
            <Tag size={11} weight="regular" aria-hidden="true" />
            {contextTag}
            <button
              type="button"
              title="Remove tag"
              onClick={() => {
                setContextTag(null);
                if (!isNew) update.mutate({ contextTag: null });
              }}
              className="grid size-[15px] place-items-center rounded-full"
              style={{ background: "rgba(233,233,237,.12)", color: "inherit" }}
            >
              <X size={8} weight="regular" aria-hidden="true" />
            </button>
          </span>
        )}
        {linkedWord && (
          <button
            type="button"
            onClick={() => push(`/words/${linkedWord.id}`)}
            className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11.5px]"
            style={{ boxShadow: "0 0 0 1px rgba(233,233,237,.18)", color: "rgba(233,233,237,.75)" }}
          >
            <LinkSimple size={11} weight="regular" aria-hidden="true" />
            {wordLinkLabel(linkedWord)}
          </button>
        )}
      </div>

      <div className="mt-auto text-right text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
        {wordCount} words
      </div>
    </div>
  );
}

/** Sources a note from the already-cached notesFeed query — /api/notes has
 * no GET /:id, same reason WordDetail.tsx reads a single word out of the
 * ["words"] list query instead of fetching it directly. */
export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { data: notesData } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed() });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });

  if (!notesData || !wordsData) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#161826" }} />;
  }

  const existing = isNew ? null : (notesData.notes.find((n) => n.id === id) ?? null);
  if (!isNew && !existing) {
    return (
      <div
        className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] items-center justify-center px-6 text-center text-[13.5px]"
        style={{ background: "#161826", color: "rgba(233,233,237,.5)" }}
      >
        This note doesn't exist anymore.
      </div>
    );
  }

  // keyed on id so navigating from one existing note straight to another
  // (or to a fresh "new" one) resets the form's local draft state
  return <NoteEditorForm key={id} note={existing} words={wordsData.words} />;
}

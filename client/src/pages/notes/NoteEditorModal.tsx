import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Star, Trash, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { NoteCategory, WallNote } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import { Chip } from "../../components/ui/Chip";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { MinimalTiptap } from "../../components/notes/MinimalTiptap";
import { NOTE_CATEGORIES, NOTE_COLORS, NOTE_LABELS } from "../../lib/noteCategories";
import { useNavStack } from "../../lib/navStack";
import type { Station } from "../plan/journey/model";
import { LINK_ICONS, LINK_KINDS, NO_LINK, noteLink, stationLabel, type LinkKind } from "./model";

/*
 * Note editor (AzubiNotes.dc.html editor modal, sticky style): category chips recolour the note live; title on a
 * dashed underline; the body is TipTap (Note.body is HTML — existing notes carry real bold/list formatting) on ruled
 * paper; link chips /word /station /source /job; attachments; Delete / Pin / Done. Title and body autosave 600ms
 * after the last keystroke (and on close); category, pin and links save at once.
 *
 * Deviation: a linked chip shows the name and deep-links to it (Words, Plan, Library, Jobs), with a separate ×
 * to unlink — the prototype's chip only toggled, but the README asks for the deep links.
 */

type Option = { id: string; label: string; sub?: string };

function LinkPicker({ kind, stations, onPick, onCancel }: { kind: LinkKind; stations: Station[]; onPick: (o: Option) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const { data: words } = useQuery({ queryKey: ["words"], queryFn: api.words, enabled: kind === "word" });
  const { data: sources } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources, enabled: kind === "source" });
  const { data: apps } = useQuery({ queryKey: ["applications"], queryFn: api.applications, enabled: kind === "job" });
  const options: Option[] = useMemo(() => {
    if (kind === "word") return (words?.words ?? []).map((w) => ({ id: w.id, label: w.headword, sub: w.meaning ?? undefined }));
    if (kind === "station") return stations.map((s) => ({ id: s.key, label: `Station ${s.index} · ${s.theme}`, sub: s.level.toUpperCase() }));
    if (kind === "source") return (sources?.sources ?? []).map((s) => ({ id: s.id, label: s.title }));
    return (apps?.applications ?? []).map((a) => ({ id: a.id, label: a.company, sub: a.role }));
  }, [kind, words, sources, apps, stations]);
  const needle = q.trim().toLowerCase();
  const shown = options.filter((o) => !needle || `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(needle)).slice(0, 8);
  return (
    <div
      className="flex shrink-0 flex-col"
      style={{ gap: 6, padding: 10, border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)" }}
    >
      <div className="flex items-center" style={{ gap: 6 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown[0]) {
              e.preventDefault();
              onPick(shown[0]);
            }
          }}
          placeholder={`Find a ${kind === "job" ? "job" : kind}…`}
          aria-label={`Find a ${kind} to link`}
          style={{ flex: 1, minWidth: 0, height: 38, padding: "0 10px", border: "2px solid var(--line)", borderRadius: 10, background: "var(--plain2)", color: "inherit", fontSize: 14, fontWeight: 600 }}
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel linking"
          className="flex shrink-0 cursor-pointer items-center justify-center p-0"
          style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--line)", background: "transparent", color: "inherit" }}
        >
          <X size={12} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto" style={{ gap: 2, maxHeight: 180 }}>
        {shown.length === 0 && <span style={{ fontSize: 13, fontWeight: 600, padding: "6px 4px", color: "var(--plainMuted)" }}>Nothing matches.</span>}
        {shown.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o)}
            className="flex cursor-pointer items-baseline text-left hover:bg-[var(--plain2)]"
            style={{ gap: 8, padding: "6px 8px", borderRadius: 8, border: "none", background: "transparent", color: "inherit" }}
          >
            <span lang={kind === "word" ? "de" : undefined} style={{ fontSize: 14, fontWeight: 700 }}>
              {o.label}
            </span>
            {o.sub && (
              <span className="min-w-0 truncate" style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>
                {o.sub}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const LINK_FIELD: Record<LinkKind, keyof typeof NO_LINK> = { word: "wordId", station: "stationKey", source: "studySourceId", job: "applicationId" };

export function NoteEditorModal({ note, stations, onClose }: { note: WallNote; stations: Station[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { push } = useNavStack();
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body ?? "");
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const [picking, setPicking] = useState<LinkKind | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef<{ title?: string | null; body?: string | null }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["notes"] });
  const patch = useMutation({
    mutationFn: (data: Parameters<typeof api.updateNote>[1]) => api.updateNote(note.id, data),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the note"),
  });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const data = pending.current;
    pending.current = {};
    if (Object.keys(data).length === 0) return;
    setStatus("saving");
    api
      .updateNote(note.id, data)
      .then(() => {
        setStatus((s) => (s === "saving" ? "saved" : s));
        refresh();
      })
      .catch(() => {
        setStatus("dirty");
        toast.error("Couldn't save the note");
      });
  };
  const queue = (data: { title?: string | null; body?: string | null }) => {
    pending.current = { ...pending.current, ...data };
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  // save whatever is pending if the modal unmounts mid-debounce (Esc, backdrop, navigation)
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    flush();
    onClose();
  };
  const remove = useMutation({
    mutationFn: () => api.deleteNote(note.id),
    onSuccess: () => {
      pending.current = {};
      refresh();
      toast.info("Note deleted");
      onClose();
    },
  });

  const cat = note.category;
  const link = noteLink(note, stations);
  const setLink = (kind: LinkKind, id: string | null, name: string) => {
    setPicking(null);
    patch.mutate({ ...NO_LINK, ...(id ? { [LINK_FIELD[kind]]: id } : {}) }, { onSuccess: () => toast.success(id ? `Linked to ${name}` : "Link removed") });
  };
  const openLink = () => {
    if (!link) return;
    close();
    if (note.word) push(`/words/${note.word.id}`);
    else if (note.stationKey) push("/plan", { state: { openStationKey: note.stationKey } });
    else if (note.studySource) push("/plan", { state: { openSourceId: note.studySource.id } });
    else if (note.application) push("/jobs", { state: { open: note.application.id } });
  };

  return (
    <Modal
      ariaLabel={`Note: ${title || "Untitled"}`}
      bg={NOTE_COLORS[cat]}
      width={580}
      sticky={{ radius: "6px 6px 34px 6px", height: 560, tilt: -0.8 }}
      onClose={close}
      header={
        <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label="Category">
          {NOTE_CATEGORIES.map((c) => (
            <Chip
              key={c}
              size="sm"
              bg={NOTE_COLORS[c]}
              selected={c === cat}
              selectedTilt={-1.5}
              style={{ border: "2.5px solid var(--line)", fontSize: 12, padding: "0 10px" }}
              onClick={() => c !== cat && patch.mutate({ category: c as NoteCategory })}
            >
              {NOTE_LABELS[c]}
            </Chip>
          ))}
        </div>
      }
      footer={
        <>
          <PillButton
            variant="secondary"
            style={{ minWidth: 110 }}
            icon={<Trash size={14} weight="fill" aria-hidden="true" />}
            onClick={() => (confirmDelete ? remove.mutate() : setConfirmDelete(true))}
          >
            {confirmDelete ? "Really?" : "Delete"}
          </PillButton>
          <PillButton
            variant="secondary"
            aria-pressed={note.pinned}
            icon={<Star size={14} weight={note.pinned ? "fill" : "bold"} aria-hidden="true" />}
            onClick={() => patch.mutate({ pinned: !note.pinned })}
            style={{ padding: "0 14px" }}
          >
            {note.pinned ? "Pinned" : "Pin"}
          </PillButton>
          <PillButton className="flex-1" onClick={close}>
            Done
          </PillButton>
        </>
      }
    >
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          queue({ title: e.target.value.trim() || null });
        }}
        placeholder="Title"
        aria-label="Title"
        className="shrink-0"
        style={{
          border: "none",
          borderBottom: "2.5px dashed var(--line)",
          background: "transparent",
          color: "var(--onTile)",
          fontSize: "calc(var(--k, 1) * 30px)",
          fontWeight: 700,
          letterSpacing: "-.04em",
          outline: "none",
          padding: "0 0 8px",
          minWidth: 0,
        }}
      />
      <div
        ref={bodyRef}
        className="min-h-[160px] flex-1 cursor-text [&_.ProseMirror]:min-h-full [&_.ProseMirror]:!text-[16px] [&_.ProseMirror]:!leading-[28px] [&_.ProseMirror]:font-semibold [&_p]:!my-0 [&_ul]:!my-0 [&_ol]:!my-0 [&_.is-editor-empty:first-child]:before:!text-current [&_.is-editor-empty:first-child]:before:opacity-50"
        style={{
          overflowY: "auto",
          backgroundImage: "repeating-linear-gradient(transparent 0 27px, rgba(0,0,0,.14) 27px 28px)",
          backgroundAttachment: "local",
        }}
      >
        <MinimalTiptap
          content={body}
          placeholder="Write… link it below"
          className="h-full"
          onChange={(html) => {
            // TipTap normalises a legacy plain-text body into <p> on mount and emits it; only save what the user typed
            if (!bodyRef.current?.contains(document.activeElement)) return;
            setBody(html);
            queue({ body: html === "<p></p>" ? null : html });
          }}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center" style={{ gap: 6 }}>
        {LINK_KINDS.map((k) => {
          const Icon = LINK_ICONS[k];
          if (link?.kind === k)
            return (
              <span
                key={k}
                className="inline-flex items-center"
                style={{ height: 32, border: "2px solid var(--line)", borderRadius: 999, background: "var(--sel)", color: "var(--selText)", fontSize: 12, fontWeight: 700, overflow: "hidden" }}
              >
                <button type="button" onClick={openLink} className="inline-flex h-full cursor-pointer items-center" style={{ gap: 5, padding: "0 6px 0 11px", border: "none", background: "transparent", color: "inherit" }} title="Open">
                  <Icon size={12} weight="fill" aria-hidden="true" />
                  <span className="max-w-[180px] truncate" lang={k === "word" ? "de" : undefined}>
                    {link.label}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => setLink(k, null, link.label)}
                  className="inline-flex h-full cursor-pointer items-center"
                  style={{ padding: "0 9px 0 4px", border: "none", background: "transparent", color: "inherit" }}
                >
                  <X size={11} weight="bold" aria-hidden="true" />
                </button>
              </span>
            );
          return (
            <button
              key={k}
              type="button"
              aria-expanded={picking === k}
              onClick={() => setPicking(picking === k ? null : k)}
              className="inline-flex cursor-pointer items-center"
              style={{
                gap: 5,
                height: 32,
                padding: "0 11px",
                border: `2px ${picking === k ? "solid" : "dashed"} var(--line)`,
                borderRadius: 999,
                background: "var(--plain)",
                color: "var(--plainText)",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              <Icon size={12} weight="fill" aria-hidden="true" />/{k}
            </button>
          );
        })}
        <span className="ml-auto" style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }} aria-live="polite">
          {status === "saving" ? "Saving…" : status === "dirty" ? "Editing…" : "Saved"}
        </span>
      </div>
      {picking && (
        <LinkPicker
          kind={picking}
          stations={stations}
          onCancel={() => setPicking(null)}
          onPick={(o) => setLink(picking, o.id, picking === "station" ? stationLabel(o.id, stations) : o.label)}
        />
      )}
      <div className="shrink-0">
        <Attachments
          files={note.files}
          parent={{ noteId: note.id }}
          onChanged={refresh}
          renderTrigger={({ onClick, uploading }) => (
            <button
              type="button"
              onClick={onClick}
              disabled={uploading}
              className="inline-flex cursor-pointer items-center"
              style={{ gap: 5, height: 32, padding: "0 11px", border: "2px dashed var(--line)", borderRadius: 999, background: "transparent", color: "inherit", fontWeight: 700, fontSize: 12 }}
            >
              <Paperclip size={12} weight="bold" aria-hidden="true" />
              {uploading ? "Uploading…" : "Attach"}
            </button>
          )}
        />
      </div>
    </Modal>
  );
}

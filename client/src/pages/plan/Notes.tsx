import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, NotePencil, Plus } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Note, RoadmapJournalTask, RoadmapSkill, SurfacedNotebookEntry, SurfacedUnitNote } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import { CircleIconButton } from "../../components/ui/CircleIconButton";
import { toast } from "../../components/ui/Toast";
import { useNavStack } from "../../lib/navStack";
import { SKILL_LABELS } from "../../lib/skills";
import { stripHtml } from "../../lib/text";
import type { Destination } from "../learning-hub/destinations";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { TaskDetailDrawer } from "../learning-hub/TaskDetailDrawer";
import { NoteEditorContent } from "./NoteEditor";

type Bucket = "all" | "mine" | "surfaced";

// every RoadmapSkill, not just the 6 "core" ones — task journals/notes can
// carry bureaucracy/milestone/reflection too
const ALL_SKILLS: RoadmapSkill[] = [
  "grammar",
  "vocab",
  "listening",
  "speaking",
  "writing",
  "reading",
  "bureaucracy",
  "milestone",
  "reflection",
];

type FeedRow =
  | { key: string; source: "note"; item: Note }
  | { key: string; source: "journal"; item: RoadmapJournalTask }
  | { key: string; source: "notebook"; item: SurfacedNotebookEntry }
  | { key: string; source: "unit"; item: SurfacedUnitNote };

const SOURCE_LABEL: Record<FeedRow["source"], string> = {
  note: "Note",
  journal: "Task journal",
  notebook: "Grammar Notebook",
  unit: "Source note",
};

function firstLine(text: string | null): string {
  if (!text) return "";
  return text.split("\n").find((l) => l.trim()) ?? "";
}

function rowTitle(row: FeedRow): string {
  if (row.source === "note") return row.item.title?.trim() || firstLine(stripHtml(row.item.body ?? "")) || "Untitled note";
  return row.item.title;
}

/** Plain-text preview for the collapsed row — Note.body is Tiptap HTML,
 * everything else is already plain text. */
function rowPreview(row: FeedRow): string {
  switch (row.source) {
    case "note":
      return firstLine(stripHtml(row.item.body ?? ""));
    case "journal":
      return firstLine(row.item.journalEntry);
    case "notebook":
      return firstLine(row.item.body);
    case "unit":
      return firstLine(row.item.notes);
  }
}

function rowSkill(row: FeedRow): RoadmapSkill | null {
  switch (row.source) {
    case "note":
    case "journal":
    case "notebook":
      return row.item.skill;
    case "unit":
      return null;
  }
}

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function rowMeta(row: FeedRow): string {
  switch (row.source) {
    case "note":
      return relativeDay(row.item.updatedAt) + (row.item.contextTag ? ` · ${row.item.contextTag}` : "");
    case "journal":
      return new Date(row.item.day.date).toLocaleDateString();
    case "notebook":
      return `${row.item.level.toUpperCase()}${row.item.theme ? ` · ${row.item.theme}` : ""}`;
    case "unit":
      return row.item.sourceTitle;
  }
}

function NotebookEditor({ item, onChanged }: { item: SurfacedNotebookEntry; onChanged: () => void }) {
  const [draft, setDraft] = useState(item.body);
  const update = useMutation({
    mutationFn: (value: string) =>
      api.updateSyllabusNotebook(item.id, { examples: value || null, exceptions: null, commonMistakes: null }),
    onSuccess: onChanged,
    onError: () => toast.error("Couldn't save that note — try again."),
  });

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== item.body) update.mutate(draft);
        }}
        rows={3}
        className="box-border w-full resize-none rounded-[10px] px-3 py-2 text-[13px] outline-none"
        style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
      />
      <Attachments
        files={item.files}
        parent={{ syllabusItemId: item.id }}
        onChanged={onChanged}
        renderTrigger={({ onClick, uploading }) => (
          <CircleIconButton
            icon={<Plus className="size-3.5" aria-hidden="true" />}
            title={uploading ? "Uploading…" : "Attach a file"}
            onClick={onClick}
            disabled={uploading}
          />
        )}
      />
    </div>
  );
}

function UnitNoteEditor({ item, onChanged }: { item: SurfacedUnitNote; onChanged: () => void }) {
  const [draft, setDraft] = useState(item.notes ?? "");
  const update = useMutation({
    mutationFn: (notes: string) => api.updateUnitNotes(item.sourceId, item.id, notes || null),
    onSuccess: onChanged,
    onError: () => toast.error("Couldn't save that note — try again."),
  });

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== (item.notes ?? "")) update.mutate(draft);
      }}
      rows={3}
      className="mt-2 box-border w-full resize-none rounded-[10px] px-3 py-2 text-[13px] outline-none"
      style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
    />
  );
}

/** One feed row — shared by the mobile list and the lg: desktop list
 * (item click behavior differs per caller: mobile navigates away, desktop
 * sets local selection state instead). `isSelected` (desktop's currently-
 * open note) and a linked-to-word note both get the same accent-tinted
 * card treatment already used for "current/active" state elsewhere (e.g.
 * Dashboard.tsx's next-task card). */
function NoteRow({
  row,
  isOpen,
  isSelected = false,
  onOpen,
  onChanged,
}: {
  row: FeedRow;
  isOpen: boolean;
  isSelected?: boolean;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const skill = rowSkill(row);
  const preview = rowPreview(row);
  const isLinked = row.source === "note" && row.item.wordId !== null;
  const highlight = isSelected || isLinked;
  return (
    <div
      className="rounded-xl p-[13px]"
      style={{
        background: highlight ? "linear-gradient(160deg,#2b2741,#232532)" : "#1c1f2c",
        boxShadow: highlight ? "0 0 0 1px #423a6a" : "none",
      }}
    >
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={onOpen}>
        <NotePencil size={16} weight="regular" style={{ color: "#796cbf", marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#20222f", color: "rgba(233,233,237,.6)" }}>
              {SOURCE_LABEL[row.source]}
            </span>
            {skill && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#20222f", color: "rgba(233,233,237,.6)" }}>
                {SKILL_LABELS[skill]}
              </span>
            )}
          </div>
          <p className="mt-1 text-[14.5px] font-medium">{rowTitle(row)}</p>
          {preview && <p className="mt-0.5 text-[11.5px] leading-[1.45]" style={{ color: "rgba(233,233,237,.5)" }}>{preview}</p>}
          <p className="mt-[5px] text-[10px]" style={{ color: "rgba(233,233,237,.32)" }}>{rowMeta(row)}</p>
        </div>
      </button>
      {isOpen && row.source === "notebook" && <NotebookEditor item={row.item} onChanged={onChanged} />}
      {isOpen && row.source === "unit" && <UnitNoteEditor item={row.item} onChanged={onChanged} />}
    </div>
  );
}

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "all", label: "all" },
  { key: "mine", label: "my notes" },
  { key: "surfaced", label: "surfaced" },
];

export default function Notes() {
  const { push, goBack, backLabel } = useNavStack();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed() });
  const [bucket, setBucket] = useState<Bucket>("all");
  const [skillFilter, setSkillFilter] = useState<RoadmapSkill | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<RoadmapJournalTask | null>(null);
  // lg: master-detail selection — a "note"-source row's real id, or "new";
  // journal/notebook/unit rows still use their own inline/drawer handling
  // below, unchanged from mobile.
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const invalidate = () => invalidateHub(queryClient);
  const onNavigate = (d: Destination) => push(d === "sources" ? "/plan/sources" : "/plan");

  const rows: FeedRow[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.notes.map((item): FeedRow => ({ key: `note:${item.id}`, source: "note", item })),
      ...data.taskJournals.map((item): FeedRow => ({ key: `journal:${item.id}`, source: "journal", item })),
      ...data.grammarNotebook.map((item): FeedRow => ({ key: `notebook:${item.id}`, source: "notebook", item })),
      ...data.sourceNotes.map((item): FeedRow => ({ key: `unit:${item.id}`, source: "unit", item })),
    ];
  }, [data]);

  const skillCounts = useMemo(() => {
    const counts: Partial<Record<RoadmapSkill, number>> = {};
    for (const row of rows) {
      const s = rowSkill(row);
      if (s) counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = rows.filter((row) => {
    if (bucket === "mine" && row.source !== "note") return false;
    if (bucket === "surfaced" && row.source === "note") return false;
    // source-unit notes have no skill to filter by — always shown, regardless
    if (skillFilter && row.source !== "unit" && rowSkill(row) !== skillFilter) return false;
    return true;
  });

  if (isLoading || !data) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#161826" }} />;
  }

  const linkedCount = data.notes.filter((n) => n.wordId !== null).length;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+90px)] lg:hidden"
      style={{ background: "#161826" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <button type="button" onClick={goBack} className="flex items-center gap-[3px] text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
            <CaretLeft size={14} weight="regular" aria-hidden="true" />
            {backLabel}
          </button>
          <div className="mt-2 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            Notes
          </div>
          <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {data.notes.length} notes{linkedCount > 0 ? ` · ${linkedCount} linked to words` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => push("/plan/notes/edit/new")}
          className="flex shrink-0 items-center gap-[6px] rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-white"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          <Plus size={16} weight="regular" aria-hidden="true" />
          New
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBucket(b.key)}
            className="rounded-full px-2.5 py-1 text-[11.5px] capitalize"
            style={{
              background: bucket === b.key ? "rgba(145,132,217,.22)" : "#20222f",
              color: bucket === b.key ? "#d2cefd" : "rgba(233,233,237,.6)",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSkillFilter(null)}
          className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
          style={{
            background: skillFilter === null ? "rgba(145,132,217,.22)" : "#20222f",
            color: skillFilter === null ? "#d2cefd" : "rgba(233,233,237,.6)",
          }}
        >
          all
        </button>
        {ALL_SKILLS.filter((s) => skillCounts[s]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSkillFilter(skillFilter === s ? null : s)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
            style={{
              background: skillFilter === s ? "rgba(145,132,217,.22)" : "#20222f",
              color: skillFilter === s ? "#d2cefd" : "rgba(233,233,237,.6)",
            }}
          >
            {SKILL_LABELS[s]} {skillCounts[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 px-6 text-center">
          <NotePencil size={28} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
          <p className="text-[14px] font-medium">{bucket !== "all" || skillFilter ? "No notes match these filters" : "No notes yet"}</p>
          <p className="text-[12px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {bucket !== "all" || skillFilter ? "Try a different bucket or skill." : "Tap New to write one, or check back after your next lesson."}
          </p>
          {(bucket !== "all" || skillFilter) && (
            <button
              type="button"
              onClick={() => {
                setBucket("all");
                setSkillFilter(null);
              }}
              className="mt-1 text-[12.5px] font-medium"
              style={{ color: "#b5abfc" }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col gap-[9px]">
          {filtered.map((row) => (
            <NoteRow
              key={row.key}
              row={row}
              isOpen={expanded === row.key}
              onOpen={() => {
                if (row.source === "journal") setOpenTask(row.item);
                else if (row.source === "note") push(`/plan/notes/edit/${row.item.id}`);
                else setExpanded(expanded === row.key ? null : row.key);
              }}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}
    </div>

    {/* lg+: real desktop layout — notes list | selected note's editor,
        master-detail (the same pattern Vocabulary.tsx's word list +
        embedded WordDetailContent, and SyllabusSourcesDesktop.tsx's
        station list + detail column, already use), matching Dashboard's
        grid+gap spacing instead of the old "just recenter the mobile
        column in a bordered card" lg: treatment this replaces. Selecting
        or creating a note updates selectedNoteId locally — no navigation,
        so the list and editor share one window, per an explicit user
        decision (simpler than a modal-over-dimmed-background, and doesn't
        need React Router's background-location pattern). */}
    <div className="hidden min-h-0 lg:mx-auto lg:my-8 lg:grid lg:h-full lg:max-w-[1040px] lg:grid-cols-[1fr_420px] lg:gap-5">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[22px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
              Notes
            </div>
            <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {data.notes.length} notes{linkedCount > 0 ? ` · ${linkedCount} linked to words` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedNoteId("new")}
            className="flex shrink-0 items-center gap-[6px] rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <Plus size={16} weight="regular" aria-hidden="true" />
            New
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {BUCKETS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBucket(b.key)}
              className="rounded-full px-2.5 py-1 text-[11.5px] capitalize"
              style={{
                background: bucket === b.key ? "rgba(145,132,217,.22)" : "#20222f",
                color: bucket === b.key ? "#d2cefd" : "rgba(233,233,237,.6)",
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSkillFilter(null)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
            style={{
              background: skillFilter === null ? "rgba(145,132,217,.22)" : "#20222f",
              color: skillFilter === null ? "#d2cefd" : "rgba(233,233,237,.6)",
            }}
          >
            all
          </button>
          {ALL_SKILLS.filter((s) => skillCounts[s]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkillFilter(skillFilter === s ? null : s)}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              style={{
                background: skillFilter === s ? "rgba(145,132,217,.22)" : "#20222f",
                color: skillFilter === s ? "#d2cefd" : "rgba(233,233,237,.6)",
              }}
            >
              {SKILL_LABELS[s]} {skillCounts[s]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 px-6 text-center">
            <NotePencil size={28} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
            <p className="text-[14px] font-medium">{bucket !== "all" || skillFilter ? "No notes match these filters" : "No notes yet"}</p>
            <p className="text-[12px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {bucket !== "all" || skillFilter ? "Try a different bucket or skill." : "Click New to write one, or check back after your next lesson."}
            </p>
            {(bucket !== "all" || skillFilter) && (
              <button
                type="button"
                onClick={() => {
                  setBucket("all");
                  setSkillFilter(null);
                }}
                className="mt-1 text-[12.5px] font-medium"
                style={{ color: "#b5abfc" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-[9px] overflow-y-auto pb-2">
            {filtered.map((row) => (
              <NoteRow
                key={row.key}
                row={row}
                isOpen={expanded === row.key}
                isSelected={row.source === "note" && selectedNoteId === row.item.id}
                onOpen={() => {
                  if (row.source === "journal") setOpenTask(row.item);
                  else if (row.source === "note") setSelectedNoteId(row.item.id);
                  else setExpanded(expanded === row.key ? null : row.key);
                }}
                onChanged={invalidate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 overflow-hidden rounded-[20px]" style={{ background: "#1c1f2c" }}>
        {selectedNoteId ? (
          <NoteEditorContent
            key={selectedNoteId}
            id={selectedNoteId}
            embedded
            onClose={() => setSelectedNoteId(null)}
            onCreated={(id) => setSelectedNoteId(id)}
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-[13px]" style={{ color: "rgba(233,233,237,.4)" }}>
            Select a note, or create a new one.
          </div>
        )}
      </div>
    </div>

    {openTask && <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </>
  );
}

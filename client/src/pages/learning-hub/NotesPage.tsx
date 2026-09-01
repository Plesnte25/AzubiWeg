import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookText, Plus } from "lucide-react";
import { api } from "../../api/client";
import type { Note, RoadmapJournalTask, RoadmapSkill, SurfacedNotebookEntry, SurfacedUnitNote } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import { NoteComposer } from "../../components/notes/NoteComposer";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { Button } from "../../components/ui/Button";
import { CircleIconButton } from "../../components/ui/CircleIconButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Skeleton } from "../../components/ui/Skeleton";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { cn } from "../../lib/cn";
import { SKILL_LABELS } from "../../lib/skills";
import { stripHtml } from "../../lib/text";
import type { Destination } from "./destinations";
import { invalidateHub } from "./queryHelpers";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

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

/** Plain-text preview body for the collapsed row — Note.body is Tiptap HTML,
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
      return row.item.skill;
    case "notebook":
      return row.item.skill;
    case "unit":
      return null;
  }
}

function rowSubtitle(row: FeedRow): string | null {
  switch (row.source) {
    case "note":
      return null;
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
    <div className="mt-2">
      <Textarea
        variant="ghost"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== item.body) update.mutate(draft);
        }}
        footer={
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
        }
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
    <div className="mt-2">
      <Textarea
        variant="ghost"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== (item.notes ?? "")) update.mutate(draft);
        }}
      />
    </div>
  );
}

export function NotesPage({ onNavigate }: { onNavigate: (d: Destination) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed() });
  const [bucket, setBucket] = useState<Bucket>("all");
  const [skillFilter, setSkillFilter] = useState<RoadmapSkill | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<RoadmapJournalTask | null>(null);

  const invalidate = () => invalidateHub(queryClient);

  const rows: FeedRow[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.notes.map((item): FeedRow => ({ key: `note:${item.id}`, source: "note", item })),
      ...data.taskJournals.map((item): FeedRow => ({ key: `journal:${item.id}`, source: "journal", item })),
      ...data.grammarNotebook.map((item): FeedRow => ({ key: `notebook:${item.id}`, source: "notebook", item })),
      ...data.sourceNotes.map((item): FeedRow => ({ key: `unit:${item.id}`, source: "unit", item })),
    ];
  }, [data]);

  const filtered = rows.filter((row) => {
    if (bucket === "mine" && row.source !== "note") return false;
    if (bucket === "surfaced" && row.source === "note") return false;
    // source-unit notes have no skill to filter by — always shown, regardless
    if (skillFilter && row.source !== "unit" && rowSkill(row) !== skillFilter) return false;
    return true;
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const surfacedCount = data.taskJournals.length + data.grammarNotebook.length + data.sourceNotes.length;

  return (
    <div className="space-y-3.5">
      <div className="animate-enter flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-title font-bold">Notes</h1>
          <p className="text-body text-ink-600">
            {data.notes.length} of your own · {surfacedCount} from lessons
          </p>
        </div>
        <SegmentedControl
          value={bucket}
          onChange={setBucket}
          options={[
            { key: "all", label: "All" },
            { key: "mine", label: "My notes" },
            { key: "surfaced", label: "Surfaced" },
          ]}
        />
      </div>

      <div className="animate-enter flex flex-nowrap gap-1.5 overflow-x-auto pb-1" style={{ animationDelay: "45ms" }}>
        <button
          onClick={() => setSkillFilter(null)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold transition-colors",
            skillFilter === null ? "bg-brand-600 text-white" : "bg-paper text-ink-600 hover:text-ink-900",
          )}
        >
          All skills
        </button>
        {ALL_SKILLS.map((s) => (
          <button
            key={s}
            onClick={() => setSkillFilter(skillFilter === s ? null : s)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold transition-colors",
              skillFilter === s ? "bg-brand-600 text-white" : "bg-paper text-ink-600 hover:text-ink-900",
            )}
          >
            {SKILL_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="animate-enter" style={{ animationDelay: "90ms" }}>
        <NoteComposer
          onCreated={(id) => {
            invalidate();
            setExpanded(`note:${id}`);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          title={bucket !== "all" || skillFilter ? "No notes match these filters" : "No notes yet"}
          description={
            bucket !== "all" || skillFilter ? "Try a different bucket or skill." : "Write one above, or check back after your next lesson."
          }
          action={
            (bucket !== "all" || skillFilter) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBucket("all");
                  setSkillFilter(null);
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="animate-enter divide-y divide-hairline rounded-xl border border-hairline bg-card" style={{ animationDelay: "135ms" }}>
          {filtered.map((row) => {
            const isOpen = expanded === row.key;
            const skill = rowSkill(row);
            const preview = rowPreview(row);
            const subtitle = rowSubtitle(row);
            return (
              <div key={row.key} className="px-4 py-2.5">
                <button
                  className="flex w-full items-start gap-2.5 text-left"
                  onClick={() => (row.source === "journal" ? setOpenTask(row.item) : setExpanded(isOpen ? null : row.key))}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-paper px-2 py-0.5 text-micro font-semibold text-ink-600">
                        {SOURCE_LABEL[row.source]}
                      </span>
                      {skill && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-micro font-semibold text-ink-600">
                          {SKILL_LABELS[skill]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-body font-medium">{rowTitle(row)}</p>
                    {subtitle && <p className="text-caption text-ink-400">{subtitle}</p>}
                    {!isOpen && preview && <p className="mt-0.5 truncate text-caption text-ink-400">{preview}</p>}
                  </div>
                </button>
                {isOpen && row.source === "note" && <NoteEditor note={row.item} onChanged={invalidate} />}
                {isOpen && row.source === "notebook" && <NotebookEditor item={row.item} onChanged={invalidate} />}
                {isOpen && row.source === "unit" && <UnitNoteEditor item={row.item} onChanged={invalidate} />}
              </div>
            );
          })}
        </div>
      )}

      {openTask && <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} onNavigate={onNavigate} />}
    </div>
  );
}

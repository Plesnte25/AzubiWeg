import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  NotebookText,
  PenLine,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  CefrLevel,
  LevelState,
  RoadmapSkill,
  StudySource,
  StudySourceUnit,
  StudySourceType,
  SyllabusCategory,
  SyllabusItem,
} from "../../api/types";
import { api } from "../../api/client";
import { Attachments } from "../../components/Attachments";
import FillBar from "../../components/FillBar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { levelStates } from "../../lib/levels";
import { nicosWegCourseIdFromUrl } from "../../lib/nicosweg";
import { RESOURCES } from "../../lib/resources";
import {
  youTubePlaylistIdFromUrl,
  youTubeThumbUrl,
  youTubeVideoIdFromUrl,
  youTubeWatchUrl,
} from "../../lib/youtube";

export const LEVEL_LABELS: Record<CefrLevel, string> = { a1: "A1", a2: "A2", b1: "B1" };

const CATEGORY_LABELS: Record<SyllabusCategory, string> = {
  grammar: "Grammar",
  vocab_theme: "Vocabulary themes",
  skill: "Skills",
};
const CATEGORY_ORDER: SyllabusCategory[] = ["grammar", "vocab_theme", "skill"];

const SOURCE_TYPES: { key: StudySourceType; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "nicos_weg", label: "Nicos Weg" },
  { key: "duolingo", label: "Duolingo" },
  { key: "other", label: "Other" },
];

export function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-brand-600 bg-brand-600 text-white" : "border-hairline text-ink-600 hover:bg-paper hover:text-ink-900"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Syllabus ──

export function SyllabusSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "syllabus"],
    queryFn: api.learningSyllabus,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>
    );
  }
  const levels = data?.levels ?? [];
  const items = data?.items ?? [];
  const states = levelStates(levels);

  return (
    <div className="space-y-4">
      {levels.map((lvl, i) => {
        const state: LevelState = states[i] ?? "locked";
        const inLevel = items.filter((it) => it.level === lvl.level);

        return (
          <details
            key={lvl.level}
            className="rounded-xl border border-hairline bg-card"
            open={state === "active"}
          >
            <summary className="cursor-pointer select-none space-y-2 rounded-xl p-4 hover:bg-paper">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  {LEVEL_LABELS[lvl.level]}
                  {state === "done" && (
                    <span className="flex items-center gap-1 text-ok-600">
                      <CheckCircle2 className="size-4" aria-hidden="true" /> complete
                    </span>
                  )}
                  {state === "active" && <Badge variant="brand">current level</Badge>}
                </span>
                <span className="text-sm text-ink-600">
                  {lvl.done} of {lvl.total} · {lvl.percent}%
                </span>
              </div>
              <FillBar percent={lvl.percent} />
              {state === "active" && lvl.nextUp && (
                <p className="text-sm text-ink-600">
                  Next up: <span className="font-medium text-ink-900">{lvl.nextUp.title}</span>
                </p>
              )}
            </summary>
            <div className="space-y-5 border-t border-hairline p-4">
              {CATEGORY_ORDER.map((cat) => {
                const catItems = inLevel.filter((it) => it.category === cat);
                if (catItems.length === 0) return null;
                // group subtopics under their theme, preserving seed order
                const themes: { theme: string; items: SyllabusItem[] }[] = [];
                for (const item of catItems) {
                  const theme = item.theme ?? "";
                  const last = themes[themes.length - 1];
                  if (last && last.theme === theme) last.items.push(item);
                  else themes.push({ theme, items: [item] });
                }
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    {themes.map(({ theme, items: themeItems }) => {
                      const done = themeItems.filter((it) => it.completedAt !== null).length;
                      const allDone = done === themeItems.length;
                      return (
                        <div key={theme || themeItems[0].id} className="space-y-0.5">
                          {theme && (
                            <p className="flex items-baseline gap-2 px-2 text-sm font-medium">
                              {theme}
                              <span className={`flex items-center gap-1 text-xs ${allDone ? "text-ok-600" : "text-ink-400"}`}>
                                {done}/{themeItems.length}
                                {allDone && <CheckCircle2 className="size-3" aria-hidden="true" />}
                              </span>
                            </p>
                          )}
                          {themeItems.map((item) => (
                            <SyllabusRow key={item.id} item={item} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

const NOTEBOOK_FIELDS = [
  { key: "examples", label: "Examples", placeholder: "Your own example sentences, one per line…" },
  { key: "exceptions", label: "Exceptions", placeholder: "Exceptions to watch for…" },
  { key: "commonMistakes", label: "Common mistakes", placeholder: "Mistakes you keep making…" },
] as const;

/** Grammar Notebook: collapsible notes panel for grammar-category items only. */
function GrammarNotebook({ item, onChanged }: { item: SyllabusItem; onChanged: () => void }) {
  const [drafts, setDrafts] = useState({
    examples: item.examples ?? "",
    exceptions: item.exceptions ?? "",
    commonMistakes: item.commonMistakes ?? "",
  });
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.updateSyllabusNotebook>[1]) => api.updateSyllabusNotebook(item.id, data),
    onSuccess: onChanged,
  });

  return (
    <details className="mt-1 rounded-lg border border-hairline bg-paper">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-600">
        <NotebookText className="size-3.5" aria-hidden="true" /> Notebook
      </summary>
      <div className="space-y-2 p-2.5 pt-0">
        {NOTEBOOK_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-medium text-ink-600">{f.label}</label>
            <textarea
              className="mt-0.5 w-full rounded-lg border border-hairline bg-card px-2 py-1.5 text-sm"
              rows={2}
              placeholder={f.placeholder}
              value={drafts[f.key]}
              onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
              onBlur={() => {
                if (drafts[f.key] !== (item[f.key] ?? "")) {
                  update.mutate({ [f.key]: drafts[f.key] || null });
                }
              }}
            />
          </div>
        ))}
      </div>
    </details>
  );
}

function SyllabusRow({ item }: { item: SyllabusItem }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["learning", "syllabus"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.toggleSyllabusItem(item.id, completed),
    onSuccess: invalidate,
  });
  const done = item.completedAt !== null;

  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-paper">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-1 accent-brand-500"
            checked={done}
            onChange={(e) => toggle.mutate(e.target.checked)}
          />
          <span className="min-w-0">
            <span className={`font-medium ${done ? "text-ink-400 line-through" : ""}`}>
              {item.title}
            </span>
            {item.roadmapDayOffset !== null && (
              <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs text-ink-400">
                Scheduled → Day {item.roadmapDayOffset + 1}
              </span>
            )}
            {item.description && (
              <span className="block text-sm text-ink-600">{item.description}</span>
            )}
          </span>
        </label>
        <div className="shrink-0 pt-0.5">
          <Attachments
            files={item.files}
            parent={{ syllabusItemId: item.id }}
            onChanged={invalidate}
          />
        </div>
      </div>
      {item.category === "grammar" && <GrammarNotebook item={item} onChanged={invalidate} />}
    </div>
  );
}

// ── Study sources ──

export function SourcesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "sources"],
    queryFn: api.learningSources,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>
    );
  }
  const sources = data?.sources ?? [];

  return (
    <div className="space-y-3">
      {sources.length === 0 && (
        <p className="text-sm text-ink-600">
          Register the things you learn from — paste a YouTube playlist and the lesson list fills
          itself in; Nicos Weg or Duolingo work with a manual lesson count.
        </p>
      )}
      {sources.map((s) => (
        <SourceCard key={s.id} source={s} />
      ))}
      <AddSourceForm />
    </div>
  );
}

function sourceThumbVideoId(source: StudySource): string | null {
  const first = source.units.find((u) => u.videoId);
  if (first?.videoId) return first.videoId;
  return source.url ? youTubeVideoIdFromUrl(source.url) : null;
}

function SourceCard({ source }: { source: StudySource }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["learning", "sources"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const [editing, setEditing] = useState(false);
  const [showLessons, setShowLessons] = useState(false);

  const logProgress = useMutation({
    mutationFn: (delta: number) => api.logSourceProgress(source.id, delta),
    onSuccess: invalidate,
  });
  const toggleUnit = useMutation({
    mutationFn: ({ unitId, done }: { unitId: string; done: boolean }) =>
      api.toggleSourceUnit(source.id, unitId, done),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteStudySource(source.id),
    onSuccess: invalidate,
  });

  const typeLabel = SOURCE_TYPES.find((t) => t.key === source.type)?.label ?? "Other";
  const hasUnits = source.units.length > 0;
  const atTotal = source.totalUnits !== null && source.completedUnits >= source.totalUnits;
  const thumbId = sourceThumbVideoId(source);
  const playlistId = source.url ? youTubePlaylistIdFromUrl(source.url) : null;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        {thumbId && (
          <img
            src={youTubeThumbUrl(thumbId)}
            alt=""
            className="h-16 w-28 shrink-0 rounded-lg border border-hairline object-cover"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{typeLabel}</Badge>
            {source.level && <Badge variant="brand">{LEVEL_LABELS[source.level]}</Badge>}
            {source.url ? (
              <a
                className="font-medium hover:text-brand-700 hover:underline"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
            ) : (
              <span className="font-medium">{source.title}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-ink-600">
            {source.totalUnits !== null
              ? `${source.completedUnits} of ${source.totalUnits} lessons`
              : `${source.completedUnits} lessons done`}
            {source.percent !== null && ` · ${source.percent}%`}
            {atTotal && (
              <span className="flex items-center gap-1 text-ok-600">
                · finished <CheckCircle2 className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </p>
          {source.percent !== null && <FillBar percent={source.percent} />}
          {source.notes && <p className="text-sm text-ink-600">{source.notes}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasUnits ? (
            <Button size="sm" onClick={() => setShowLessons((v) => !v)}>
              {showLessons ? "Hide lessons" : "Lessons"}
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={logProgress.isPending || atTotal} onClick={() => logProgress.mutate(1)}>
                +1 lesson
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Undo one lesson"
                disabled={logProgress.isPending || source.completedUnits === 0}
                onClick={() => logProgress.mutate(-1)}
              >
                −1
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
            leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
            onClick={() => {
              if (confirm(`Delete "${source.title}"${source.files.length ? " and its files" : ""}?`)) {
                remove.mutate();
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {hasUnits && showLessons && (
        <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-lg border border-hairline bg-paper p-2">
          {source.units.map((unit) => (
            <UnitRow
              key={unit.id}
              sourceId={source.id}
              unit={unit}
              playlistId={playlistId}
              onToggle={(done) => toggleUnit.mutate({ unitId: unit.id, done })}
            />
          ))}
        </div>
      )}

      {editing && (
        <SourceForm
          initial={source}
          onSaved={() => {
            setEditing(false);
            invalidate();
          }}
        />
      )}
      <Attachments files={source.files} parent={{ studySourceId: source.id }} onChanged={invalidate} />
    </Card>
  );
}

function UnitRow({
  sourceId,
  unit,
  playlistId,
  onToggle,
}: {
  sourceId: string;
  unit: StudySourceUnit;
  playlistId: string | null;
  onToggle: (done: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const done = unit.completedAt !== null;
  const lessonUrl = unit.videoId ? youTubeWatchUrl(unit.videoId, playlistId) : unit.url;

  const saveNotes = useMutation({
    mutationFn: (notes: string | null) => api.updateUnitNotes(sourceId, unit.id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learning", "sources"] }),
  });

  return (
    <div className="rounded px-2 py-1 hover:bg-card">
      <div className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          className="accent-brand-500"
          checked={done}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className={`min-w-0 flex-1 truncate ${done ? "text-ink-400 line-through" : ""}`}>
          {unit.title}
        </span>
        <button
          className={`flex shrink-0 items-center gap-0.5 text-xs ${unit.notes ? "text-brand-700" : "text-ink-400"} hover:text-brand-700`}
          title={unit.notes ? "Edit notes" : "Add notes for this lesson"}
          onClick={() => setEditingNotes((v) => !v)}
        >
          <PenLine className="size-3" aria-hidden="true" />
          {!unit.notes && "+"}
        </button>
        {lessonUrl && (
          <a
            className="flex shrink-0 items-center gap-0.5 text-xs text-ink-400 hover:text-brand-700"
            href={lessonUrl}
            target="_blank"
            rel="noreferrer"
            title={unit.videoId ? "Open on YouTube" : "Open lesson"}
          >
            {unit.videoId ? (
              <>
                <PlayCircle className="size-3" aria-hidden="true" /> watch
              </>
            ) : (
              <>
                <ExternalLink className="size-3" aria-hidden="true" /> open
              </>
            )}
          </a>
        )}
      </div>
      {!editingNotes && unit.notes && (
        <p
          className="ml-7 cursor-pointer whitespace-pre-wrap py-0.5 text-xs text-ink-600"
          title="Click to edit"
          onClick={() => setEditingNotes(true)}
        >
          {unit.notes}
        </p>
      )}
      {editingNotes && (
        <textarea
          autoFocus
          className="ml-7 mt-1 block w-[calc(100%-1.75rem)] rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs"
          rows={3}
          placeholder="Notes for this lesson — key vocab, questions, anything…"
          defaultValue={unit.notes ?? ""}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value !== (unit.notes ?? "")) saveNotes.mutate(value || null);
            setEditingNotes(false);
          }}
        />
      )}
    </div>
  );
}

function AddSourceForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setOpen(true)}>
        Add study source
      </Button>
    );
  }
  return (
    <Card>
      <SourceForm
        onSaved={() => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ["learning", "sources"] });
        }}
      />
    </Card>
  );
}

function SourceForm({ initial, onSaved }: { initial?: StudySource; onSaved: () => void }) {
  const [type, setType] = useState<StudySourceType>(initial?.type ?? "youtube");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [level, setLevel] = useState<CefrLevel | "">(initial?.level ?? "");
  const [totalUnits, setTotalUnits] = useState(initial?.totalUnits?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPlaylist = !initial && youTubePlaylistIdFromUrl(url) !== null;
  const isCourse = !initial && nicosWegCourseIdFromUrl(url) !== null;
  const autoFetches = isPlaylist || isCourse;

  const save = useMutation({
    mutationFn: () => {
      const data = {
        type,
        title: title.trim(),
        url: url.trim() || null,
        level: level || null,
        totalUnits: totalUnits ? Number(totalUnits) : null,
        notes: notes.trim() || null,
      };
      return initial
        ? api.updateStudySource(initial.id, data)
        : api.addStudySource({ ...data, autoFetch: true });
    },
    onSuccess: (result) => {
      if (!initial && "fetch" in result && result.fetch === "failed") {
        setNotice(
          "Couldn't read the playlist from YouTube — the source was saved without a lesson list. Set a lesson count via Edit instead.",
        );
        onSaved();
        return;
      }
      onSaved();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() || autoFetches) save.mutate();
      }}
    >
      <select
        className="rounded border border-hairline bg-paper px-2 py-1.5 text-sm"
        value={type}
        onChange={(e) => setType(e.target.value as StudySourceType)}
      >
        {SOURCE_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        className="rounded border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400"
        placeholder={autoFetches ? "Title (optional — taken from the source)" : "Title (e.g. Learn German playlist)"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="rounded border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400 sm:col-span-2"
        placeholder="URL (YouTube playlist or Nicos Weg course — lessons are fetched automatically)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {isPlaylist && (
        <p className="flex items-center gap-1.5 text-xs text-brand-700 sm:col-span-2">
          <PlayCircle className="size-3.5" aria-hidden="true" />
          YouTube playlist detected — the lesson list will be fetched automatically (first ~100 videos).
        </p>
      )}
      {isCourse && (
        <p className="flex items-center gap-1.5 text-xs text-brand-700 sm:col-span-2">
          <BookOpen className="size-3.5" aria-hidden="true" />
          Nicos Weg course detected — the lesson list will be fetched from DW automatically.
        </p>
      )}
      <div className="flex gap-2">
        <select
          className="flex-1 rounded border border-hairline bg-paper px-2 py-1.5 text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value as CefrLevel | "")}
        >
          <option value="">Level (optional)</option>
          {(["a1", "a2", "b1"] as const).map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
        {!autoFetches && (
          <input
            type="number"
            min={1}
            className="w-32 rounded border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400"
            placeholder="# lessons"
            title="Total lessons/units — leave empty for open-ended"
            value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)}
          />
        )}
      </div>
      <input
        className="rounded border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400 sm:col-span-2"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-sm text-danger-600 sm:col-span-2">{error}</p>}
      {notice && <p className="text-sm text-brand-700 sm:col-span-2">{notice}</p>}
      <div className="sm:col-span-2">
        <Button disabled={(!title.trim() && !autoFetches) || save.isPending} loading={save.isPending}>
          {initial ? "Save changes" : autoFetches ? "Add & fetch lessons" : "Add source"}
        </Button>
      </div>
    </form>
  );
}

// ── Resources ──

const RESOURCE_SKILL_LABEL: Record<RoadmapSkill, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  bureaucracy: "Deutschland Context",
  milestone: "Exams",
  reflection: "Reflection",
};

const RESOURCE_SKILLS: RoadmapSkill[] = [
  "grammar",
  "vocab",
  "listening",
  "speaking",
  "writing",
  "reading",
  "bureaucracy",
  "milestone",
];

export function ResourcesSection() {
  const [filter, setFilter] = useState<RoadmapSkill | "all">("all");
  const visible = filter === "all" ? RESOURCES : RESOURCES.filter((r) => r.skill === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterPill>
        {RESOURCE_SKILLS.map((s) => (
          <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>
            {RESOURCE_SKILL_LABEL[s]}
          </FilterPill>
        ))}
      </div>
      <div className="divide-y divide-hairline rounded-xl border border-hairline bg-card">
        {visible.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target={r.url.startsWith("/") ? undefined : "_blank"}
            rel={r.url.startsWith("/") ? undefined : "noreferrer"}
            className="block px-4 py-3 hover:bg-paper"
          >
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-brand-700 hover:underline">{r.title}</span>
              <Badge>{RESOURCE_SKILL_LABEL[r.skill]}</Badge>
            </span>
            {r.note && <span className="mt-0.5 block text-sm text-ink-600">{r.note}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

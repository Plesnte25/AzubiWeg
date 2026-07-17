import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, downloadFile, fetchFileBlobUrl, uploadFile } from "../api/client";
import type {
  CefrLevel,
  LevelState,
  SessionQuestion,
  StudySource,
  StudySourceUnit,
  StudySourceType,
  SyllabusCategory,
  SyllabusItem,
  TopicBreakdown,
  UploadedFileMeta,
} from "../api/types";
import FillBar from "../components/FillBar";
import { levelStates } from "../lib/levels";
import { nicosWegCourseIdFromUrl } from "../lib/nicosweg";
import { isAnswerAccepted } from "../lib/quiz";
import {
  youTubePlaylistIdFromUrl,
  youTubeThumbUrl,
  youTubeVideoIdFromUrl,
  youTubeWatchUrl,
} from "../lib/youtube";

const LEVEL_LABELS: Record<CefrLevel, string> = { a1: "A1", a2: "A2", b1: "B1" };

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

const SECTIONS = [
  { key: "syllabus", label: "Syllabus" },
  { key: "sources", label: "Study sources" },
  { key: "tests", label: "Self-tests" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

export default function Learning() {
  const [section, setSection] = useState<Section>("syllabus");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Learning</h1>
          <p className="text-sm text-ink-600">
            Your German roadmap: one level at a time, lessons from your own sources, and tests that
            adapt to you.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-hairline bg-card p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                section === s.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper"
              }`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === "syllabus" && <SyllabusSection />}
      {section === "sources" && <SourcesSection />}
      {section === "tests" && <TestsSection />}
    </div>
  );
}

/** Image chips render a thumbnail; parsed files expose their extracted text. */
function FileChip({ file, onChanged }: { file: UploadedFileMeta; onChanged: () => void }) {
  const [showText, setShowText] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const removeFile = useMutation({ mutationFn: api.deleteFile, onSuccess: onChanged });
  const isImage = file.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let url: string | null = null;
    let cancelled = false;
    fetchFileBlobUrl(file.id).then((u) => {
      if (cancelled) URL.revokeObjectURL(u);
      else {
        url = u;
        setThumb(u);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage]);

  return (
    <div className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-2 py-0.5 text-xs">
        {isImage && thumb && (
          <img src={thumb} alt="" className="size-8 rounded object-cover" />
        )}
        <button
          className="max-w-48 truncate hover:text-brand-600 hover:underline"
          title={`Download ${file.originalName}`}
          onClick={() => downloadFile(file.id, file.originalName)}
        >
          {file.originalName}
        </button>
        {file.extractionStatus === "pending" && (
          <span className="animate-pulse text-ink-400">parsing…</span>
        )}
        {file.extractionStatus === "failed" && (
          <span className="text-ink-400" title="No text could be extracted">
            no text found
          </span>
        )}
        {file.extractionStatus === "done" && file.extractedText && (
          <button
            className="rounded bg-brand-100 px-1.5 text-brand-600 hover:bg-brand-200"
            onClick={() => setShowText((v) => !v)}
          >
            {showText ? "hide text" : "text"}
          </button>
        )}
        <button
          className="text-ink-400 hover:text-danger-600"
          title="Remove file"
          onClick={() => removeFile.mutate(file.id)}
        >
          ×
        </button>
      </span>
      {showText && file.extractedText && (
        <pre className="mt-1.5 max-h-56 max-w-xl overflow-auto whitespace-pre-wrap rounded-lg border border-hairline bg-paper p-3 text-xs text-ink-600">
          {file.extractedText}
        </pre>
      )}
    </div>
  );
}

function Attachments({
  files,
  parent,
  onChanged,
}: {
  files: UploadedFileMeta[];
  parent: { syllabusItemId?: string; studySourceId?: string };
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadFile(file, { kind: "document", ...parent });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {files.map((f) => (
        <FileChip key={f.id} file={f} onChanged={onChanged} />
      ))}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <button
        className="rounded border border-hairline px-2 py-0.5 text-xs text-ink-600 hover:bg-paper"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        title="Attach notes (PDF, photo, or .txt) — parsed to text automatically; OCR works best on printed text"
      >
        {uploading ? "Uploading…" : "+ notes"}
      </button>
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </div>
  );
}

/** True while any file on the queried entity is still being parsed. */
function anyPending(files: UploadedFileMeta[][]): boolean {
  return files.some((fs) => fs.some((f) => f.extractionStatus === "pending"));
}

// ── Syllabus (sequential roadmap) ──

function SyllabusSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "syllabus"],
    queryFn: api.learningSyllabus,
    refetchInterval: (query) =>
      anyPending((query.state.data?.items ?? []).map((i) => i.files)) ? 4000 : false,
  });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
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
                <span className="font-semibold">
                  {LEVEL_LABELS[lvl.level]}
                  {state === "done" && <span className="ml-2 text-ok-600">✓ complete</span>}
                  {state === "active" && (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600">
                      current level
                    </span>
                  )}
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
                      return (
                        <div key={theme || themeItems[0].id} className="space-y-0.5">
                          {theme && (
                            <p className="flex items-baseline gap-2 px-2 text-sm font-medium">
                              {theme}
                              <span className={`text-xs ${done === themeItems.length ? "text-ok-600" : "text-ink-400"}`}>
                                {done}/{themeItems.length}
                                {done === themeItems.length && " ✓"}
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

function SyllabusRow({ item }: { item: SyllabusItem }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["learning", "syllabus"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const toggle = useMutation({
    mutationFn: (completed: boolean) => api.toggleSyllabusItem(item.id, completed),
    onSuccess: invalidate,
  });
  const done = item.completedAt !== null;

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-paper">
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
  );
}

// ── Study sources ──

function SourcesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "sources"],
    queryFn: api.learningSources,
    refetchInterval: (query) =>
      anyPending((query.state.data?.sources ?? []).map((s) => s.files)) ? 4000 : false,
  });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
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
    <div className="space-y-3 rounded-xl border border-hairline bg-card p-4">
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
            <span className="rounded-full border border-hairline bg-paper px-2 py-0.5 text-xs">
              {typeLabel}
            </span>
            {source.level && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600">
                {LEVEL_LABELS[source.level]}
              </span>
            )}
            {source.url ? (
              <a
                className="font-medium hover:text-brand-600 hover:underline"
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
          <p className="text-sm text-ink-600">
            {source.totalUnits !== null
              ? `${source.completedUnits} of ${source.totalUnits} lessons`
              : `${source.completedUnits} lessons done`}
            {source.percent !== null && ` · ${source.percent}%`}
            {atTotal && " · finished ✓"}
          </p>
          {source.percent !== null && <FillBar percent={source.percent} />}
          {source.notes && <p className="text-sm text-ink-600">{source.notes}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasUnits ? (
            <button
              className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white"
              onClick={() => setShowLessons((v) => !v)}
            >
              {showLessons ? "Hide lessons" : "Lessons"}
            </button>
          ) : (
            <>
              <button
                className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={logProgress.isPending || atTotal}
                onClick={() => logProgress.mutate(1)}
              >
                +1 lesson
              </button>
              <button
                className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
                title="Undo one lesson"
                disabled={logProgress.isPending || source.completedUnits === 0}
                onClick={() => logProgress.mutate(-1)}
              >
                −1
              </button>
            </>
          )}
          <button
            className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            className="rounded border border-hairline px-2 py-1 text-xs text-ink-400 hover:text-danger-600"
            onClick={() => {
              if (confirm(`Delete "${source.title}"${source.files.length ? " and its files" : ""}?`)) {
                remove.mutate();
              }
            }}
          >
            Delete
          </button>
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
    </div>
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
          className={`shrink-0 text-xs ${unit.notes ? "text-brand-600" : "text-ink-400"} hover:text-brand-600`}
          title={unit.notes ? "Edit notes" : "Add notes for this lesson"}
          onClick={() => setEditingNotes((v) => !v)}
        >
          📝{unit.notes ? "" : " +"}
        </button>
        {lessonUrl && (
          <a
            className="shrink-0 text-xs text-ink-400 hover:text-brand-600"
            href={lessonUrl}
            target="_blank"
            rel="noreferrer"
            title={unit.videoId ? "Open on YouTube" : "Open lesson"}
          >
            {unit.videoId ? "▶ watch" : "↗ open"}
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
      <button
        className="rounded border border-hairline px-3 py-1.5 text-sm text-ink-600 hover:bg-paper"
        onClick={() => setOpen(true)}
      >
        + Add study source
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-hairline bg-card p-4">
      <SourceForm
        onSaved={() => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ["learning", "sources"] });
        }}
      />
    </div>
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
        <p className="text-xs text-brand-600 sm:col-span-2">
          ▶ YouTube playlist detected — the lesson list will be fetched automatically (first ~100
          videos).
        </p>
      )}
      {isCourse && (
        <p className="text-xs text-brand-600 sm:col-span-2">
          📖 Nicos Weg course detected — the lesson list will be fetched from DW automatically.
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
      {notice && <p className="text-sm text-brand-600 sm:col-span-2">{notice}</p>}
      <div className="sm:col-span-2">
        <button
          className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={(!title.trim() && !autoFetches) || save.isPending}
        >
          {save.isPending ? "Saving…" : initial ? "Save changes" : autoFetches ? "Add & fetch lessons" : "Add source"}
        </button>
      </div>
    </form>
  );
}

// ── Self-tests ──

interface AnswerRecord {
  qid: string;
  topic: string;
  level: CefrLevel;
  correct: boolean;
}

function TestsSection() {
  const [session, setSession] = useState<{ questions: SessionQuestion[]; level: CefrLevel } | null>(
    null,
  );

  return (
    <div className="space-y-6">
      {session ? (
        <TestRunner session={session} onDone={() => setSession(null)} />
      ) : (
        <TestLauncher onStart={setSession} />
      )}
      {!session && <TestHistory />}
    </div>
  );
}

function TestLauncher({
  onStart,
}: {
  onStart: (s: { questions: SessionQuestion[]; level: CefrLevel }) => void;
}) {
  const [size, setSize] = useState(12);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => api.startSelfTest({ size }),
    onSuccess: (data) => {
      setError(null);
      onStart(data);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not start the test"),
  });

  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-card p-4">
      <div>
        <h2 className="font-semibold">Test yourself</h2>
        <p className="text-sm text-ink-600">
          A mixed test built for your current level — grammar, real-life situations, and your own
          vocabulary. It adapts to your recent scores, never repeats recent questions, and never
          touches your review schedule.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-hairline bg-paper px-2 py-1.5 text-sm"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {[8, 12, 20].map((n) => (
            <option key={n} value={n}>
              {n} questions
            </option>
          ))}
        </select>
        <button
          className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? "Building…" : "Start test"}
        </button>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}

function TestRunner({
  session,
  onDone,
}: {
  session: { questions: SessionQuestion[]; level: CefrLevel };
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { questions } = session;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [phase, setPhase] = useState<"answering" | "feedback" | "finished">("answering");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const submit = useMutation({
    mutationFn: (records: AnswerRecord[]) => {
      const byTopic = new Map<string, TopicBreakdown>();
      for (const r of records) {
        const key = `${r.topic}|${r.level}`;
        const entry = byTopic.get(key) ?? { topic: r.topic, level: r.level, correct: 0, total: 0 };
        entry.total += 1;
        if (r.correct) entry.correct += 1;
        byTopic.set(key, entry);
      }
      return api.submitQuizResult({
        score: records.filter((r) => r.correct).length,
        total: records.length,
        kind: "mixed",
        level: session.level,
        questionIds: records.map((r) => r.qid),
        breakdown: [...byTopic.values()],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning", "quizResults"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const q = questions[index];

  function record(correct: boolean) {
    const next = [...answers, { qid: q.qid, topic: q.topic, level: q.level, correct }];
    setAnswers(next);
    setLastCorrect(correct);
    if (index === questions.length - 1) {
      setPhase("finished");
      submit.mutate(next);
    } else {
      setPhase("feedback");
    }
  }

  function advance() {
    setIndex(index + 1);
    setPicked(null);
    setDraft("");
    setPhase("answering");
  }

  if (phase === "finished") {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const entry = byTopic.get(a.topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.correct) entry.correct += 1;
      byTopic.set(a.topic, entry);
    }
    return (
      <div className="space-y-4 rounded-xl border border-hairline bg-card p-6 text-center">
        <p className="text-3xl font-semibold">
          {score} / {questions.length}
        </p>
        <p className="text-ink-600">
          {pct}% correct{pct === 100 ? " — perfekt!" : pct >= 80 ? " — sehr gut!" : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[...byTopic.entries()].map(([topic, t]) => (
            <span
              key={topic}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                t.correct === t.total
                  ? "border-ok-600 bg-ok-50 text-ok-600"
                  : t.correct === 0
                    ? "border-danger-600 bg-danger-50 text-danger-600"
                    : "border-hairline bg-paper text-ink-600"
              }`}
            >
              {topic} {t.correct}/{t.total}
            </span>
          ))}
        </div>
        <button className="rounded bg-ink-900 px-4 py-2 text-sm text-white" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  const answered = phase === "feedback";

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-card p-4">
      <div className="flex items-baseline justify-between text-sm text-ink-600">
        <span>
          Question {index + 1} of {questions.length}
          <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs uppercase">{q.level}</span>
          <span className="ml-1 text-xs text-ink-400">{q.topic}</span>
        </span>
        <span>
          Score {answers.filter((a) => a.correct).length}
          <button className="ml-3 text-ink-400 hover:text-danger-600" onClick={onDone}>
            Quit
          </button>
        </span>
      </div>

      <p className="text-xl font-semibold">{q.prompt}</p>

      {q.type === "mcq" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.choices.map((choice, i) => {
            let style = "border-hairline hover:bg-paper";
            if (answered) {
              if (i === q.answerIndex) style = "border-ok-600 bg-ok-50 text-ok-600";
              else if (i === picked) style = "border-danger-600 bg-danger-50 text-danger-600";
              else style = "border-hairline opacity-60";
            }
            return (
              <button
                key={i}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${style}`}
                disabled={answered}
                onClick={() => {
                  setPicked(i);
                  record(i === q.answerIndex);
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "true_false" && (
        <div className="grid max-w-md gap-2 sm:grid-cols-2">
          {[true, false].map((value) => {
            let style = "border-hairline hover:bg-paper";
            if (answered) {
              if (value === q.answer) style = "border-ok-600 bg-ok-50 text-ok-600";
              else if (picked === (value ? 1 : 0)) style = "border-danger-600 bg-danger-50 text-danger-600";
              else style = "border-hairline opacity-60";
            }
            return (
              <button
                key={String(value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${style}`}
                disabled={answered}
                onClick={() => {
                  setPicked(value ? 1 : 0);
                  record(value === q.answer);
                }}
              >
                {value ? "Richtig ✓" : "Falsch ✗"}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "fill_blank" && (
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || answered) return;
            record(isAnswerAccepted(draft, q.accepted));
          }}
        >
          <input
            autoFocus
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              answered
                ? lastCorrect
                  ? "border-ok-600 bg-ok-50"
                  : "border-danger-600 bg-danger-50"
                : "border-hairline bg-paper"
            }`}
            placeholder="Type your answer…"
            value={draft}
            disabled={answered}
            onChange={(e) => setDraft(e.target.value)}
          />
          {!answered && (
            <button className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white" disabled={!draft.trim()}>
              Check
            </button>
          )}
        </form>
      )}

      {answered && (
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${lastCorrect ? "text-ok-600" : "text-danger-600"}`}>
            {lastCorrect ? "Richtig!" : "Leider falsch."}
          </span>
          {!lastCorrect && q.type === "fill_blank" && (
            <span className="text-sm text-ink-600">
              Answer: <span className="font-medium text-ink-900">{q.accepted[0]}</span>
            </span>
          )}
          <button className="rounded bg-ink-900 px-4 py-1.5 text-sm text-white" onClick={advance}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TestHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "quizResults"],
    queryFn: api.quizResults,
  });

  if (isLoading || !data || data.results.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Recent results</h2>
        <p className="text-sm text-ink-600">
          Best {data.best}% · average {data.avg}%
        </p>
      </div>
      <div className="space-y-1.5">
        {data.results.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-2 text-sm"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {r.score} / {r.total}
              </span>
              {r.level && (
                <span className="rounded-full bg-paper px-2 py-0.5 text-xs uppercase">{r.level}</span>
              )}
              <span className="text-ink-600">
                {r.kind === "mixed" ? "mixed test" : "vocab quiz"}
                {r.lesson ? ` · ${r.lesson}` : ""}
              </span>
            </span>
            <span className="text-ink-400">{new Date(r.takenAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowClockwise, ArrowSquareOut, Check, Image, MagnifyingGlass, Minus, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { api, fetchFileBlobUrl, uploadFile } from "../../../api/client";
import type { BookCandidate, SourcePreview, StudySource, StudySourceType, StudySourceUnit, StudySourceUnitLabel } from "../../../api/types";
import { Chip } from "../../../components/ui/Chip";
import { Modal } from "../../../components/ui/Modal";
import { PillButton } from "../../../components/ui/PillButton";
import { toast } from "../../../components/ui/Toast";
import type { Breakpoint } from "../../../lib/useBreakpoint";
import { SOURCE_COLOR, sourceKind, sourceProgress, type SourceKind, type Station } from "./model";
import { SOURCE_ICON } from "./sourceIcons";
import { lessonDateLabel } from "../../../lib/tasks";
import { TeachesSummary, TopicPill } from "./LessonTeaches";

const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };
const field: CSSProperties = { height: 44, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 15, fontWeight: 600, boxSizing: "border-box", width: "100%" };
const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");
const area: CSSProperties = { ...field, height: 120, padding: "10px 12px", fontSize: 14, lineHeight: 1.4, resize: "vertical", fontFamily: "inherit" };

/** Mirrors the server's parseContents (server/src/services/learning/units.ts) closely enough to count the chapters
 * as you paste; the server's parse is the one that's saved. */
function contentsLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*[-•*·–]\s+/, "")
        .replace(/(?:\s*[.·…_]{2,}\s*|\t+\s*|\s{2,})\d{1,4}\s*$/, "")
        .replace(/\s*[,–-]?\s*(?:S\.|Seite|p\.|pp\.|page)\s*\d{1,4}(?:\s*[-–]\s*\d{1,4})?\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l && !/^[\d\s.]+$/.test(l) && !/^(?:inhalt(?:sverzeichnis)?|contents|table of contents|inhaltsübersicht)\s*:?$/i.test(l))
    .slice(0, 300);
}

const bookMeta = (b: { authors: string[]; year?: number | null; pageCount?: number | null }) =>
  [b.authors.slice(0, 2).join(", ") || null, b.year ?? null, b.pageCount ? `${b.pageCount} pages` : null].filter(Boolean).join(" · ");

/** Sources feed Today's ticket (a lesson ticked here completes its ticket task), so the ticket and Today refresh too. */
function useSourceRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

/** A user-uploaded cover (auth-fetched) wins over the auto-fetched thumbnail URL. */
function useCover(s: StudySource): string | null {
  const [blob, setBlob] = useState<string | null>(null);
  useEffect(() => {
    if (!s.coverFileId) return;
    let url: string | null = null;
    let live = true;
    fetchFileBlobUrl(s.coverFileId)
      .then((u) => {
        url = u;
        if (live) setBlob(u);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [s.coverFileId]);
  return blob ?? s.coverImageUrl;
}

function Thumb({ source, height = 86 }: { source: StudySource; height?: number }) {
  const k = sourceKind(source.type);
  const Icon = SOURCE_ICON[k];
  const cover = useCover(source);
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        height,
        background: SOURCE_COLOR[k],
        color: "var(--onTile)",
        borderBottom: "2.5px solid var(--line)",
        backgroundImage: cover ? `url("${cover}")` : "repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 8px, transparent 8px 16px)",
        backgroundSize: cover ? "cover" : undefined,
        backgroundPosition: "center",
      }}
    >
      {!cover && <Icon size={30} weight="fill" aria-hidden="true" />}
      <span className="absolute uppercase" style={{ top: 8, left: 8, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", padding: "2px 7px", borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain)", color: "var(--plainText)" }}>
        {k}
      </span>
    </div>
  );
}

function stationLabel(key: string | null, stations: Station[]): string {
  if (!key) return "no station";
  const s = stations.find((x) => x.key === key);
  return s ? `Station ${s.index}` : key.split(":")[0]!.toUpperCase();
}

// ── Library ──

export function LibraryModal({ sources, stations, bp, onClose, onOpen, onAdd }: { sources: StudySource[]; stations: Station[]; bp: Breakpoint; onClose: () => void; onOpen: (s: StudySource) => void; onAdd: () => void }) {
  const refresh = useSourceRefresh();
  const [filter, setFilter] = useState<SourceKind | "all">("all");
  const kinds = (["video", "audio", "book", "course", "article", "link"] as const).map((k) => [k, sources.filter((s) => sourceKind(s.type) === k).length] as const).filter(([, n]) => n > 0);
  const shown = filter === "all" ? sources : sources.filter((s) => sourceKind(s.type) === filter);
  const plusOne = useMutation({ mutationFn: (id: string) => api.logSourceProgress(id, 1), onSuccess: refresh, onError });
  return (
    <Modal
      title="Library"
      tag={`${sources.length} source${sources.length === 1 ? "" : "s"}`}
      subtitle="What fuels your stations. Tap +1 when you finish a unit."
      bg="var(--sky)"
      width={bp === "lg" ? 720 : 560}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Close
          </PillButton>
          <PillButton className="flex-1" onClick={onAdd}>
            Add a source
          </PillButton>
        </>
      }
    >
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Chip size="sm" selected={filter === "all"} onClick={() => setFilter("all")}>
          All {sources.length}
        </Chip>
        {kinds.map(([k, n]) => (
          <Chip key={k} size="sm" selected={filter === k} onClick={() => setFilter(k)}>
            {k[0]!.toUpperCase() + k.slice(1)} {n}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: bp === "sm" ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))" }}>
        {shown.map((s) => {
          const p = sourceProgress(s);
          const k = sourceKind(s.type);
          return (
            <div key={s.id} className="flex flex-col overflow-hidden" style={{ border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)", boxShadow: "3px 3px 0 var(--shadow)" }}>
              <button type="button" onClick={() => onOpen(s)} className="cursor-pointer border-0 bg-transparent p-0 text-left" style={{ color: "inherit", font: "inherit" }}>
                <Thumb source={s} />
                <div className="flex flex-col gap-1.5" style={{ padding: "10px 12px 6px" }}>
                  <span className="line-clamp-2" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>
                    {s.title}
                  </span>
                  <div className="overflow-hidden" style={{ height: 8, borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain2)", boxSizing: "border-box" }}>
                    <div style={{ width: `${p.pct}%`, height: "100%", background: p.pct >= 100 ? "var(--mint)" : SOURCE_COLOR[k], borderRight: p.pct && p.pct < 100 ? "2px solid var(--line)" : "none" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--plainMuted)" }}>
                    {p.label} · {stationLabel(s.stationKey, stations)}
                  </span>
                </div>
              </button>
              <button
                type="button"
                aria-label={`+1 ${s.unitLabel} on ${s.title}`}
                disabled={plusOne.isPending || (p.total !== null && p.done >= p.total)}
                onClick={() => plusOne.mutate(s.id)}
                className="m-2 mt-0 cursor-pointer self-end disabled:cursor-default disabled:opacity-40"
                style={{ height: 28, padding: "0 10px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--lemon)", color: "var(--onTile)", fontWeight: 700, fontSize: 12 }}
              >
                +1
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── one source ──

export function SourceModal({ source, stations, pickable, onClose }: { source: StudySource; stations: Station[]; pickable: Station[]; onClose: () => void }) {
  const refresh = useSourceRefresh();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = sourceProgress(source);
  const k = sourceKind(source.type);
  const log = useMutation({ mutationFn: (d: number) => api.logSourceProgress(source.id, d), onSuccess: refresh, onError });
  const unit = useMutation({ mutationFn: (v: { id: string; done: boolean }) => api.toggleSourceUnit(source.id, v.id, v.done), onSuccess: refresh, onError });
  const link = useMutation({
    mutationFn: (stationKey: string | null) => api.updateStudySource(source.id, { stationKey }),
    onSuccess: (_, key) => {
      toast.success(key ? `Fuels ${stationLabel(key, stations)}` : "Unlinked from its station");
      refresh();
    },
    onError,
  });
  const cover = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadFile(file, { kind: "source_cover", studySourceId: source.id });
      return api.updateStudySource(source.id, { coverFileId: uploaded.id });
    },
    onSuccess: () => {
      toast.success("Cover updated");
      refresh();
    },
    onError,
  });
  const refetchCover = useMutation({
    mutationFn: () => api.updateStudySource(source.id, { refetchCover: true }),
    onSuccess: (res) => {
      if (res.source.coverImageUrl) toast.success("Cover fetched from the link");
      else toast.info("The link has no cover image");
      refresh();
    },
    onError,
  });
  // fill what's still empty (author, cover, page count) by looking the source up again — e.g. a book saved before
  // lookups worked
  const fetchDetails = useMutation({
    mutationFn: () => api.updateStudySource(source.id, { refetchDetails: true }),
    onSuccess: () => {
      toast.success("Details filled in");
      refresh();
    },
    onError: () => toast.info("Couldn't find details for this one — edit them by hand"),
  });
  const missingDetails = !source.provider || (!source.coverImageUrl && !source.coverFileId) || (!source.totalUnits && source.units.length === 0);
  const del = useMutation({
    mutationFn: () => api.deleteStudySource(source.id),
    onSuccess: () => {
      toast.success("Source deleted");
      refresh();
      onClose();
    },
    onError,
  });
  const choices = [...new Map([...pickable, ...stations.filter((s) => s.key === source.stationKey)].map((s) => [s.key, s])).values()];
  const daily = useMutation({
    mutationFn: (data: { dailyLesson?: boolean; minutesPerUnit?: number | null }) => api.updateStudySource(source.id, data),
    onSuccess: (_, data) => {
      if (data.dailyLesson !== undefined) toast.success(data.dailyLesson ? "A lesson goes on your ticket every study day" : "Off your daily ticket");
      refresh();
    },
    onError,
  });

  return (
    <Modal
      title={source.title}
      tag={`${k}${source.provider ? ` · ${source.provider}` : ""}`}
      subtitle={p.label}
      bg={SOURCE_COLOR[k]}
      onClose={onClose}
      footer={
        <>
          {confirmDelete ? (
            <PillButton variant="secondary" style={{ minWidth: 110, background: "var(--tomato)", color: "var(--onTile)" }} disabled={del.isPending} onClick={() => del.mutate()}>
              Really delete
            </PillButton>
          ) : (
            <PillButton variant="secondary" style={{ minWidth: 110 }} icon={<Trash size={15} weight="fill" aria-hidden="true" />} onClick={() => setConfirmDelete(true)}>
              Delete
            </PillButton>
          )}
          <PillButton className="flex-1" onClick={onClose}>
            Done
          </PillButton>
        </>
      }
    >
      <div className="flex shrink-0 overflow-hidden" style={{ border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)" }}>
        <div className="w-full">
          <Thumb source={source} height={120} />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PillButton height={40} variant="secondary" icon={<Minus size={14} weight="bold" aria-hidden="true" />} disabled={log.isPending || p.done <= 0} onClick={() => log.mutate(-1)}>
          1
        </PillButton>
        <PillButton height={40} icon={<Plus size={14} weight="bold" aria-hidden="true" />} disabled={log.isPending || (p.total !== null && p.done >= p.total)} onClick={() => log.mutate(1)}>
          1 {source.unitLabel.replace(/s$/, "")}
        </PillButton>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && cover.mutate(e.target.files[0])} />
        <PillButton height={40} variant="secondary" icon={<Image size={15} weight="fill" aria-hidden="true" />} disabled={cover.isPending} onClick={() => fileRef.current?.click()}>
          {source.coverFileId ? "Change cover" : "Add cover"}
        </PillButton>
        {source.url && !source.coverFileId && (
          <PillButton
            height={40}
            variant="secondary"
            icon={<ArrowClockwise size={15} weight="bold" aria-hidden="true" />}
            disabled={refetchCover.isPending}
            onClick={() => refetchCover.mutate()}
            aria-label="Fetch the cover from the link again"
          >
            Refresh
          </PillButton>
        )}
        {missingDetails && (source.type === "book" || source.type === "audio" || !!source.url) && (
          <PillButton
            height={40}
            variant="secondary"
            icon={<MagnifyingGlass size={15} weight="bold" aria-hidden="true" />}
            disabled={fetchDetails.isPending}
            onClick={() => fetchDetails.mutate()}
          >
            {fetchDetails.isPending ? "Looking…" : "Fetch details"}
          </PillButton>
        )}
        {source.url && (
          <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5" style={{ height: 40, padding: "0 14px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 14 }}>
            <ArrowSquareOut size={15} weight="bold" aria-hidden="true" />
            Open
          </a>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Fuel for station</span>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((s) => (
            <Chip key={s.key} size="sm" selected={source.stationKey === s.key} onClick={() => link.mutate(s.key)}>
              Station {s.index} · {s.theme}
            </Chip>
          ))}
          <Chip size="sm" selected={!source.stationKey} onClick={() => link.mutate(null)}>
            No station
          </Chip>
        </div>
      </div>
      {k === "book" && <BookChapters source={source} />}
      {source.units.length > 0 && <DailyLesson source={source} pending={daily.isPending} onChange={(d) => daily.mutate(d)} />}
      {source.plan.covered.length > 0 && (
        <div className="flex shrink-0 flex-col gap-2">
          <span style={eyebrow}>Topics covered so far · {source.plan.covered.length}</span>
          <div className="flex flex-wrap gap-1">
            {source.plan.covered.map((t) => (
              <TopicPill key={t.id} topic={t} suffix={t.lessons > 1 ? ` · ${t.lessons} lessons` : undefined} />
            ))}
          </div>
        </div>
      )}
      {source.units.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>
            {source.unitLabel[0]!.toUpperCase() + source.unitLabel.slice(1)} · {source.units.filter((u) => u.completedAt).length}/{source.units.length}
          </span>
          {source.units.map((u) => (
            <UnitRow
              key={u.id}
              sourceId={source.id}
              unit={u}
              date={source.plan.dates[u.id] ?? null}
              next={source.plan.nextUnitId === u.id}
              onToggle={(done) => unit.mutate({ id: u.id, done })}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

/**
 * A book's chapters from its table of contents: paste it (one chapter per line) and the units take those titles.
 * Renaming keeps each chapter's tick; a book still tracked in pages switches to chapters and starts its progress
 * over, since a page count says nothing about which chapter you're on.
 */
function BookChapters({ source }: { source: StudySource }) {
  const refresh = useSourceRefresh();
  const inPages = source.unitLabel === "pages";
  const [draft, setDraft] = useState<string | null>(null);
  const lines = draft === null ? [] : contentsLines(draft);
  const save = useMutation({
    mutationFn: (text: string) => api.updateStudySource(source.id, { contents: text }),
    onSuccess: (r) => {
      toast.success(`${r.source.units.length} chapters saved`);
      setDraft(null);
      refresh();
    },
    onError,
  });
  if (draft === null) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {inPages && (
          <span className="min-w-0 flex-1" style={{ fontSize: 13, fontWeight: 600 }}>
            Tracked in pages. Paste the table of contents to follow it chapter by chapter instead.
          </span>
        )}
        <PillButton
          height={40}
          variant="secondary"
          icon={<PencilSimple size={15} weight="bold" aria-hidden="true" />}
          onClick={() => setDraft(inPages ? "" : source.units.map((u) => u.title).join("\n"))}
        >
          {inPages ? "Switch to chapters" : source.units.length > 0 ? "Edit chapters" : "Add chapters"}
        </PillButton>
      </div>
    );
  }
  return (
    <label className="flex shrink-0 flex-col gap-1.5">
      <span style={eyebrow}>Contents · {lines.length} chapter{lines.length === 1 ? "" : "s"}</span>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={"One chapter per line:\nLektion 1: Hallo!\nLektion 2: Ich bin Journalistin.\n…"}
        lang="de"
        style={{ ...area, height: 180 }}
      />
      {inPages && source.completedUnits > 0 && (
        <span style={{ fontSize: 12, fontWeight: 600 }}>Your page progress ({source.completedUnits} pages) starts over in chapters.</span>
      )}
      <div className="flex gap-2">
        <PillButton height={40} variant="secondary" onClick={() => setDraft(null)}>
          Cancel
        </PillButton>
        <PillButton height={40} className="flex-1" disabled={lines.length === 0 || save.isPending} onClick={() => save.mutate(draft)}>
          {save.isPending ? "Saving…" : `Save ${lines.length} chapter${lines.length === 1 ? "" : "s"}`}
        </PillButton>
      </div>
    </label>
  );
}

/**
 * The source's place on Today's ticket: the Daily lesson switch, minutes per lesson, and what's next — the next
 * lesson's date and when the source is finished at one lesson per study day.
 */
function DailyLesson({ source, pending, onChange }: { source: StudySource; pending: boolean; onChange: (d: { dailyLesson?: boolean; minutesPerUnit?: number | null }) => void }) {
  const { plan } = source;
  const [minutes, setMinutes] = useState<string | null>(null);
  const next = source.units.find((u) => u.id === plan.nextUnitId) ?? null;
  const commitMinutes = () => {
    if (minutes === null) return;
    const n = Math.round(Number(minutes));
    setMinutes(null);
    if (!minutes.trim()) return onChange({ minutesPerUnit: null });
    if (Number.isFinite(n) && n >= 1 && n <= 600 && n !== plan.minutesPerUnit) onChange({ minutesPerUnit: n === plan.defaultMinutesPerUnit ? null : n });
  };
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <span style={eyebrow}>Daily lesson</span>
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" selected={source.dailyLesson} disabled={pending} onClick={() => onChange({ dailyLesson: true })}>
          On my ticket
        </Chip>
        <Chip size="sm" selected={!source.dailyLesson} disabled={pending} onClick={() => onChange({ dailyLesson: false })}>
          Off
        </Chip>
        <label className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 700 }}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={minutes ?? String(plan.minutesPerUnit)}
            onChange={(e) => setMinutes(e.target.value)}
            onBlur={commitMinutes}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label={`Minutes per ${source.unitLabel.replace(/s$/, "")}`}
            style={{ width: 60, height: 30, padding: "0 6px", border: "2px solid var(--line)", borderRadius: 10, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 13, textAlign: "center" }}
          />
          min per {source.unitLabel.replace(/s$/, "")}
        </label>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        {!next
          ? "Every lesson is done."
          : source.dailyLesson && plan.dates[next.id]
            ? `Next: ${next.position + 1}. ${next.title} · ${lessonDateLabel(plan.dates[next.id]!)}. One a study day, finished by ${lessonDateLabel(plan.finishDate!)}.`
            : `Next: ${next.position + 1}. ${next.title}. Switch on to get one on your ticket every study day.`}
      </span>
    </div>
  );
}

/**
 * One lesson: its own checkbox (completion), then the title, when it comes up on the ticket, a short description of
 * what it covers and the syllabus topics it teaches. Tapping the text expands everything (grammar points, culture,
 * new words); the pencil edits the description (fetched descriptions can be corrected, others written).
 */
function UnitRow({ sourceId, unit, date, next, onToggle }: { sourceId: string; unit: StudySourceUnit; date: string | null; next: boolean; onToggle: (done: boolean) => void }) {
  const refresh = useSourceRefresh();
  const done = !!unit.completedAt;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (text: string) => api.updateUnitDescription(sourceId, unit.id, text.trim() || null),
    onSuccess: () => {
      setDraft(null);
      refresh();
    },
    onError,
  });
  return (
    <div
      className="flex items-start gap-2.5"
      style={{ padding: "8px 10px", borderRadius: 12, border: "2px solid var(--line)", background: "var(--plain)", color: "var(--plainText)" }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${unit.title}: ${done ? "done" : "not done"}`}
        onClick={() => onToggle(!done)}
        className="flex shrink-0 cursor-pointer items-center justify-center p-0"
        style={{ width: 22, height: 22, marginTop: 1, borderRadius: 6, border: "2.5px solid var(--line)", background: done ? "var(--mint)" : "transparent", color: "var(--onTile)" }}
      >
        {done && <Check size={11} weight="bold" aria-hidden="true" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left"
          style={{ color: "inherit", font: "inherit" }}
        >
          <span className="flex min-w-0 items-center gap-2" style={{ maxWidth: "100%" }}>
            <span className={open ? "min-w-0" : "min-w-0 truncate"} style={{ fontSize: 14, fontWeight: 600, textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1 }}>
              {unit.position + 1}. {unit.title}
            </span>
            {date && !done && (
              <span
                className="shrink-0"
                style={{ padding: "1px 7px", borderRadius: 999, border: "2px solid var(--line)", background: next ? "var(--lemon)" : "transparent", color: next ? "var(--onTile)" : "inherit", fontSize: 11.5, fontWeight: 700 }}
              >
                {lessonDateLabel(date)}
              </span>
            )}
          </span>
          {unit.description && draft === null && (
            <span className={open ? undefined : "line-clamp-2"} style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, color: "var(--plainMuted)", whiteSpace: "pre-line" }}>
              {unit.description}
            </span>
          )}
        </button>
        <div style={{ marginTop: 3 }}>
          <TeachesSummary teaches={unit.teaches} full={open} />
        </div>
        {draft !== null ? (
          <div className="flex flex-col gap-1.5" style={{ marginTop: 4 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={3}
              autoFocus
              aria-label={`What ${unit.title} covers`}
              placeholder="What this lesson covers…"
              style={{ resize: "vertical", padding: "8px 10px", border: "2px solid var(--line)", borderRadius: 10, background: "var(--plain2)", color: "var(--plainText)", fontSize: 13, fontFamily: "inherit" }}
            />
            <div className="flex gap-1.5">
              <PillButton height={34} disabled={save.isPending} onClick={() => save.mutate(draft)}>
                Save
              </PillButton>
              <PillButton height={34} variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </PillButton>
            </div>
          </div>
        ) : (
          (open || !unit.description) && (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setDraft(unit.description ?? "");
              }}
              className="flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent p-0"
              style={{ color: "var(--plainMuted)", fontSize: 12, fontWeight: 700 }}
            >
              <PencilSimple size={12} weight="fill" aria-hidden="true" />
              {unit.description ? "Edit description" : "Add a description"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Add source ──

const TYPES: { k: SourceKind; type: StudySourceType; unit: StudySourceUnitLabel; provider?: string; count?: string; link: "optional" | "only" | "main" | "isbn" }[] = [
  { k: "video", type: "video", unit: "episodes", provider: "Channel / series", count: "Episodes", link: "optional" },
  { k: "audio", type: "audio", unit: "episodes", provider: "Podcast", count: "Episodes", link: "optional" },
  { k: "book", type: "book", unit: "chapters", provider: "Author / publisher", count: "Chapters", link: "isbn" },
  { k: "course", type: "course", unit: "lessons", provider: "School / platform", count: "Lessons", link: "optional" },
  { k: "article", type: "article", unit: "chapters", count: "Parts", link: "main" },
  { k: "link", type: "link", unit: "lessons", link: "only" },
];

const looksLikeUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s.trim());
const looksLikeIsbn = (s: string) => /^(97[89])?\d{9}[\dXx]$/.test(s.replace(/[\s-]/g, ""));

/**
 * Add a source (KNOWN_ISSUES #34): fetch before save. Pasting a link — or, for a book, a link or ISBN — looks it up
 * right away (debounced); a book's title searches as you type, a podcast's on Fetch (which also retries). A book
 * title search lists its runners-up to pick from, and a book's units are its chapters: count them, or paste the
 * table of contents for titled chapters. The preview shows what
 * was found and fills only the fields you left empty; everything stays editable, and a failed lookup says so.
 */
export function AddSourceModal({ stations, defaultStationKey, onClose }: { stations: Station[]; defaultStationKey: string | null; onClose: () => void }) {
  const refresh = useSourceRefresh();
  const [kind, setKind] = useState<SourceKind>("video");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [count, setCount] = useState("");
  const [url, setUrl] = useState("");
  const [station, setStation] = useState<string | null>(defaultStationKey);
  const [found, setFound] = useState<SourcePreview | null>(null);
  const [contents, setContents] = useState("");
  // a book picked from a title search's runners-up: looked up (and saved) by its ISBN from then on
  const [pickedIsbn, setPickedIsbn] = useState<string | null>(null);
  // what the last lookup filled in, so a later lookup may replace it (but never what the user typed)
  const autoFilled = useRef({ provider: "" });
  const t = TYPES.find((x) => x.k === kind)!;
  const chapters = t.k === "book" ? contentsLines(contents) : [];
  // a book's "Link or ISBN": a link is saved as the source's link, an ISBN only drives the lookup
  const bookIsbn = t.link === "isbn" ? (pickedIsbn ?? (!looksLikeUrl(url) && looksLikeIsbn(url) ? url.trim() : null)) : null;
  const link = t.link === "isbn" ? (looksLikeUrl(url) ? url.trim() : null) : url.trim() || null;

  const preview = useMutation({
    mutationFn: (v: { withTitle: boolean; auto?: boolean }) =>
      api.previewStudySource({ type: t.type, url: link, isbn: bookIsbn, title: v.withTitle ? title.trim() || null : null }),
    onSuccess: (r, v) => {
      const failed = r.outcome === "failed" || r.outcome === "manual";
      // a miss while typing a title isn't news; only a lookup the user asked for (or a pasted link) reports one
      setFound(failed && v.auto ? null : r);
      if (failed) return;
      // fill only what the user left empty (or what an earlier lookup filled)
      if (!title.trim() && r.title) setTitle(r.title);
      if (r.provider && (!provider.trim() || provider === autoFilled.current.provider)) {
        setProvider(r.provider);
        autoFilled.current.provider = r.provider;
      }
      const n = r.unitCount || r.totalUnits;
      if (!count && n) setCount(String(n));
    },
    onError: (_, v) => setFound(v.auto ? null : { type: t.type, title: null, provider: null, coverImageUrl: null, totalUnits: null, unitCount: 0, outcome: "failed" }),
  });
  // pasting or changing a link (or ISBN) fetches on its own, debounced
  const lookupKey = `${t.type}|${link ?? ""}|${bookIsbn ?? ""}`;
  useEffect(() => {
    if (!link && !bookIsbn) return;
    const id = setTimeout(() => preview.mutate({ withTitle: false }), 700);
    return () => clearTimeout(id);
  }, [lookupKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // a book title searches as you type (the server caches the answers), unless a link or ISBN already pins the book
  const bookQuery = t.k === "book" && !link && !bookIsbn ? title.trim() : "";
  useEffect(() => {
    if (bookQuery.length < 4) return;
    const id = setTimeout(() => preview.mutate({ withTitle: true, auto: true }), 900);
    return () => clearTimeout(id);
  }, [bookQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setFound(null), [kind]);

  const pick = (b: BookCandidate) => {
    setTitle(b.title);
    if (b.authors.length > 0 && (!provider.trim() || provider === autoFilled.current.provider)) {
      setProvider(b.authors.join(", "));
      autoFilled.current.provider = b.authors.join(", ");
    }
    setPickedIsbn(b.isbn ?? null);
    setFound({
      type: "book",
      title: b.title,
      provider: b.authors.join(", ") || null,
      coverImageUrl: b.thumbnailUrl,
      totalUnits: null,
      unitCount: 0,
      outcome: "book",
      pageCount: b.pageCount,
      candidates: (found?.candidates ?? []).filter((c) => c !== b),
    });
  };

  const canSearchTitle = (t.type === "book" || t.type === "audio") && title.trim().length > 1;
  const add = useMutation({
    mutationFn: () =>
      api.addStudySource({
        type: t.type,
        title: title.trim(),
        url: link,
        isbn: bookIsbn,
        provider: provider.trim() || null,
        contents: chapters.length > 0 ? contents : null,
        totalUnits: chapters.length === 0 && count ? Math.max(1, Number(count)) : null,
        unitLabel: t.unit,
        stationKey: station,
        autoFetch: true,
      }),
    onSuccess: ({ source, fetch }) => {
      toast.success(`Added · ${source.title}${fetch !== "manual" && fetch !== "failed" ? " (details fetched)" : ""}`);
      refresh();
      onClose();
    },
    onError,
  });
  const save = () => {
    // a link can fill the title in by itself (the server fetches it); otherwise a title is required
    if (!title.trim() && !link) return toast.error("Give it a title first");
    add.mutate();
  };
  const foundCount = found ? found.unitCount || found.totalUnits : null;
  const foundMeta =
    found?.outcome === "book"
      ? bookMeta({ authors: found.provider ? [found.provider] : [], pageCount: found.pageCount })
      : [found?.provider, foundCount ? `${foundCount} ${t.unit}` : null].filter(Boolean).join(" · ");
  return (
    <Modal
      title="Add a source"
      tag="Library"
      subtitle="Paste a link or search a title — we'll fill in what we can find. Everything stays editable."
      bg="var(--lemon)"
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton className="flex-1" disabled={add.isPending} onClick={save}>
            {add.isPending ? "Adding…" : "Add source"}
          </PillButton>
        </>
      }
    >
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Type</span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Source type">
          {TYPES.map((x) => {
            const on = x.k === kind;
            const Icon = SOURCE_ICON[x.k];
            return (
              <button
                key={x.k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setKind(x.k)}
                className="flex cursor-pointer items-center justify-center gap-1.5"
                style={{ height: 44, borderRadius: 12, border: "2.5px solid var(--line)", background: on ? SOURCE_COLOR[x.k] : "var(--plain)", color: on ? "var(--onTile)" : "var(--plainText)", fontWeight: 700, fontSize: 14, boxShadow: on ? "3px 3px 0 var(--shadow)" : "none", transform: on ? "rotate(-2deg)" : "none" }}
              >
                <Icon size={18} weight="fill" aria-hidden="true" />
                {x.k[0]!.toUpperCase() + x.k.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex shrink-0 flex-col gap-1.5">
        <span style={eyebrow}>{t.link === "isbn" ? "Link or ISBN (optional — exact lookup)" : t.link === "optional" ? "Link (optional — fills in the details)" : "Link"}</span>
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPickedIsbn(null);
          }}
          placeholder={t.link === "isbn" ? "ISBN, or an Open Library / Google Books / Amazon link" : "https://…"}
          type={t.link === "isbn" ? "text" : "url"}
          style={field}
        />
      </label>
      <div className="flex shrink-0 flex-col gap-1.5">
        <span style={eyebrow}>{t.link === "only" ? "Title (optional)" : "Title"}</span>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setPickedIsbn(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && canSearchTitle && preview.mutate({ withTitle: true })}
            placeholder={t.link === "only" ? "Taken from the page if left empty" : kind === "book" ? "e.g. Menschen A2 Kursbuch" : kind === "audio" ? "e.g. Coffee Break German" : "e.g. Nicos Weg"}
            aria-label="Title"
            style={{ ...field, flex: 1, minWidth: 0 }}
          />
          {(t.type === "book" || t.type === "audio" || link || bookIsbn) && (
            <PillButton
              height={46}
              variant="secondary"
              icon={<MagnifyingGlass size={15} weight="bold" aria-hidden="true" />}
              disabled={preview.isPending || (!canSearchTitle && !link && !bookIsbn)}
              onClick={() => preview.mutate({ withTitle: canSearchTitle })}
            >
              {preview.isPending ? "Looking…" : "Fetch"}
            </PillButton>
          )}
        </div>
      </div>
      {found && (found.outcome === "failed" || found.outcome === "manual" ? (
        <div className="shrink-0" role="status" style={{ padding: "10px 12px", border: "2.5px dashed var(--line)", borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
          {kind === "book" ? "Couldn't find this book — fill in the details below." : "Couldn't read that — fill in the details below."}
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3" role="status" style={{ padding: 10, border: "2.5px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)", boxShadow: "3px 3px 0 var(--shadow)" }}>
          {found.coverImageUrl ? (
            <img src={found.coverImageUrl} alt="" style={{ width: 52, height: 68, objectFit: "cover", borderRadius: 6, border: "2px solid var(--line)", flexShrink: 0 }} />
          ) : null}
          <div className="min-w-0 flex-1" style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--plainMuted)" }}>Found</div>
            <div lang="de" style={{ fontSize: 14, fontWeight: 700 }}>{found.title ?? title}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>{foundMeta || "Details filled in below"}</div>
          </div>
        </div>
      ))}
      {found?.candidates && found.candidates.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>Not this one?</span>
          {found.candidates.map((b, i) => (
            <button
              key={`${b.isbn ?? b.title}-${i}`}
              type="button"
              onClick={() => pick(b)}
              className="flex cursor-pointer items-center gap-2.5 text-left"
              style={{ padding: "6px 10px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)" }}
            >
              {b.thumbnailUrl ? (
                <img src={b.thumbnailUrl} alt="" style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 4, border: "1.5px solid var(--line)", flexShrink: 0 }} />
              ) : null}
              <span className="min-w-0 flex-1" style={{ lineHeight: 1.2 }}>
                <span lang="de" className="block truncate" style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</span>
                <span className="block truncate" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--plainMuted)" }}>{bookMeta(b)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {t.provider && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>{t.provider}</span>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} style={field} />
        </label>
      )}
      {t.count && chapters.length === 0 && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>{t.count}</span>
          <input
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder={t.k === "book" ? "How many chapters / Lektionen?" : "How many in total?"}
            style={field}
          />
        </label>
      )}
      {t.k === "book" && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>Contents (optional){chapters.length > 0 ? ` · ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}` : ""}</span>
          <textarea
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            placeholder={"Paste the table of contents, one chapter per line:\nLektion 1: Hallo!\nLektion 2: Ich bin Journalistin.\n…"}
            lang="de"
            style={area}
          />
        </label>
      )}
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Fuel for station</span>
        <div className="flex flex-wrap gap-1.5">
          {stations.map((s, i) => (
            <Chip key={s.key} size="sm" selected={station === s.key} onClick={() => setStation(s.key)}>
              Station {s.index}
              {i === 0 ? " · now" : ""}
            </Chip>
          ))}
          <Chip size="sm" selected={station === null} onClick={() => setStation(null)}>
            No station
          </Chip>
        </div>
      </div>
    </Modal>
  );
}

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowClockwise, ArrowSquareOut, Check, Image, Minus, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { api, fetchFileBlobUrl, uploadFile } from "../../../api/client";
import type { StudySource, StudySourceType, StudySourceUnit, StudySourceUnitLabel } from "../../../api/types";
import { Chip } from "../../../components/ui/Chip";
import { Modal } from "../../../components/ui/Modal";
import { PillButton } from "../../../components/ui/PillButton";
import { toast } from "../../../components/ui/Toast";
import type { Breakpoint } from "../../../lib/useBreakpoint";
import { SOURCE_COLOR, sourceKind, sourceProgress, type SourceKind, type Station } from "./model";
import { SOURCE_ICON } from "./sourceIcons";

const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };
const field: CSSProperties = { height: 44, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 15, fontWeight: 600, boxSizing: "border-box", width: "100%" };
const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

function useSourceRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["learning", "sources"] });
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
      {source.units.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>Units · {source.units.filter((u) => u.completedAt).length}/{source.units.length}</span>
          {source.units.map((u) => (
            <UnitRow key={u.id} sourceId={source.id} unit={u} onToggle={(done) => unit.mutate({ id: u.id, done })} />
          ))}
        </div>
      )}
    </Modal>
  );
}

/**
 * One lesson: its own checkbox (completion), then the title and a short description of what it covers. Tapping the
 * text expands the description; the pencil edits it (fetched descriptions can be corrected, others written).
 */
function UnitRow({ sourceId, unit, onToggle }: { sourceId: string; unit: StudySourceUnit; onToggle: (done: boolean) => void }) {
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
          <span className={open ? undefined : "truncate"} style={{ fontSize: 14, fontWeight: 600, textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1, maxWidth: "100%" }}>
            {unit.position + 1}. {unit.title}
          </span>
          {unit.description && draft === null && (
            <span className={open ? undefined : "line-clamp-2"} style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, color: "var(--plainMuted)" }}>
              {unit.description}
            </span>
          )}
        </button>
        {draft !== null ? (
          <div className="flex flex-col gap-1.5" style={{ marginTop: 4 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
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

const TYPES: { k: SourceKind; type: StudySourceType; unit: StudySourceUnitLabel; provider?: string; count?: string; link: "optional" | "only" | "main" | "none" }[] = [
  { k: "video", type: "video", unit: "episodes", provider: "Channel / series", count: "Episodes", link: "optional" },
  { k: "audio", type: "audio", unit: "episodes", provider: "Podcast", count: "Episodes", link: "optional" },
  { k: "book", type: "book", unit: "pages", provider: "Author / publisher", count: "Pages", link: "none" },
  { k: "course", type: "course", unit: "lessons", provider: "School / platform", count: "Lessons", link: "optional" },
  { k: "article", type: "article", unit: "chapters", count: "Parts", link: "main" },
  { k: "link", type: "link", unit: "lessons", link: "only" },
];

export function AddSourceModal({ stations, defaultStationKey, onClose }: { stations: Station[]; defaultStationKey: string | null; onClose: () => void }) {
  const refresh = useSourceRefresh();
  const [kind, setKind] = useState<SourceKind>("video");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [count, setCount] = useState("");
  const [url, setUrl] = useState("");
  const [station, setStation] = useState<string | null>(defaultStationKey);
  const t = TYPES.find((x) => x.k === kind)!;
  const add = useMutation({
    mutationFn: () =>
      api.addStudySource({
        type: t.type,
        title: title.trim(),
        url: url.trim() || null,
        provider: provider.trim() || null,
        totalUnits: count ? Math.max(1, Number(count)) : null,
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
    if (!title.trim() && !url.trim()) return toast.error("Give it a title first");
    add.mutate();
  };
  return (
    <Modal
      title="Add a source"
      tag="Library"
      subtitle="Fetching from a link is best-effort. You can always type the fields."
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
      {t.link !== "none" && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>{t.link === "optional" ? "Link (optional — fills in the details)" : "Link"}</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" style={field} />
        </label>
      )}
      {t.link !== "only" && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "book" ? "e.g. Menschen A2 (searches Google Books)" : "e.g. Nicos Weg"} style={field} />
        </label>
      )}
      {t.link === "only" && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>Title (optional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Taken from the page if left empty" style={field} />
        </label>
      )}
      {t.provider && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>{t.provider}</span>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} style={field} />
        </label>
      )}
      {t.count && (
        <label className="flex shrink-0 flex-col gap-1.5">
          <span style={eyebrow}>{t.count}</span>
          <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="How many in total?" style={field} />
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

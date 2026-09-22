import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  CaretLeft,
  CheckCircle,
  GraduationCap,
  Headphones,
  LinkSimple,
  Newspaper,
  Plus,
  PlusCircle,
  Trophy,
  VideoCamera,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { api, fetchFileBlobUrl, uploadFile } from "../../api/client";
import type { ActivityFeedEntry, StudySource, StudySourceType, StudySourceUnitLabel } from "../../api/types";
import { useNavStack } from "../../lib/navStack";
import { toast } from "../../components/ui/Toast";
import { youTubeVideoIdFromUrl } from "../../lib/youtube";
import { nicosWegCourseIdFromUrl } from "../../lib/nicosweg";
import { invalidateHub } from "../learning-hub/queryHelpers";

// YouTube isn't one of the 6 Add-source picker buttons (it auto-detects from
// a pasted URL instead — see AddSourceSheet), but it's still a real,
// first-class type everywhere else: its own filter chip, its own card
// styling, its own fetch engine.
const TYPE_META: Record<StudySourceType, { label: string; icon: typeof BookOpen }> = {
  youtube: { label: "YouTube", icon: YoutubeLogo },
  video: { label: "Video", icon: VideoCamera },
  audio: { label: "Audio", icon: Headphones },
  book: { label: "Book", icon: BookOpen },
  course: { label: "Course", icon: GraduationCap },
  article: { label: "Article", icon: Newspaper },
  link: { label: "Link", icon: LinkSimple },
};

const PICKER_TYPES: StudySourceType[] = ["video", "audio", "book", "course", "article", "link"];

const UNIT_LABEL_META: Record<StudySourceUnitLabel, string> = {
  lessons: "Lessons",
  episodes: "Episodes",
  pages: "Pages",
  chapters: "Chapters",
  modules: "Modules",
};

function detectSourceType(url: string): StudySourceType | null {
  if (youTubeVideoIdFromUrl(url)) return "youtube";
  if (nicosWegCourseIdFromUrl(url)) return "course";
  return null;
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Cover-image slot (vendored fresh, not the design tool's own proprietary
 * image-slot.js) — click to upload/replace. A user-uploaded cover
 * (source.coverFileId, via the generic file-upload route + a follow-up
 * PATCH linking it) always wins for display over coverImageUrl's
 * auto-fetched thumbnail (book cover / podcast artwork / article image),
 * which is hotlinked rather than downloaded — see schema's own comment on
 * StudySource.coverImageUrl for why. */
function CoverImageSlot({ source, onChanged }: { source: StudySource; onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const Icon = TYPE_META[source.type].icon;

  useEffect(() => {
    if (!source.coverFileId) {
      setUploadedPreview(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    fetchFileBlobUrl(source.coverFileId).then((u) => {
      if (cancelled) URL.revokeObjectURL(u);
      else {
        url = u;
        setUploadedPreview(u);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source.coverFileId]);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, { kind: "source_cover", studySourceId: source.id });
      await api.updateStudySource(source.id, { coverFileId: uploaded.id });
      onChanged();
    } catch {
      toast.error("Couldn't upload that cover — try again.");
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = uploadedPreview ?? source.coverImageUrl;

  return (
    <button
      type="button"
      title="Change cover image"
      onClick={(e) => {
        e.stopPropagation();
        fileInput.current?.click();
      }}
      className="relative block h-[84px] w-full shrink-0 rounded-t-xl"
      style={{ background: "var(--color-ink-50)" }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-t-xl">
        {displayUrl ? (
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <Icon size={26} weight="regular" style={{ color: "var(--color-hairline)" }} aria-hidden="true" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center text-[11px]" style={{ background: "rgba(10,11,18,.55)", color: "var(--color-on-dark-ink-900)" }}>
            Uploading…
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

/** One source card in the grid (Claude Design handoff turn 10a). Content
 * types (everything but "link") get a cover image, type badge, and
 * provider + progress-in-the-source's-own-units; link-type sources render
 * as a lighter compact card in the same grid — no thumbnail/progress, per
 * spec — since a bookmark doesn't have a completion arc.
 *
 * A source with real per-lesson data (`units`, scraped from a playlist or
 * course) expands on tap into that lesson list instead of blindly marking
 * whichever unit happens to be `next` done — the user picks the specific
 * one they actually finished. A source with no unit data has nothing to
 * pick from, so it keeps the one-tap "log a session" bump as a fallback. */
export function SourceRow({ source }: { source: StudySource }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const hasUnits = source.units.length > 0;
  const meta = TYPE_META[source.type];
  const Icon = meta.icon;

  const bump = useMutation({
    mutationFn: () => api.logSourceProgress(source.id, 1),
    onSuccess: () => {
      invalidateHub(queryClient);
      toast.success(`Logged today's session on ${source.title}`);
    },
    onError: () => toast.error("Couldn't log that session — try again."),
  });
  const toggleUnit = useMutation({
    mutationFn: ({ unitId, done }: { unitId: string; done: boolean }) => api.toggleSourceUnit(source.id, unitId, done),
    onSuccess: () => invalidateHub(queryClient),
    onError: () => toast.error("Couldn't update that lesson — try again."),
  });

  const pct = source.percent;
  const hasProgress = pct !== null && pct > 0;

  if (source.type === "link") {
    return (
      <a
        href={source.url ?? "#"}
        target={source.url?.startsWith("/") ? undefined : "_blank"}
        rel="noreferrer"
        className="flex items-center gap-2.5 rounded-xl p-3"
        style={{ background: "var(--color-card)" }}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-[9px]" style={{ background: "var(--color-ink-50)" }}>
          <LinkSimple size={16} weight="regular" style={{ color: "var(--color-ink-600)" }} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium">{source.title}</div>
          <div className="mt-px truncate text-[11px]" style={{ color: "var(--color-ink-400)" }}>
            {source.provider ?? "Link"} · saved {relativeDate(source.createdAt)}
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: "var(--color-card)" }}>
      <CoverImageSlot source={source} onChanged={() => invalidateHub(queryClient)} />
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-micro tracking-[.1em] uppercase" style={{ color: hasProgress ? "var(--color-brand-700)" : "var(--color-ink-600)" }}>
          <Icon size={11} weight="regular" aria-hidden="true" />
          {meta.label}
        </div>
        <button type="button" onClick={() => (hasUnits ? setExpanded((v) => !v) : bump.mutate())} className="mt-1 block w-full text-left">
          <div className="truncate text-[14.5px] font-medium">{source.title}</div>
          <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--color-ink-400)" }}>
            {source.provider ?? "—"}
            {source.totalUnits ? ` · ${source.completedUnits}/${source.totalUnits} ${UNIT_LABEL_META[source.unitLabel].toLowerCase()}` : ""}
          </div>
        </button>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "var(--color-hairline-soft)" }}>
            <div
              className="h-full rounded-[3px] transition-[width] duration-500"
              style={{ width: `${pct ?? Math.min(100, source.completedUnits * 10)}%`, background: pct !== null && pct >= 100 ? "var(--color-brand-700)" : "linear-gradient(90deg,var(--color-brand-solid),var(--color-brand-500))" }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] font-medium" style={{ color: pct !== null && pct >= 100 ? "var(--color-brand-700)" : "var(--color-ink-700)" }}>
            {pct === null ? source.completedUnits : pct >= 100 ? "done" : `${pct}%`}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-micro" style={{ color: "var(--color-ink-600)" }}>
          <span>Updated {relativeDate(source.updatedAt)}</span>
        </div>

        {expanded && hasUnits && (
          <div className="mt-3 flex flex-col gap-0.5 border-t pt-2.5" style={{ borderColor: "var(--color-hairline-soft)" }}>
            {source.units.map((unit) => {
              const done = unit.completedAt !== null;
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUnit.mutate({ unitId: unit.id, done: !done });
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-left"
                >
                  <span
                    className="grid size-[16px] shrink-0 place-items-center rounded-full text-micro text-white"
                    style={{ background: done ? "var(--color-brand-500)" : "transparent", border: done ? "none" : "1px solid var(--color-ink-300)" }}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-[12.5px]"
                    style={{ color: done ? "var(--color-ink-400)" : "var(--color-ink-700)", textDecoration: done ? "line-through" : "none" }}
                  >
                    {unit.position}. {unit.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TypePickerButton({ type, active, onClick }: { type: StudySourceType; active: boolean; onClick: () => void }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 rounded-[10px] py-2.5 text-micro"
      style={{ background: active ? "var(--color-brand-100)" : "var(--color-ink-50)", color: active ? "var(--color-brand-800)" : "var(--color-ink-600)" }}
    >
      <Icon size={17} weight="regular" aria-hidden="true" />
      {meta.label}
    </button>
  );
}

function AddSourceSheet({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<StudySourceType>("video");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [unitLabel, setUnitLabel] = useState<StudySourceUnitLabel>("lessons");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      api.addStudySource({
        // detectSourceType still recognizes a pasted YouTube/Nicos Weg URL
        // regardless of which picker button is selected — the server does
        // the same detection independently and is the actual source of
        // truth (see POST /sources), this is just so the request's own
        // `type` field isn't obviously wrong before the server corrects it
        type: detectSourceType(url) ?? type,
        title: title.trim(),
        url: url.trim() || null,
        provider: provider.trim() || null,
        totalUnits: totalUnits.trim() ? Number(totalUnits) : null,
        unitLabel,
        autoFetch: true,
      }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not add source"),
  });

  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--color-card)" }}>
      <div className="flex gap-1.5">
        {PICKER_TYPES.map((t) => (
          <TypePickerButton key={t} type={t} active={type === t} onClick={() => setType(t)} />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "book" || type === "audio" ? "Title (searched for real metadata)" : "Title"}
          className="box-border w-full rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
          style={{ background: "var(--color-ink-50)", color: "var(--color-ink-900)", border: "1px solid var(--color-hairline)" }}
        />
        <div className="flex gap-2">
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Provider / author"
            className="box-border min-w-0 flex-1 rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
            style={{ background: "var(--color-ink-50)", color: "var(--color-ink-900)", border: "1px solid var(--color-hairline)" }}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="box-border min-w-0 flex-1 rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
            style={{ background: "var(--color-ink-50)", color: "var(--color-ink-900)", border: "1px solid var(--color-hairline)" }}
          />
        </div>

        {type !== "link" && (
          <div className="flex gap-2">
            <input
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Total units"
              inputMode="numeric"
              className="box-border w-28 rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
              style={{ background: "var(--color-ink-50)", color: "var(--color-ink-900)", border: "1px solid var(--color-hairline)" }}
            />
            <select
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value as StudySourceUnitLabel)}
              className="box-border min-w-0 flex-1 rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
              style={{ background: "var(--color-ink-50)", color: "var(--color-ink-900)", border: "1px solid var(--color-hairline)" }}
            >
              {Object.entries(UNIT_LABEL_META).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          disabled={!title.trim() && !url.trim()}
          onClick={() => add.mutate()}
          className="mt-1 min-h-[40px] rounded-[10px] text-[13.5px] font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(160deg,var(--color-brand-solid-light),var(--color-brand-solid))" }}
        >
          Add source
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-danger-700)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const FEED_ICONS: Record<ActivityFeedEntry["kind"], { icon: typeof CheckCircle; color: string }> = {
  lesson: { icon: CheckCircle, color: "var(--color-brand-700)" },
  manual: { icon: CheckCircle, color: "var(--color-brand-700)" },
  completed: { icon: Trophy, color: "var(--color-danger-700)" },
  added: { icon: PlusCircle, color: "var(--color-ink-400)" },
};

/** Milestones only (turn 10a) — lesson/session completions, "finished this
 * source" trophies, and new-source-adds. No more routine per-link "Saved:
 * X" spam (that came from seeding 16 SavedLink rows at once, a concept
 * that no longer exists — links are ordinary sources now, added one at a
 * time), and no filter-chip row — just the feed and a "load more". */
function ActivityFeed() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["learning", "sourcesActivity"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => api.sourcesActivity({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--color-card)" }}>
      <span className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-400)" }}>
        Recent activity
      </span>
      {entries.length === 0 ? (
        <p className="mt-3 text-[12.5px]" style={{ color: "var(--color-ink-600)" }}>
          Nothing logged yet — add a source above to get started.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          {entries.slice(0, 8).map((e) => {
            const { icon: Icon, color } = FEED_ICONS[e.kind];
            return (
              <div key={e.id} className="flex items-start gap-2.5 text-[12.5px]">
                <Icon size={15} weight="regular" style={{ color, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <span style={{ color: "var(--color-ink-700)" }}>
                    {e.sourceTitle && e.kind !== "added" && <span className="font-medium">{e.sourceTitle} — </span>}
                    {e.title}
                  </span>
                  <div className="text-micro" style={{ color: "var(--color-ink-600)" }}>
                    {new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasNextPage && (
        <button type="button" onClick={() => fetchNextPage()} className="mt-2.5 text-[11.5px] font-medium" style={{ color: "var(--color-brand-700)" }}>
          View all
        </button>
      )}
    </div>
  );
}

function SourceGrid({ sources, empty }: { sources: StudySource[]; empty: ReactNode }) {
  if (sources.length === 0) return <>{empty}</>;
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {sources.map((s) => (
        <SourceRow key={s.id} source={s} />
      ))}
    </div>
  );
}

export default function Sources() {
  const { goBack, backLabel } = useNavStack();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const [filter, setFilter] = useState<"all" | StudySourceType>("all");
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading || !data) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "var(--color-paper)" }} />;
  }

  const sources = data.sources;
  // Extensible: one chip per type actually in use, not a hardcoded list —
  // a type nobody has any sources of yet doesn't clutter the row.
  const typesPresent = Array.from(new Set(sources.map((s) => s.type))).sort(
    (a, b) => PICKER_TYPES.indexOf(a) - PICKER_TYPES.indexOf(b) || a.localeCompare(b),
  );
  const filters: { key: "all" | StudySourceType; label: string }[] = [
    { key: "all", label: "All" },
    ...typesPresent.map((t) => ({ key: t, label: TYPE_META[t].label })),
  ];
  const shown = filter === "all" ? sources : sources.filter((s) => s.type === filter);
  const withPct = sources.filter((s) => s.percent !== null);
  const overallPct = withPct.length === 0 ? 0 : Math.round(withPct.reduce((a, s) => a + (s.percent ?? 0), 0) / withPct.length);
  const activeCount = sources.filter((s) => s.percent === null || s.percent < 100).length;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] lg:hidden"
      style={{ background: "radial-gradient(110% 38% at 22% 4%, var(--color-ink-50), var(--color-paper) 58%)" }}
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "var(--color-ink-600)" }}>
        <button type="button" onClick={goBack} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-[5px] text-[12.5px] font-medium" style={{ color: "var(--color-brand-700)" }}>
          <Plus size={14} weight="regular" aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="mt-2.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
        Sources
      </div>
      <div className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-400)" }}>
        {sources.length} source{sources.length === 1 ? "" : "s"} · {activeCount} active · {overallPct}% through everything you've added
      </div>

      <div className="mt-3.5 flex gap-1.5 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="shrink-0 rounded-full px-[11px] py-[5px] text-[12px] whitespace-nowrap"
            style={{ background: filter === f.key ? "var(--color-brand-100)" : "var(--color-ink-50)", color: filter === f.key ? "var(--color-brand-800)" : "var(--color-ink-600)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="mt-3">
          <AddSourceSheet onClose={() => setShowAdd(false)} />
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-4">
        <SourceGrid
          sources={shown}
          empty={
            <p className="py-8 text-center text-[13.5px]" style={{ color: "var(--color-ink-600)" }}>
              No sources yet — add one above.
            </p>
          }
        />
        <div className="mt-2.5">
          <ActivityFeed />
        </div>
      </div>
    </div>

    {/* Desktop (lg+) — a real Sources layout, not delegated to a shared
        component with Syllabus (an earlier pass had one; its 3rd column
        only ever reused SourceRow, so /plan/sources and /plan/syllabus
        rendered pixel-identical screens at lg and the Activity feed +
        Saved Links were unreachable at desktop width entirely — that
        shared component is gone now, see SyllabusDesktop.tsx for
        Syllabus's own independent lg layout). Two columns instead:
        source grid (with the same header/progress/filter/add controls as
        mobile) on the left, milestone activity on the right. */}
    <div className="hidden lg:grid lg:grid-cols-[1fr_260px] lg:gap-5">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[19px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
              Sources
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-ink-400)" }}>
              {sources.length} source{sources.length === 1 ? "" : "s"} · {activeCount} active · {overallPct}% through everything you've added
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-[5px] rounded-[10px] px-3 py-2 text-[12.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,var(--color-brand-solid-light),var(--color-brand-solid))" }}
          >
            <Plus size={14} weight="regular" aria-hidden="true" />
            Add source
          </button>
        </div>

        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="rounded-full px-[11px] py-[5px] text-[12px] whitespace-nowrap"
              style={{ background: filter === f.key ? "var(--color-brand-100)" : "var(--color-ink-50)", color: filter === f.key ? "var(--color-brand-800)" : "var(--color-ink-600)" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {showAdd && <AddSourceSheet onClose={() => setShowAdd(false)} />}

        <SourceGrid
          sources={shown}
          empty={
            <p className="py-8 text-center text-[13.5px]" style={{ color: "var(--color-ink-600)" }}>
              No sources yet — add one above.
            </p>
          }
        />
      </div>

      <div className="flex flex-col gap-3.5">
        <ActivityFeed />
      </div>
    </div>
    </>
  );
}

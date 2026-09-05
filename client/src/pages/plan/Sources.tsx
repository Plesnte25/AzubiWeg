import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CaretLeft, HandTap, Plus, Trash } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { StudySource, StudySourceType } from "../../api/types";
import { useNavStack } from "../../lib/navStack";
import { toast } from "../../components/ui/Toast";
import { youTubeVideoIdFromUrl } from "../../lib/youtube";
import { nicosWegCourseIdFromUrl } from "../../lib/nicosweg";
import { invalidateHub } from "../learning-hub/queryHelpers";

type FilterKey = "all" | StudySourceType;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "all" },
  { key: "youtube", label: "YouTube" },
  { key: "nicos_weg", label: "Nicos Weg" },
  { key: "other", label: "other" },
];

function detectSourceType(url: string): StudySourceType {
  if (youTubeVideoIdFromUrl(url)) return "youtube";
  if (nicosWegCourseIdFromUrl(url)) return "nicos_weg";
  return "other";
}

/** Exported for reuse by the desktop paired Syllabus+Sources screen
 * (SyllabusSourcesDesktop.tsx).
 *
 * A source with real per-lesson data (`units`, scraped from a playlist)
 * expands on tap into that lesson list instead of blindly marking
 * whichever unit happens to be `next` done — the user picks the specific
 * video they actually watched. A manually-added source with no unit data
 * has nothing to pick from, so it keeps the old one-tap "log a session"
 * bump (`logSourceProgress`) as a fallback. */
export function SourceRow({ source }: { source: StudySource }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const hasUnits = source.units.length > 0;

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
  const pctLabel = pct === null ? `${source.completedUnits}` : pct >= 100 ? "done" : `${pct}%`;
  const pctColor = pct !== null && pct >= 100 ? "#b5abfc" : pct !== null && pct >= 60 ? "#d2cefd" : "rgba(233,233,237,.75)";
  const live = pct !== null && pct > 0 && pct < 100;

  return (
    <div
      className="rounded-xl p-[13px]"
      style={{ background: live ? "linear-gradient(160deg,#252338,#20222f)" : "#1c1f2c", boxShadow: live ? "0 0 0 1px #3a3559" : "none" }}
    >
      <div onClick={() => (hasUnits ? setExpanded((v) => !v) : bump.mutate())} className="flex cursor-pointer items-center gap-[11px]">
        <div
          className="grid size-[34px] shrink-0 place-items-center rounded-[10px] text-[13px] font-medium"
          style={{ background: live ? "rgba(145,132,217,.18)" : "#292b31", color: live ? "#d2cefd" : "rgba(233,233,237,.6)" }}
        >
          {source.title[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-medium">{source.title}</div>
          <div className="mt-px truncate text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {source.type === "youtube" ? "YouTube" : source.type === "nicos_weg" ? "Nicos Weg" : "Source"}
            {source.totalUnits ? ` · ${source.completedUnits}/${source.totalUnits} lessons` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-medium" style={{ color: pctColor }}>
            {pctLabel}
          </div>
        </div>
      </div>
      <div className="mt-[11px] h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
        <div
          className="h-full rounded-[3px] transition-[width] duration-500"
          style={{ width: `${pct ?? Math.min(100, source.completedUnits * 10)}%`, background: pct !== null && pct >= 100 ? "#b5abfc" : "linear-gradient(90deg,#5d5294,#9184d9)" }}
        />
      </div>

      {expanded && hasUnits && (
        <div className="mt-3 flex flex-col gap-0.5 border-t pt-2.5" style={{ borderColor: "rgba(233,233,237,.08)" }}>
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
                  className="grid size-[16px] shrink-0 place-items-center rounded-full text-[9px] text-white"
                  style={{ background: done ? "#9184d9" : "transparent", border: done ? "none" : "1px solid rgba(233,233,237,.3)" }}
                >
                  {done ? "✓" : ""}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-[12.5px]"
                  style={{ color: done ? "rgba(233,233,237,.45)" : "rgba(233,233,237,.85)", textDecoration: done ? "line-through" : "none" }}
                >
                  {unit.position}. {unit.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddSourceSheet({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => api.addStudySource({ type: detectSourceType(url), title: title.trim(), url: url.trim() || null, autoFetch: true }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not add source"),
  });

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
      <div className="flex flex-col gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a URL (YouTube, Nicos Weg, course…)"
          className="box-border w-full rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
          style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
        />
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="box-border min-w-0 flex-1 rounded-[10px] px-3 py-2 text-[13.5px] outline-none"
            style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
          />
          <button
            type="button"
            disabled={!url.trim() && !title.trim()}
            onClick={() => add.mutate()}
            className="shrink-0 rounded-[10px] px-3.5 text-[13.5px] font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            Add
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#e4c4b6" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ActivityFeed() {
  const [filter, setFilter] = useState<"all" | "lessons" | "links">("all");
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["learning", "sourcesActivity", filter],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => api.sourcesActivity({ cursor: pageParam, type: filter }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Activity
        </span>
        <div className="flex gap-1">
          {(["all", "lessons", "links"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full px-2 py-0.5 text-[10.5px] capitalize"
              style={{ background: filter === f ? "rgba(145,132,217,.22)" : "#20222f", color: filter === f ? "#d2cefd" : "rgba(233,233,237,.6)" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-[12.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
          Nothing logged yet — tap a source above to log today's session.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} className="flex gap-2.5 border-t pt-2 text-[12.5px] first:border-t-0 first:pt-0" style={{ borderColor: "rgba(233,233,237,.06)" }}>
              <span className="w-10 shrink-0 text-[10px]" style={{ color: "rgba(233,233,237,.35)" }}>
                {new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span style={{ color: "rgba(233,233,237,.75)" }}>
                {e.sourceTitle && <span className="font-medium">{e.sourceTitle} — </span>}
                {e.title}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasNextPage && (
        <button type="button" onClick={() => fetchNextPage()} className="mt-2.5 text-[11.5px] font-medium" style={{ color: "#b5abfc" }}>
          Load earlier activity
        </button>
      )}
    </div>
  );
}

function SavedLinksSection() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["learning", "savedLinks"], queryFn: api.savedLinks });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteSavedLink(id),
    onSuccess: () => invalidateHub(queryClient),
  });
  const links = data?.links ?? [];
  if (links.length === 0) return null;

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
      <span className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
        Saved links · {links.length}
      </span>
      <div className="mt-2 flex flex-col gap-1.5">
        {links.slice(0, 6).map((link) => (
          <div key={link.id} className="group flex items-center gap-2 text-[13px]">
            <a href={link.url} target={link.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="min-w-0 flex-1 truncate font-medium" style={{ color: "#b5abfc" }}>
              {link.title}
            </a>
            <button type="button" onClick={() => remove.mutate(link.id)} style={{ color: "rgba(233,233,237,.35)" }}>
              <Trash size={13} weight="regular" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sources() {
  const { goBack, backLabel } = useNavStack();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading || !data) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#161826" }} />;
  }

  const sources = data.sources;
  const shown = filter === "all" ? sources : sources.filter((s) => s.type === filter);
  const withPct = sources.filter((s) => s.percent !== null);
  const overallPct = withPct.length === 0 ? 0 : Math.round(withPct.reduce((a, s) => a + (s.percent ?? 0), 0) / withPct.length);
  const activeCount = sources.filter((s) => s.percent === null || s.percent < 100).length;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] lg:hidden"
      style={{ background: "radial-gradient(110% 38% at 22% 4%, #23253a, #161826 58%)" }}
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
        <button type="button" onClick={goBack} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-[5px] text-[12.5px] font-medium" style={{ color: "#b5abfc" }}>
          <Plus size={14} weight="regular" aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="mt-2.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
        Sources
      </div>
      <div className="mt-0.5 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
        {sources.length} resources · {activeCount} active
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <div className="h-[6px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
          <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${overallPct}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
        </div>
        <span className="text-[11px] whitespace-nowrap" style={{ color: "rgba(233,233,237,.5)" }}>
          {overallPct}% through them all
        </span>
      </div>

      <div className="mt-3.5 flex gap-1.5 overflow-hidden">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="rounded-full px-[11px] py-[5px] text-[12px] whitespace-nowrap"
            style={{ background: filter === f.key ? "rgba(145,132,217,.22)" : "#20222f", color: filter === f.key ? "#d2cefd" : "rgba(233,233,237,.6)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
        <HandTap size={13} weight="regular" aria-hidden="true" />
        Tap a source to see its lessons, or log a session
      </div>

      {showAdd && (
        <div className="mt-3">
          <AddSourceSheet onClose={() => setShowAdd(false)} />
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-4">
        {shown.length === 0 ? (
          <p className="py-8 text-center text-[13.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
            No sources yet — add one above.
          </p>
        ) : (
          shown.map((s) => <SourceRow key={s.id} source={s} />)
        )}

        <ActivityFeed />
        <SavedLinksSection />
      </div>
    </div>

    {/* Desktop (lg+) — a real Sources layout, not delegated to
        SyllabusSourcesDesktop: that shared component's 3rd column only ever
        reused SourceRow, so /plan/sources and /plan/syllabus rendered
        pixel-identical screens at lg and the Activity feed + Saved Links
        were unreachable at desktop width entirely. Two columns instead:
        source list (with the same header/progress/filter/add controls as
        mobile) on the left, Activity + Saved Links on the right. */}
    <div className="hidden lg:grid lg:grid-cols-[1fr_340px] lg:gap-5">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[19px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
              Sources
            </div>
            <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {sources.length} resources · {activeCount} active
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-[5px] rounded-[10px] px-3 py-2 text-[12.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <Plus size={14} weight="regular" aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-[6px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
            <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${overallPct}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
          </div>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "rgba(233,233,237,.5)" }}>
            {overallPct}% through them all
          </span>
        </div>

        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="rounded-full px-[11px] py-[5px] text-[12px] whitespace-nowrap"
              style={{ background: filter === f.key ? "rgba(145,132,217,.22)" : "#20222f", color: filter === f.key ? "#d2cefd" : "rgba(233,233,237,.6)" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {showAdd && <AddSourceSheet onClose={() => setShowAdd(false)} />}

        <div className="flex flex-col gap-2.5">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-[13.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
              No sources yet — add one above.
            </p>
          ) : (
            shown.map((s) => <SourceRow key={s.id} source={s} />)
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <ActivityFeed />
        <SavedLinksSection />
      </div>
    </div>
    </>
  );
}

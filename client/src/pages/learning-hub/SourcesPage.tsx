import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { ActivityFeedFilter, RoadmapSkill, StudySource, StudySourceType } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { nicosWegCourseIdFromUrl } from "../../lib/nicosweg";
import { youTubePlaylistIdFromUrl, youTubeThumbUrl, youTubeVideoIdFromUrl, youTubeWatchUrl } from "../../lib/youtube";
import { invalidateHub } from "./queryHelpers";

/** Detected silently from the URL, never asked of the user — see the
 * add-row: no type chips, just a title and a URL. */
function detectSourceType(url: string): StudySourceType {
  if (youTubePlaylistIdFromUrl(url) || youTubeVideoIdFromUrl(url)) return "youtube";
  if (nicosWegCourseIdFromUrl(url)) return "nicos_weg";
  return "other";
}

// "notes" was dropped as a separate filter — a note is always attached to a
// lesson completion in this data model (there's no freestanding note
// entity), so it was a strict subset of "Lessons" and never surfaced
// anything new.
const FEED_FILTERS: { key: ActivityFeedFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lessons", label: "Lessons" },
  { key: "links", label: "Links" },
];

const RESOURCE_SKILL_LABEL: Record<RoadmapSkill, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  bureaucracy: "Context",
  milestone: "Exams",
  reflection: "Reflection",
};

function thumbVideoId(source: StudySource): string | null {
  const first = source.units.find((u) => u.videoId);
  if (first?.videoId) return first.videoId;
  return source.url ? youTubeVideoIdFromUrl(source.url) : null;
}

function ContinueHero({ source }: { source: StudySource }) {
  const queryClient = useQueryClient();
  const nextUnit = source.units.find((u) => u.completedAt === null);
  const thumbId = thumbVideoId(source);
  const url = nextUnit?.videoId ? youTubeWatchUrl(nextUnit.videoId, null) : (nextUnit?.url ?? source.url);

  const markDone = useMutation({
    mutationFn: () => (nextUnit ? api.toggleSourceUnit(source.id, nextUnit.id, true) : api.logSourceProgress(source.id, 1)),
    onSuccess: () => invalidateHub(queryClient),
  });

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-ink-900 p-4 text-white">
      <div className="h-[60px] w-[88px] shrink-0 overflow-hidden rounded-[9px] bg-[var(--color-surface-dark-1)]">
        {thumbId && <img src={youTubeThumbUrl(thumbId)} alt="" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.09em] text-ink-400">CONTINUE WHERE YOU STOPPED</p>
        <p className="truncate text-[15px] font-bold">{nextUnit?.title ?? source.title}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-dark-1)]">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${source.percent ?? 0}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-ink-400">
          {source.title} · {source.percent ?? 0}%
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline">
            Watch <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
        <button
          onClick={() => markDone.mutate()}
          className="rounded-md border border-[var(--color-surface-dark-3)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface-dark-1)]"
        >
          Mark done
        </button>
      </div>
    </div>
  );
}

function AddSourceRow() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => api.addStudySource({ type: detectSourceType(url), title: title.trim(), url: url.trim() || null, autoFetch: true }),
    onSuccess: () => {
      invalidateHub(queryClient);
      setUrl("");
      setTitle("");
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not add source"),
  });

  return (
    <div className="rounded-[14px] border border-hairline bg-card p-3">
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-[2] rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400"
          placeholder="Add a source — paste a URL (YouTube, DW, course…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm placeholder:text-ink-400"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!url.trim() && !title.trim()}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Add →
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

function SourceProgressRow({ source }: { source: StudySource }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const remove = useMutation({
    mutationFn: () => api.deleteStudySource(source.id),
    onSuccess: () => invalidateHub(queryClient),
  });
  const toggleUnit = useMutation({
    mutationFn: ({ unitId, done }: { unitId: string; done: boolean }) => api.toggleSourceUnit(source.id, unitId, done),
    onSuccess: () => invalidateHub(queryClient),
  });
  const logProgress = useMutation({
    mutationFn: (delta: number) => api.logSourceProgress(source.id, delta),
    onSuccess: () => invalidateHub(queryClient),
  });

  return (
    <div>
      <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{source.title}</span>
        <span className="shrink-0 text-xs text-ink-400">{source.percent === null ? `${source.completedUnits}` : `${source.percent}%`}</span>
      </button>
      {source.percent !== null ? (
        <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-ink-900" style={{ width: `${source.percent}%` }} />
        </div>
      ) : (
        <p className="text-[10px] text-ink-400">no total set — count only</p>
      )}
      {expanded && (
        <div className="mt-2 space-y-2 rounded-lg border border-hairline bg-paper p-2">
          {source.units.length > 0 ? (
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {source.units.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-card">
                  <input type="checkbox" className="accent-brand-500" checked={u.completedAt !== null} onChange={(e) => toggleUnit.mutate({ unitId: u.id, done: e.target.checked })} />
                  <span className={`min-w-0 flex-1 truncate ${u.completedAt !== null ? "text-ink-400 line-through" : ""}`}>{u.title}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => logProgress.mutate(1)}>
                +1 lesson
              </Button>
              <Button size="sm" variant="outline" disabled={source.completedUnits === 0} onClick={() => logProgress.mutate(-1)}>
                −1
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Attachments files={source.files} parent={{ studySourceId: source.id }} onChanged={() => invalidateHub(queryClient)} />
            <button
              onClick={() => confirm(`Delete "${source.title}"?`) && remove.mutate()}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-danger-600"
            >
              <Trash2 className="size-3" aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedLinksCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["learning", "savedLinks"], queryFn: api.savedLinks });
  const [filter, setFilter] = useState<RoadmapSkill | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const remove = useMutation({ mutationFn: (id: string) => api.deleteSavedLink(id), onSuccess: () => invalidateHub(queryClient) });

  const links = data?.links ?? [];
  const visible = filter === "all" ? links : links.filter((l) => l.skill === filter);
  const shown = showAll ? visible : visible.slice(0, 3);
  const skillsPresent = [...new Set(links.map((l) => l.skill).filter((s): s is RoadmapSkill => !!s))];

  return (
    <div className="rounded-[13px] border border-hairline p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Saved links · {links.length}</p>
        {visible.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            title={showAll ? "Show fewer" : "Show all"}
            className="flex items-center gap-0.5 text-ink-400 hover:text-brand-500"
          >
            <ChevronDown className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button onClick={() => setFilter("all")} className={`rounded-full px-2 py-0.5 text-[11px] ${filter === "all" ? "bg-ink-900 text-white" : "bg-paper text-ink-600"}`}>
          All
        </button>
        {skillsPresent.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-2 py-0.5 text-[11px] ${filter === s ? "bg-ink-900 text-white" : "bg-paper text-ink-600"}`}>
            {RESOURCE_SKILL_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="mt-2 divide-y divide-hairline">
        {shown.map((link) => (
          <div key={link.id} className="group flex items-center gap-2 py-1.5 text-sm">
            <a href={link.url} target={link.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand-500 hover:underline">
              {link.title}
            </a>
            <button onClick={() => remove.mutate(link.id)} className="hidden text-ink-400 hover:text-danger-600 group-hover:block">
              <Trash2 className="size-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vault-synced lesson notes can run to a dozen+ lines of transcript-style
 * text — clamp to 2 lines with an expand toggle so one entry doesn't take
 * over the whole feed. */
function FeedNote({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = notes.length > 140 || notes.split("\n").length > 2;
  return (
    <div className="mt-1 rounded-md bg-paper px-2 py-1 text-xs text-ink-600">
      <p className={expanded ? "whitespace-pre-wrap" : "line-clamp-2"}>{notes}</p>
      {isLong && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-0.5 font-medium text-brand-500 hover:underline">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ActivityFeedCard() {
  const [filter, setFilter] = useState<ActivityFeedFilter>("all");
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["learning", "sourcesActivity", filter],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => api.sourcesActivity({ cursor: pageParam, type: filter }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = new Date(e.at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="rounded-2xl border border-hairline p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">Activity</p>
        <div className="flex gap-1">
          {FEED_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-2.5 py-0.5 text-xs ${filter === f.key ? "bg-ink-900 text-white" : "bg-paper text-ink-600"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">Nothing logged yet — finish a lesson or save a link to see it here.</p>
      ) : (
        [...groups.entries()].map(([day, rows]) => (
          <div key={day}>
            <p className="mt-3 text-[11px] font-bold text-ink-400">{day.toUpperCase()}</p>
            {rows.map((e) => (
              <div key={e.id} className="flex gap-3 border-t border-hairline py-2.5 first:border-t-0">
                <span className="w-[46px] shrink-0 text-[10.5px] text-ink-400">{new Date(e.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px]">
                    {e.sourceTitle && <span className="font-semibold">{e.sourceTitle} — </span>}
                    {e.title}
                  </p>
                  {e.notes && <FeedNote notes={e.notes} />}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="mt-3 text-xs font-medium text-brand-500 hover:underline">
          Load earlier activity
        </button>
      )}
    </div>
  );
}

export function SourcesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const { data: linksData } = useQuery({ queryKey: ["learning", "savedLinks"], queryFn: api.savedLinks });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sources = data.sources;
  const activeCount = sources.filter((s) => s.percent === null || s.percent < 100).length;
  const lessonsDone = sources.reduce((n, s) => n + s.completedUnits, 0);
  const heroSource = [...sources].filter((s) => s.units.length > 0).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-bold">Sources</h1>
          <p className="text-[13px] text-ink-600">
            {activeCount} active · {lessonsDone} lessons done · {linksData?.links.length ?? 0} saved links
          </p>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          {heroSource && <ContinueHero source={heroSource} />}

          <div className="flex rounded-2xl border border-hairline bg-card">
            {[
              { value: String(activeCount), label: "active sources" },
              { value: String(lessonsDone), label: "lessons done" },
              { value: String(linksData?.links.length ?? 0), label: "saved links" },
            ].map((cell, i, arr) => (
              <div key={cell.label} className={`flex-1 px-3.5 py-3 ${i < arr.length - 1 ? "border-r border-hairline" : ""}`}>
                <p className="text-[18px] font-bold">{cell.value}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-400">{cell.label}</p>
              </div>
            ))}
          </div>

          <AddSourceRow />
          <ActivityFeedCard />
        </div>

        <div className="space-y-3">
          <div className="rounded-[13px] border border-hairline p-3.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Source progress</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {sources.length === 0 ? (
                <p className="text-sm text-ink-400">No sources yet.</p>
              ) : (
                sources.map((s) => <SourceProgressRow key={s.id} source={s} />)
              )}
            </div>
          </div>
          <SavedLinksCard />
        </div>
      </div>
    </div>
  );
}

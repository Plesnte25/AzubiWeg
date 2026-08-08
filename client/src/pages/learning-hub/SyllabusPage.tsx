import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { api } from "../../api/client";
import type { CefrLevel } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useShelfPan } from "../../lib/useShelfPan";
import { SKILL_COLORS } from "../../lib/skills";
import { invalidateHub } from "./queryHelpers";
import { deriveStations, stationStatus } from "./stations";
import { StationRoute } from "./StationRoute";
import { StationDetailModal } from "./StationDetailModal";

const LEVEL_LABELS: Record<CefrLevel, string> = { a1: "A1", a2: "A2", b1: "B1" };
const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

function AddItemDialog({ level, theme, onClose }: { level: CefrLevel; theme: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () => api.addSyllabusItem({ level, category: "grammar", theme, title }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
  });
  return (
    <Modal title={`Add item — ${theme}`} onClose={onClose} size="sm" sheetOnSm>
      <div className="space-y-3">
        <input
          autoFocus
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
          placeholder="Item title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button className="w-full" disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
          Add item
        </Button>
      </div>
    </Modal>
  );
}

function AddStationDialog({ level, afterTheme, onClose }: { level: CefrLevel; afterTheme: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState("");
  const [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () => api.addSyllabusItem({ level, category: "skill", theme, title, afterTheme }),
    onSuccess: () => {
      invalidateHub(queryClient);
      onClose();
    },
  });
  return (
    <Modal title="Add custom station" onClose={onClose} size="sm" sheetOnSm>
      <div className="space-y-3">
        <input
          autoFocus
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
          placeholder="Station name"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
          placeholder="First item title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button className="w-full" disabled={!theme.trim() || !title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
          Add station
        </Button>
      </div>
    </Modal>
  );
}

function ExamTargetControl({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(current ?? "");
  const save = useMutation({
    mutationFn: (value: string) => api.setExamTarget(value || null),
    onSuccess: () => {
      invalidateHub(queryClient);
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="font-medium hover:underline">
        {current ?? "set target"}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <input type="date" className="rounded border border-hairline bg-paper px-1.5 py-0.5 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      <button onClick={() => save.mutate(date)} className="font-semibold text-brand-500 hover:underline">
        Save
      </button>
    </span>
  );
}

/** The old always-visible "Search items" input, moved into an on-demand
 * modal — the page body no longer needs to mode-switch between a flat
 * filtered list and the path view depending on whether search is active. */
function SearchModal({
  items,
  onToggle,
  onClose,
}: {
  items: { id: string; title: string; theme: string | null; completedAt: string | null }[];
  onToggle: (id: string, completed: boolean) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = query.trim() ? items.filter((i) => i.title.toLowerCase().includes(query.trim().toLowerCase())) : [];
  return (
    <Modal title="Search items" onClose={onClose} size="sm">
      <input
        autoFocus
        className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
        placeholder="Search items"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="mt-3 max-h-80 divide-y divide-hairline overflow-y-auto rounded-[13px] border border-hairline">
          {matches.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">No items match "{query}".</p>
          ) : (
            matches.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <input type="checkbox" className="accent-brand-500" checked={item.completedAt !== null} onChange={(e) => onToggle(item.id, e.target.checked)} />
                <span className={item.completedAt !== null ? "text-ink-400 line-through" : ""}>{item.title}</span>
                <span className="ml-auto text-xs text-ink-400">{item.theme}</span>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

/** Route Pace, moved out of an always-visible sidebar card into an
 * on-demand compact modal, triggered by the header's circular info CTA. */
function RoutePaceModal({
  routePace,
  replan,
  replanError,
  onClose,
}: {
  routePace: { itemsPerWeek: number; projectedFinishDate: string | null; examTargetDate: string | null; weeksBehindPace: number | null };
  replan: ReturnType<typeof useMutation<unknown, Error, void>>;
  replanError: string | null;
  onClose: () => void;
}) {
  return (
    <Modal title="Route pace" onClose={onClose} size="sm">
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-600">Items/week</span>
          <span className="font-medium">{routePace.itemsPerWeek}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-600">Finish</span>
          <span className="font-medium">{routePace.projectedFinishDate ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-600">Exam target</span>
          <ExamTargetControl current={routePace.examTargetDate} />
        </div>
      </div>
      {routePace.weeksBehindPace !== null && routePace.weeksBehindPace > 0 && (
        <p className="mt-2 text-xs font-medium text-warn-700">
          {routePace.weeksBehindPace} weeks behind target — add {Math.ceil(routePace.weeksBehindPace * 0.5) || 1} items a week to close the gap.
        </p>
      )}
      <Button size="sm" variant="outline" className="mt-3 w-full" loading={replan.isPending} onClick={() => replan.mutate()}>
        Re-plan the route
      </Button>
      {replanError && <p className="mt-1 text-xs text-danger-600">{replanError}</p>}
    </Modal>
  );
}

export function SyllabusPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showPace, setShowPace] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddStation, setShowAddStation] = useState(false);
  const [replanError, setReplanError] = useState<string | null>(null);
  const routeRowRef = useRef<HTMLDivElement>(null);
  const { glideBy } = useShelfPan(routeRowRef);

  // default to the level actually in progress, not always A1 — only once
  // the user hasn't explicitly picked a level pill themselves
  const autoActiveLevel = data?.levels.find((l) => l.percent < 100)?.level ?? data?.levels[data.levels.length - 1]?.level ?? "a1";
  const level = userLevel ?? autoActiveLevel;

  useEffect(() => {
    routeRowRef.current?.scrollTo({ left: 0 });
  }, [level]);

  const invalidate = () => invalidateHub(queryClient);
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleSyllabusItem(id, completed),
    onSuccess: invalidate,
  });
  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deleteSyllabusItem(id),
    onSuccess: invalidate,
  });
  const skipStation = useMutation({
    mutationFn: ({ theme, skipped }: { theme: string; skipped: boolean }) => api.setStationSkipped(level, theme, skipped),
    onSuccess: invalidate,
  });
  const replan = useMutation({
    mutationFn: () => api.replanRoute(level),
    onSuccess: () => {
      invalidate();
      setReplanError(null);
    },
    onError: (e) => setReplanError(e instanceof Error ? e.message : "Could not re-plan"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const levelItems = data.items.filter((i) => i.level === level).sort((a, b) => a.sortOrder - b.sortOrder);
  const stations = deriveStations(levelItems);

  // resolve "current" — first station that isn't fully done/skipped
  let currentIdx = stations.findIndex((s) => stationStatus(s) === "current");
  if (currentIdx === -1) currentIdx = stations.length; // all done — no station is "current"

  // the station shown in the detail modal — purely a function of an
  // explicit click (onSelect from StationRoute), never auto-selected; the
  // modal stays closed until one is picked
  const openStation = selectedStation ? (stations.find((s) => s.theme === selectedStation) ?? null) : null;
  const openIdx = openStation ? stations.findIndex((s) => s.theme === openStation.theme) : -1;
  const openIsPreview = openIdx > currentIdx;
  const openCurrentItem = openStation?.items.find((i) => i.completedAt === null && i.skippedAt === null) ?? openStation?.items[openStation.items.length - 1];

  const levelProgress = data.levels.find((l) => l.level === level);
  const doneItems = levelItems.filter((i) => i.completedAt !== null).length;

  const grammarCount = levelItems.filter((i) => i.category === "grammar").length;
  const grammarDone = levelItems.filter((i) => i.category === "grammar" && i.completedAt !== null).length;
  const vocabCount = levelItems.filter((i) => i.category === "vocab_theme").length;
  const vocabDone = levelItems.filter((i) => i.category === "vocab_theme" && i.completedAt !== null).length;
  const skillCount = levelItems.filter((i) => i.category === "skill").length;
  const skillDone = levelItems.filter((i) => i.category === "skill" && i.completedAt !== null).length;

  const itemMix = (
    <div className="mb-4 flex items-stretch gap-2">
      <div className="flex w-4 shrink-0 items-center justify-center">
        <span
          className="whitespace-nowrap text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Item mix
        </span>
      </div>
      <div className="flex-1 space-y-2">
        {[
          { color: SKILL_COLORS.grammar, done: grammarDone, total: grammarCount },
          { color: SKILL_COLORS.vocab, done: vocabDone, total: vocabCount },
          ...(skillCount > 0 ? [{ color: SKILL_COLORS.bureaucracy, done: skillDone, total: skillCount }] : []),
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full" style={{ width: `${row.total === 0 ? 0 : (row.done / row.total) * 100}%`, backgroundColor: row.color }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs text-ink-600">
              {row.done}/{row.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[21px] font-bold tracking-[-0.02em] sm:text-[23px] md:text-[27px] lg:text-[29px]">
              {LEVEL_LABELS[level]} route · {stations.length} stations
            </h1>
            <p className="text-[13px] text-ink-600">
              {doneItems} of {levelItems.length} items
              {data.routePace.itemsPerWeek > 0 && ` · ${data.routePace.itemsPerWeek} items a week`}
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
            <div className="flex gap-1 rounded-full border border-hairline bg-paper p-1">
              {LEVELS.map((l) => {
                const lp = data.levels.find((x) => x.level === l);
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setUserLevel(l);
                      setSelectedStation(null);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      l === level ? "bg-ink-900 text-white" : lp && lp.percent >= 100 ? "text-ok-600" : "text-ink-400"
                    }`}
                  >
                    {LEVEL_LABELS[l]}
                    {lp && lp.percent >= 100 ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400"
                onClick={() => setShowSearch(true)}
                title="Search items"
              >
                <Search className="size-4" aria-hidden="true" />
              </button>
              <button
                className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400"
                onClick={() => setShowPace(true)}
                title="Route pace"
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* the station-detail panel is anchored right below the header (not
            a centered dialog portaled to document.body) — it's a plain
            child of this relative wrapper, positioned absolute so it drops
            in right under the h1/controls row and scrolls with the page */}
        {openStation && (
          <div className="absolute inset-x-0 top-full z-30 mt-2">
            <StationDetailModal
              station={openStation}
              resolvedIdx={openIdx}
              isPreview={openIsPreview}
              skipped={stationStatus(openStation) === "skipped"}
              currentItemId={!openIsPreview && stationStatus(openStation) === "current" ? openCurrentItem?.id : undefined}
              onToggleItem={(id, completed) => toggle.mutate({ id, completed })}
              onDeleteItem={(id) => deleteItem.mutate(id)}
              onSkip={() => {
                const skipped = stationStatus(openStation) === "skipped";
                if (skipped) {
                  skipStation.mutate({ theme: openStation.theme, skipped: false });
                  return;
                }
                if (confirm(`Skip station "${openStation.theme}"? Its items stay open but the route moves past it.`)) {
                  skipStation.mutate({ theme: openStation.theme, skipped: true });
                }
              }}
              onAddItem={() => setShowAddItem(true)}
              onChanged={invalidate}
              onClose={() => setSelectedStation(null)}
            />
          </div>
        )}
      </div>

      {/* everything below the header blurs (and stops accepting clicks)
          while the detail panel is open, so a station can't be clicked
          through the blur and the panel reads as clearly in-focus */}
      <div className={openStation ? "space-y-4 pointer-events-none blur-sm transition-[filter]" : "space-y-4 transition-[filter]"}>
        {/* A winding curved path with checkpoint nodes, not a straight line —
            RoadmapPage's day-list used to have its own connecting line/bead
            visual but that depended on runtime-measured, variable row heights
            (collapsible cards) and drifted out of alignment; it's since moved
            to plain cards with no path at all. Stations here are a small,
            stable-height list, so an index-driven curved layout
            (StationRoute/routeGeometry.ts, computed purely from
            stations.length + the level as a shape seed) is safe in a way the
            DOM-measured one wasn't — the two pages deliberately don't share a
            technique. */}
        <div className="rounded-[18px] border border-hairline bg-card p-4 lg:hidden">
          {itemMix}
          <StationRoute stations={stations} currentIdx={currentIdx} orientation="vertical" seed={level} onSelect={setSelectedStation} />
        </div>

        {/* lg: item mix stays fixed at the top of this card — only the path
            strip below it scrolls (drag-to-pan via useShelfPan, plus arrow
            buttons for a discrete nudge). Item mix used to live inside the
            same overflow-x-hidden/scrollLeft-driven element as the path
            itself, so panning the path also scrolled item mix out of view —
            it's now a fixed sibling above the scrollable region instead. */}
        <div className="hidden rounded-[18px] border border-hairline bg-card p-4 lg:block">
          {itemMix}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => glideBy(-260)}
              className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-ink-400 hover:border-brand-400 hover:text-brand-500"
              aria-label="Scroll stations left"
            >
              ‹
            </button>
            <div ref={routeRowRef} className="relative flex-1 overflow-x-hidden px-1.5 py-1">
              <StationRoute
                stations={stations}
                currentIdx={currentIdx}
                orientation="horizontal"
                seed={level}
                scrollContainerRef={routeRowRef}
                onSelect={setSelectedStation}
              />
            </div>
            <button
              onClick={() => glideBy(260)}
              className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-ink-400 hover:border-brand-400 hover:text-brand-500"
              aria-label="Scroll stations right"
            >
              ›
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowAddStation(true)}
          className="w-full rounded-[13px] border border-dashed border-hairline p-3 text-center text-sm text-ink-400 shadow-md hover:border-brand-400 hover:text-brand-500"
        >
          <span className="block font-medium">+ Custom station</span>
          <span className="mt-0.5 block text-xs">Add your own unit anywhere on the {LEVEL_LABELS[level]} line.</span>
        </button>

        {levelProgress && levelProgress.percent >= 100 && <p className="text-xs text-ok-600">{LEVEL_LABELS[level]} complete</p>}
      </div>

      {showSearch && (
        <SearchModal
          items={levelItems}
          onToggle={(id, completed) => toggle.mutate({ id, completed })}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showPace && <RoutePaceModal routePace={data.routePace} replan={replan} replanError={replanError} onClose={() => setShowPace(false)} />}
      {showAddItem && openStation && <AddItemDialog level={level} theme={openStation.theme} onClose={() => setShowAddItem(false)} />}
      {showAddStation && <AddStationDialog level={level} afterTheme={openStation?.theme ?? null} onClose={() => setShowAddStation(false)} />}
    </div>
  );
}

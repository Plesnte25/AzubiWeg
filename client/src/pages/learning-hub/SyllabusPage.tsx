import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { CefrLevel, SyllabusItem } from "../../api/types";
import { Attachments } from "../../components/Attachments";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { useShelfPan } from "../../lib/useShelfPan";
import { invalidateHub } from "./queryHelpers";
import { deriveStations, stationStatus } from "./stations";

const LEVEL_LABELS: Record<CefrLevel, string> = { a1: "A1", a2: "A2", b1: "B1" };
const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

/** Merges the 3 legacy fields into one editable value (nothing already
 * written is lost) but every future save writes the whole thing back to
 * `examples` only — `exceptions`/`commonMistakes` are cleared on first edit.
 * See server/src/prisma/schema.prisma's SyllabusItem for why the columns
 * themselves aren't dropped (older rows may still carry real content). */
function mergedNotebookValue(item: SyllabusItem): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

function Notebook({ item, onChanged }: { item: SyllabusItem; onChanged: () => void }) {
  const [draft, setDraft] = useState(mergedNotebookValue(item));
  const update = useMutation({
    mutationFn: (value: string) => api.updateSyllabusNotebook(item.id, { examples: value || null, exceptions: null, commonMistakes: null }),
    onSuccess: onChanged,
  });

  return (
    <div className="mt-2 rounded-[10px] border border-warn-tint-100 bg-card p-2.5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-400">Notes</p>
      <textarea
        className="mt-1 w-full resize-none bg-transparent text-xs outline-none"
        rows={3}
        placeholder="Anything worth remembering about this item…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== mergedNotebookValue(item)) update.mutate(draft);
        }}
      />
    </div>
  );
}

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

export function SyllabusPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleSyllabusItem(id, completed),
    onSuccess: () => invalidateHub(queryClient),
  });
  const skipStation = useMutation({
    mutationFn: ({ theme, skipped }: { theme: string; skipped: boolean }) => api.setStationSkipped(level, theme, skipped),
    onSuccess: () => invalidateHub(queryClient),
  });
  const replan = useMutation({
    mutationFn: () => api.replanRoute(level),
    onSuccess: () => {
      invalidateHub(queryClient);
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
  const searched = search.trim()
    ? levelItems.filter((i) => i.title.toLowerCase().includes(search.trim().toLowerCase()))
    : null;

  // resolve "current" — first station that isn't fully done/skipped
  let currentIdx = stations.findIndex((s) => stationStatus(s) === "current");
  if (currentIdx === -1) currentIdx = stations.length; // all done — no station is "current"

  const activeIdx = selectedStation ? stations.findIndex((s) => s.theme === selectedStation) : currentIdx;
  const activeStation = stations[activeIdx === -1 ? stations.length - 1 : activeIdx] ?? stations[stations.length - 1];
  const resolvedActiveIdx = stations.findIndex((s) => s.theme === activeStation?.theme);
  // previewing a station you haven't reached yet — read-only
  const isPreview = resolvedActiveIdx > currentIdx;

  const levelProgress = data.levels.find((l) => l.level === level);
  const doneItems = levelItems.filter((i) => i.completedAt !== null).length;
  const currentItem = activeStation?.items.find((i) => i.completedAt === null && i.skippedAt === null) ?? activeStation?.items[activeStation.items.length - 1];
  const closedStations = stations.filter((s, i) => i < resolvedActiveIdx && (stationStatus(s) === "done" || stationStatus(s) === "skipped"));

  const grammarCount = levelItems.filter((i) => i.category === "grammar").length;
  const grammarDone = levelItems.filter((i) => i.category === "grammar" && i.completedAt !== null).length;
  const vocabCount = levelItems.filter((i) => i.category === "vocab_theme").length;
  const vocabDone = levelItems.filter((i) => i.category === "vocab_theme" && i.completedAt !== null).length;
  const skillCount = levelItems.filter((i) => i.category === "skill").length;
  const skillDone = levelItems.filter((i) => i.category === "skill" && i.completedAt !== null).length;

  const nextStation = stations[resolvedActiveIdx + 1];
  const itemsUntilNext = activeStation ? activeStation.items.filter((i) => i.completedAt === null && i.skippedAt === null).length : 0;
  const daysForNext = nextStation && data.routePace.itemsPerWeek > 0 ? Math.round((nextStation.items.length / data.routePace.itemsPerWeek) * 7) : null;

  const fillPercent = stations.length === 0 ? 0 : (Math.max(0, currentIdx) / stations.length) * 100;

  return (
    <div className="rounded-[18px] border border-hairline bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-bold md:text-[19px]">
            {LEVEL_LABELS[level]} route · {stations.length} stations
          </h1>
          <p className="text-[12px] text-ink-600 md:text-[13px]">
            {doneItems} of {levelItems.length} items
            {activeStation && ` · you are at station ${resolvedActiveIdx + 1}`}
            {data.routePace.itemsPerWeek > 0 && ` · ${data.routePace.itemsPerWeek} items a week`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <input
            className="w-40 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {searched ? (
        <div className="mt-4 divide-y divide-hairline rounded-[13px] border border-hairline">
          {searched.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">No items match "{search}".</p>
          ) : (
            searched.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <input type="checkbox" className="accent-brand-500" checked={item.completedAt !== null} onChange={(e) => toggle.mutate({ id: item.id, completed: e.target.checked })} />
                <span className={item.completedAt !== null ? "text-ink-400 line-through" : ""}>{item.title}</span>
                <span className="ml-auto text-xs text-ink-400">{item.theme}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* sm/md: vertical stepper — a deliberate change from lg's horizontal
              winding path (more of the route visible without horizontal
              panning on a narrow screen). Same station-status logic/bead
              styling as the lg version below, just laid out top-to-bottom;
              visual language borrowed from RoadmapPage's DayRow timeline for
              consistency across the hub. */}
          <div className="relative mt-5 lg:hidden">
            {stations.map((s, i) => {
              const status = i < currentIdx ? "done" : i === currentIdx ? "current" : "ahead";
              const done = s.items.filter((it) => it.completedAt !== null).length;
              const isLast = i === stations.length - 1;
              return (
                <button
                  key={s.theme + i}
                  onClick={() => setSelectedStation(s.theme)}
                  className="relative flex w-full items-start gap-3 pb-5 text-left last:pb-0"
                >
                  {!isLast && (
                    <span
                      className={`absolute bottom-[-2px] left-[10px] top-[22px] w-[2px] -translate-x-1/2 ${
                        status === "done" ? "bg-ok-600" : "bg-[var(--color-hairline)]"
                      }`}
                    />
                  )}
                  <span className="relative z-10 grid h-[22px] w-5 shrink-0 place-items-center">
                    <span
                      className={`grid place-items-center rounded-full border-4 border-card text-[10px] font-bold text-white ${
                        status === "done"
                          ? "size-4 bg-ok-600"
                          : status === "current"
                            ? "size-[22px] bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-50)]"
                            : "size-3.5 border-2 bg-card text-transparent"
                      }`}
                      style={status === "ahead" ? { borderColor: "var(--color-hairline)" } : undefined}
                    >
                      {status === "current" ? i + 1 : ""}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span
                      className={`block truncate text-[13px] ${status === "current" ? "font-bold" : status === "ahead" ? "text-ink-400" : "text-ink-600"}`}
                    >
                      {s.theme}
                    </span>
                    <span
                      className={`block text-[11px] ${status === "done" ? "text-ok-600" : status === "current" ? "font-semibold text-brand-500" : "text-ink-400"}`}
                    >
                      {done}/{s.items.length}
                      {status === "current" ? " · here" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* lg: click-and-drag panning (useShelfPan) plus arrow buttons at
              both ends for a discrete nudge, not a native scrollbar */}
          <div className="mt-5 hidden items-center gap-1.5 lg:flex">
            <button
              onClick={() => glideBy(-260)}
              className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-ink-400 hover:border-brand-400 hover:text-brand-500"
              aria-label="Scroll stations left"
            >
              ‹
            </button>
            <div ref={routeRowRef} className="relative flex-1 overflow-x-hidden px-1.5 pb-1">
              <div className="relative flex min-w-[840px] justify-between">
              {/* track wrapper: fixes the exact span the fill % is computed against,
                  so it can never diverge from the grey background line's geometry */}
              <div className="absolute left-1.5 right-1.5 top-[11px] h-1 overflow-hidden rounded-full bg-[var(--color-hairline)]">
                <div className="h-full rounded-full bg-ok-600" style={{ width: `${fillPercent}%` }} />
              </div>
              {stations.map((s, i) => {
                const status = i < currentIdx ? "done" : i === currentIdx ? "current" : "ahead";
                const done = s.items.filter((it) => it.completedAt !== null).length;
                return (
                  <button
                    key={s.theme + i}
                    onClick={() => setSelectedStation(s.theme)}
                    className="flex w-[94px] shrink-0 flex-col items-center gap-1 text-center"
                  >
                    {/* fixed-height box, same for every status, so the dot's center
                        always lands on the same y — regardless of its own visual
                        size — matching the track line's fixed top offset below */}
                    <span className="grid h-[22px] w-full place-items-center">
                      <span
                        className={`grid place-items-center rounded-full border-4 border-card text-[10px] font-bold text-white ${
                          status === "done"
                            ? "size-4 bg-ok-600"
                            : status === "current"
                              ? "size-[22px] bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-50)]"
                              : "size-3.5 border-2 bg-card text-transparent"
                        }`}
                        style={status === "ahead" ? { borderColor: "var(--color-hairline)" } : undefined}
                      >
                        {status === "current" ? i + 1 : ""}
                      </span>
                    </span>
                    <span
                      className={`block w-full truncate text-[11.5px] ${status === "current" ? "font-bold" : status === "ahead" ? "text-ink-400" : "text-ink-600"}`}
                    >
                      {s.theme}
                    </span>
                    <span className={`text-[10.5px] ${status === "done" ? "text-ok-600" : status === "current" ? "font-semibold text-brand-500" : "text-ink-400"}`}>
                      {done}/{s.items.length}
                      {status === "current" ? " · here" : ""}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
            <button
              onClick={() => glideBy(260)}
              className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-ink-400 hover:border-brand-400 hover:text-brand-500"
              aria-label="Scroll stations right"
            >
              ›
            </button>
          </div>

          <div className="mt-5 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-3">
              {activeStation && (
                <div className="overflow-hidden rounded-2xl border border-hairline">
                  <div className="flex items-center justify-between bg-paper px-4 py-3">
                    <div>
                      <p className="text-[14.5px] font-bold">
                        Station {resolvedActiveIdx + 1} · {activeStation.theme}
                        {isPreview && <span className="ml-2 rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-400">preview</span>}
                      </p>
                      <p className="text-xs text-ink-400">
                        {activeStation.items.length} items · {activeStation.items.filter((i) => i.completedAt !== null).length}/{activeStation.items.length} closed
                      </p>
                    </div>
                    {!isPreview && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
                          + Item
                        </Button>
                        {stationStatus(activeStation) !== "skipped" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Skip station "${activeStation.theme}"? Its items stay open but the route moves past it.`)) {
                                skipStation.mutate({ theme: activeStation.theme, skipped: true });
                              }
                            }}
                          >
                            Skip station
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => skipStation.mutate({ theme: activeStation.theme, skipped: false })}>
                            Un-skip
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-hairline">
                    {activeStation.items.map((item) => {
                      const isCurrent = currentItem?.id === item.id && stationStatus(activeStation) === "current";
                      return (
                        <div key={item.id} className={`px-4 py-2.5 ${isCurrent ? "bg-[var(--color-brand-50)]" : ""}`}>
                          <div className="flex items-center gap-2.5">
                            <button
                              disabled={isPreview}
                              onClick={() => toggle.mutate({ id: item.id, completed: item.completedAt === null })}
                              className={`grid size-[17px] shrink-0 place-items-center rounded-full border text-[9px] text-white disabled:cursor-not-allowed ${
                                item.completedAt !== null ? "border-ok-600 bg-ok-600" : isCurrent ? "border-2 border-brand-500" : "border-2 border-hairline"
                              }`}
                            >
                              {item.completedAt !== null && "✓"}
                            </button>
                            <span className={`flex-1 text-[13px] ${item.completedAt !== null ? "text-ink-400 line-through" : ""}`}>{item.title}</span>
                            {isCurrent && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">on today</span>}
                            {item.skippedAt && <span className="text-[10px] text-ink-400">skipped</span>}
                            {!isPreview && <Attachments files={item.files} parent={{ syllabusItemId: item.id }} onChanged={() => invalidateHub(queryClient)} />}
                          </div>
                          {!isPreview && isCurrent && item.category === "grammar" && <Notebook item={item} onChanged={() => invalidateHub(queryClient)} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {closedStations.length > 0 && (
                <div className="rounded-2xl border border-hairline p-3.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Stations behind you</p>
                  <div className="mt-2 space-y-1">
                    {closedStations.map((s) => {
                      const skipped = stationStatus(s) === "skipped";
                      return (
                        <button
                          key={s.theme}
                          onClick={() => setSelectedStation(s.theme)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-paper"
                        >
                          <span className="flex items-center gap-1.5 text-ink-400">
                            {skipped ? <span className="text-[10px]">skipped</span> : <span className="text-ok-600">✓</span>}
                            <span>{s.theme}</span>
                          </span>
                          <span className="text-xs font-medium text-brand-500">Revisit</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {nextStation && (
                <div className="rounded-[13px] border border-hairline p-3.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Arriving at station {resolvedActiveIdx + 2}</p>
                  <p className="mt-1 text-sm font-medium">{nextStation.theme}</p>
                  <p className="mt-1 text-xs text-ink-600">
                    Unlocks in {itemsUntilNext} item{itemsUntilNext === 1 ? "" : "s"}. {nextStation.items.length} items
                    {daysForNext !== null && `, roughly ${daysForNext} day${daysForNext === 1 ? "" : "s"} at your pace`}.
                  </p>
                  <button onClick={() => setSelectedStation(nextStation.theme)} className="mt-1.5 text-xs font-semibold text-brand-500 hover:underline">
                    Preview station →
                  </button>
                </div>
              )}

              <div className="rounded-[13px] border border-warn-tint-100 bg-warn-tint-50 p-3.5">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-warn-700">Route pace</p>
                <div className="mt-1.5 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Items/week</span>
                    <span className="font-medium">{data.routePace.itemsPerWeek}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Finish</span>
                    <span className="font-medium">{data.routePace.projectedFinishDate ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">Exam target</span>
                    <ExamTargetControl current={data.routePace.examTargetDate} />
                  </div>
                </div>
                {data.routePace.weeksBehindPace !== null && data.routePace.weeksBehindPace > 0 && (
                  <p className="mt-2 text-xs font-medium text-warn-700">
                    {data.routePace.weeksBehindPace} weeks behind target — add {Math.ceil(data.routePace.weeksBehindPace * 0.5) || 1} items a week to close
                    the gap.
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-2 w-full" loading={replan.isPending} onClick={() => replan.mutate()}>
                  Re-plan the route
                </Button>
                {replanError && <p className="mt-1 text-xs text-danger-600">{replanError}</p>}
              </div>

              <div className="rounded-[13px] border border-hairline p-3.5">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Item mix</p>
                <div className="mt-2 space-y-2">
                  {[
                    { label: "Grammar", done: grammarDone, total: grammarCount },
                    { label: "Vocab", done: vocabDone, total: vocabCount },
                    ...(skillCount > 0 ? [{ label: "Context", done: skillDone, total: skillCount }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2 text-sm">
                      <span className="w-16 shrink-0 text-ink-600">{row.label}</span>
                      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-paper">
                        <div className="h-full rounded-full bg-ink-900" style={{ width: `${row.total === 0 ? 0 : (row.done / row.total) * 100}%` }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-ink-600">
                        {row.done}/{row.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAddStation(true)}
                className="w-full rounded-[13px] border border-dashed border-hairline p-3 text-sm text-ink-400 hover:border-brand-400 hover:text-brand-500"
              >
                <span className="block font-medium">+ Custom station</span>
                <span className="mt-0.5 block text-xs">Add your own unit anywhere on the {LEVEL_LABELS[level]} line.</span>
              </button>
            </div>
          </div>
        </>
      )}

      {levelProgress && levelProgress.percent >= 100 && (
        <p className="mt-2 text-xs text-ok-600">{LEVEL_LABELS[level]} complete</p>
      )}
      {showAddItem && activeStation && <AddItemDialog level={level} theme={activeStation.theme} onClose={() => setShowAddItem(false)} />}
      {showAddStation && <AddStationDialog level={level} afterTheme={activeStation?.theme ?? null} onClose={() => setShowAddStation(false)} />}
    </div>
  );
}

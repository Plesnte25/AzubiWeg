import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Lock } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel, Note } from "../../api/types";
import { useNavStack } from "../../lib/navStack";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { AddItemSheet, LEVEL_LABELS, LEVELS, StationNode } from "./Syllabus";
import { StationAccordion } from "./StationAccordion";
import { StationNotesPanel } from "./StationNotesPanel";
import { deriveStations, stationStatus } from "./stations";
import { TopicWorkspace } from "./StationDetailModal";

/**
 * The Syllabus desktop screen (Claude Design handoff turn 7a) — replaces
 * the old `SyllabusSourcesDesktop` (deleted; that component's 3rd column
 * was a Sources list, redundant with the Sources page having its own real
 * desktop layout since an earlier pass). Column 1 is a real fixed-header +
 * independently-scrolling-timeline split (a structural fix, not just
 * restyling — the old version had one undivided scroll region covering
 * both). Column 2 replaces the click-to-open StationDetailModal with an
 * inline accordion. Column 3 is per-station notes, not Sources.
 */
export function SyllabusDesktop() {
  const { push } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    () => (location.state as { openStationTheme?: string } | null)?.openStationTheme ?? null,
  );
  const [showAddItem, setShowAddItem] = useState(false);
  // Which item the column-3 note composer is currently pointed at — reset
  // whenever the selected station changes, so a note never accidentally
  // gets linked to an item from a station the user has since navigated
  // away from.
  const [composerItemId, setComposerItemId] = useState<string | null>(null);
  const [workspaceItemId, setWorkspaceItemId] = useState<string | null>(null);
  useEffect(() => {
    setComposerItemId(null);
    setWorkspaceItemId(null);
  }, [selectedTheme]);
  const currentStationRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    currentStationRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.toggleSyllabusItem(id, completed),
    onSuccess: () => invalidateHub(queryClient),
  });
  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deleteSyllabusItem(id),
    onSuccess: () => invalidateHub(queryClient),
  });
  const skipStation = useMutation({
    mutationFn: ({ level, theme, skipped }: { level: CefrLevel; theme: string; skipped: boolean }) => api.setStationSkipped(level, theme, skipped),
    onSuccess: () => invalidateHub(queryClient),
  });

  if (isLoading || !data) return null;

  const activeIdx = data.lockStates.indexOf("active");
  const autoActiveLevel = activeIdx === -1 ? LEVELS[LEVELS.length - 1]! : LEVELS[activeIdx]!;
  const level = userLevel ?? autoActiveLevel;
  const levelIdx = LEVELS.indexOf(level);
  const lockState = data.lockStates[levelIdx]!;
  const levelProgress = data.levels.find((l) => l.level === level)!;

  const levelItems = data.items.filter((i) => i.level === level).sort((a, b) => a.sortOrder - b.sortOrder);
  const stations = deriveStations(levelItems);
  let currentIdx = stations.findIndex((s) => stationStatus(s) === "current");
  if (currentIdx === -1) currentIdx = stations.length;

  const effectiveTheme = selectedTheme ?? stations[Math.min(currentIdx, stations.length - 1)]?.theme ?? stations[0]?.theme ?? null;
  const selectedIdx = effectiveTheme ? stations.findIndex((s) => s.theme === effectiveTheme) : -1;
  const selectedStation = selectedIdx >= 0 ? stations[selectedIdx]! : null;

  const priorLevel = levelIdx > 0 ? LEVELS[levelIdx - 1] : null;
  const priorProgress = priorLevel ? data.levels.find((l) => l.level === priorLevel) : null;
  const priorExamGate = priorLevel ? data.examGate[levelIdx - 1] : null;

  const currentItemId =
    selectedStation && selectedIdx === currentIdx
      ? (selectedStation.items.find((it) => it.completedAt === null && it.skippedAt === null)?.id ?? undefined)
      : undefined;
  const effectiveComposerItemId = composerItemId ?? currentItemId ?? selectedStation?.items[0]?.id ?? null;

  return (
    <StationNotesLoader
      station={selectedStation}
      level={level}
      renderMiddleAndRight={(notes) => (
        <div className="grid w-full min-h-0 grid-cols-[340px_1fr_300px] gap-5">
          {/* Column 1 — fixed header, then an independently-scrolling
              timeline below a divider (see the module doc comment). */}
          <div className="flex min-h-0 flex-col">
            <div className="flex-none">
              <div className="flex items-center justify-between">
                <div className="text-[22px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
                  Syllabus
                </div>
                <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--color-ink-50)" }}>
                  {LEVELS.map((l) => {
                    const ls = data.lockStates[LEVELS.indexOf(l)]!;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setUserLevel(l);
                          setSelectedTheme(null);
                        }}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                        style={{ background: l === level ? "var(--color-brand-500)" : "transparent", color: l === level ? "var(--color-paper)" : ls === "done" ? "var(--color-brand-700)" : "var(--color-ink-600)" }}
                      >
                        {ls === "locked" && <Lock size={9} weight="fill" aria-hidden="true" />}
                        {LEVEL_LABELS[l]}
                        {ls === "done" ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-ink-400)" }}>
                {LEVEL_LABELS[level]} route · {stations.length} station{stations.length === 1 ? "" : "s"} · {levelProgress.percent}%
              </div>
              <div className="mt-2 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "var(--color-hairline-soft)" }}>
                <div className="h-full rounded-[3px]" style={{ width: `${levelProgress.percent}%`, background: "linear-gradient(90deg,var(--color-brand-solid),var(--color-brand-700))" }} />
              </div>

              {lockState === "locked" && (
                <div className="mt-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--color-hairline-soft)" }}>
                  <Lock size={14} weight="regular" style={{ color: "var(--color-ink-400)", flexShrink: 0 }} aria-hidden="true" />
                  <p className="text-[11.5px]" style={{ color: "var(--color-ink-600)" }}>
                    {priorProgress && priorProgress.percent < 100
                      ? `Finish ${LEVEL_LABELS[priorLevel!]} first — previewing read-only.`
                      : priorExamGate?.hasContent
                        ? `Pass the ${LEVEL_LABELS[priorLevel!]} exam to unlock — previewing read-only.`
                        : `Unlocks after ${LEVEL_LABELS[priorLevel!]} — previewing read-only.`}
                  </p>
                </div>
              )}

              <div className="mt-4 h-px" style={{ background: "var(--color-hairline-soft)" }} />
              <div className="mt-3 text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-ink-600)" }}>
                Full path · {stations.length} station{stations.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingLeft: 4 }}>
              {stations.map((station, i) => {
                const status = lockState === "locked" ? "upcoming" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
                return (
                  <div key={station.theme} ref={status === "current" ? currentStationRef : undefined}>
                    <StationNode station={station} index={i} status={status} isLast={i === stations.length - 1} onOpen={() => setSelectedTheme(station.theme)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2 — inline accordion station detail */}
          <div className="min-h-0">
            {selectedStation ? (
            <>
              <StationAccordion
                station={selectedStation}
                resolvedIdx={selectedIdx}
                isPreview={lockState === "locked" || selectedIdx > currentIdx}
                skipped={stationStatus(selectedStation) === "skipped"}
                currentItemId={currentItemId}
                noteCountByItemId={
                  new Map(selectedStation.items.map((item) => [item.id, notes.filter((n) => n.syllabusItemId === item.id).length]))
                }
                onToggleItem={(id, completed) => toggle.mutate({ id, completed })}
                onDeleteItem={(id) => deleteItem.mutate(id)}
                onAddItem={() => setShowAddItem(true)}
                onSkip={() => {
                  const skipped = stationStatus(selectedStation) === "skipped";
                  if (skipped) {
                    skipStation.mutate({ level, theme: selectedStation.theme, skipped: false });
                    return;
                  }
                  if (confirm(`Skip station "${selectedStation.theme}"? Its items stay open but the route moves past it.`)) {
                    skipStation.mutate({ level, theme: selectedStation.theme, skipped: true });
                  }
                }}
                onStudy={(item) => setWorkspaceItemId(item.id)}
                onPractice={(item) => {
                  if (item.roadmapTaskId) push("/plan", { state: { openTaskId: item.roadmapTaskId } });
                }}
                onAddNote={(item) => setComposerItemId(item.id)}
              />
              {workspaceItemId && (
                <TopicWorkspace
                  itemId={workspaceItemId}
                  onCompleted={() => {
                    invalidateHub(queryClient);
                    setWorkspaceItemId(null);
                  }}
                  onClose={() => setWorkspaceItemId(null)}
                />
              )}
            </>
          ) : (
              <div className="grid h-full place-items-center text-[13px]" style={{ color: "var(--color-ink-600)" }}>
                No stations yet.
              </div>
            )}

            {showAddItem && selectedStation && (
              <AddItemSheet level={level} theme={selectedStation.theme} onClose={() => setShowAddItem(false)} onAdded={() => invalidateHub(queryClient)} />
            )}
          </div>

          {/* Column 3 — per-station notes, replacing Sources entirely */}
          <div className="min-h-0">
            {selectedStation ? (
              <StationNotesPanel
                station={selectedStation}
                notes={notes}
                composerItemId={effectiveComposerItemId}
                onComposerItemChange={setComposerItemId}
              />
            ) : (
              <div className="grid h-full place-items-center text-[13px]" style={{ color: "var(--color-ink-600)" }}>
                No station selected.
              </div>
            )}
          </div>
        </div>
      )}
    />
  );
}

/** Fetches the selected station's notes (a separate query, keyed on
 * (level, theme)) and hands them to columns 2 and 3 — split out so the
 * query's own loading state doesn't gate the rest of the page from
 * rendering (columns 1/2's own data is already loaded by this point). */
function StationNotesLoader({
  station,
  level,
  renderMiddleAndRight,
}: {
  station: { theme: string } | null;
  level: CefrLevel;
  renderMiddleAndRight: (notes: Note[]) => ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["learning", "syllabus", "station-notes", level, station?.theme],
    queryFn: () => api.syllabusStationNotes(level, station!.theme),
    enabled: !!station,
  });
  return <>{renderMiddleAndRight(data?.notes ?? [])}</>;
}

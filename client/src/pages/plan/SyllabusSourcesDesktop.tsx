import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Flag, HandTap, Lock, Sparkle } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel } from "../../api/types";
import { useNavStack } from "../../lib/navStack";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { AddItemSheet, LEVEL_LABELS, LEVELS, StationNode } from "./Syllabus";
import { SourceRow } from "./Sources";
import { StationDetailModal } from "./StationDetailModal";
import { deriveStations, rankSourcesForStation, stationStatus } from "./stations";

/**
 * The desktop paired Syllabus+Sources screen (German Companion
 * Desktop.dc.html id="2d") — a 3-pane view (icon rail | Syllabus | station
 * detail | Sources) shared by both the `/plan/syllabus` and `/plan/sources`
 * routes, which stay independently routable for mobile/back-stack purposes
 * but render this identical desktop content either way. This is
 * intentional, not a duplication bug — see Syllabus.tsx/Sources.tsx's own
 * doc comments at their `hidden lg:flex` blocks.
 *
 * Unlike mobile (where a tapped station's detail expands inline in the
 * timeline, see Syllabus.tsx), desktop has room for a dedicated detail
 * column — clicking a station selects it there instead of interleaving.
 * State (syllabus data, which level, which station) is lifted here so the
 * Syllabus list, the detail column, and the Sources column's relevance
 * ranking all share one "currently selected station."
 */
export function SyllabusSourcesDesktop() {
  const { push } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: sourcesData } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);
  // A command-palette deep link ("Syllabus — Chapter N") arrives as router
  // state — same one-time-read pattern as the mobile Syllabus() component's
  // own openStationTheme; this is a *separate* component (not shared state)
  // since desktop's dedicated detail column is a different rendering path
  // from mobile's inline-in-timeline expansion, so both need the read.
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    () => (location.state as { openStationTheme?: string } | null)?.openStationTheme ?? null,
  );
  const [showAddItem, setShowAddItem] = useState(false);

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

  // desktop's dedicated detail column always shows something — default to
  // the current station (or the first, for a fully-locked preview level)
  // rather than sitting empty until an explicit click, mirroring
  // Vocabulary.tsx's effectiveSelectedId pattern.
  const effectiveTheme = selectedTheme ?? stations[Math.min(currentIdx, stations.length - 1)]?.theme ?? stations[0]?.theme ?? null;
  const selectedIdx = effectiveTheme ? stations.findIndex((s) => s.theme === effectiveTheme) : -1;
  const selectedStation = selectedIdx >= 0 ? stations[selectedIdx]! : null;

  const examGate = data.examGate[levelIdx]!;
  const showExamGate = lockState === "active" && levelProgress.percent >= 100 && examGate.hasContent;

  const priorLevel = levelIdx > 0 ? LEVELS[levelIdx - 1] : null;
  const priorProgress = priorLevel ? data.levels.find((l) => l.level === priorLevel) : null;
  const priorExamGate = priorLevel ? data.examGate[levelIdx - 1] : null;

  const rankedSources = selectedStation && sourcesData ? rankSourcesForStation(selectedStation.theme, sourcesData.sources) : null;

  return (
    <div className="grid w-full min-h-0 grid-cols-[340px_1fr_300px] gap-5">
      <div className="min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="text-[22px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            Syllabus
          </div>
          <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
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
                  style={{ background: l === level ? "#9184d9" : "transparent", color: l === level ? "#161826" : ls === "done" ? "#b5abfc" : "rgba(233,233,237,.6)" }}
                >
                  {ls === "locked" && <Lock size={9} weight="fill" aria-hidden="true" />}
                  {LEVEL_LABELS[l]}
                  {ls === "done" ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
          {LEVEL_LABELS[level]} route · {stations.length} station{stations.length === 1 ? "" : "s"} · {levelProgress.percent}%
        </div>

        {lockState === "locked" && (
          <div className="mt-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(233,233,237,.06)" }}>
            <Lock size={14} weight="regular" style={{ color: "rgba(233,233,237,.4)", flexShrink: 0 }} aria-hidden="true" />
            <p className="text-[11.5px]" style={{ color: "rgba(233,233,237,.6)" }}>
              {priorProgress && priorProgress.percent < 100
                ? `Finish ${LEVEL_LABELS[priorLevel!]} first — previewing read-only.`
                : priorExamGate?.hasContent
                  ? `Pass the ${LEVEL_LABELS[priorLevel!]} exam to unlock — previewing read-only.`
                  : `Unlocks after ${LEVEL_LABELS[priorLevel!]} — previewing read-only.`}
            </p>
          </div>
        )}

        <div className="mt-5" style={{ paddingLeft: 4 }}>
          {stations.map((station, i) => (
            <StationNode
              key={station.theme}
              station={station}
              index={i}
              status={lockState === "locked" ? "upcoming" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming"}
              isLast={i === stations.length - 1 && !showExamGate}
              onOpen={() => setSelectedTheme(station.theme)}
            />
          ))}

          {showExamGate && (
            <div className="relative" style={{ paddingLeft: 34 }}>
              <div className="absolute grid size-7 place-items-center rounded-full" style={{ left: 0, top: 2, border: "1px solid #5d5294", color: "#b5abfc" }}>
                <Flag size={14} weight="regular" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => push("/plan/exam-gate")}
                className="w-full rounded-xl p-3 py-3.5 text-left"
                style={{ border: "1px solid rgba(145,132,217,.4)", background: "rgba(145,132,217,.08)" }}
              >
                <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#b5abfc" }}>
                  Self-test · gate to {LEVELS[levelIdx + 1] ? LEVEL_LABELS[LEVELS[levelIdx + 1]!] : "next level"}
                </div>
                <div className="mt-0.5 text-[15px] font-medium">{LEVEL_LABELS[level]} final exam</div>
                <div className="mt-0.5 text-[11.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
                  {examGate.hasContent && "passed" in examGate ? (examGate.passed ? "Passed" : "Ready — syllabus complete") : "Not yet available"}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto">
        {selectedStation ? (
          <StationDetailModal
            station={selectedStation}
            resolvedIdx={selectedIdx}
            isPreview={lockState === "locked" || selectedIdx > currentIdx}
            skipped={stationStatus(selectedStation) === "skipped"}
            currentItemId={selectedIdx === currentIdx ? (selectedStation.items.find((i) => i.completedAt === null && i.skippedAt === null)?.id ?? undefined) : undefined}
            onToggleItem={(id, completed) => toggle.mutate({ id, completed })}
            onDeleteItem={(id) => deleteItem.mutate(id)}
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
            onAddItem={() => setShowAddItem(true)}
            onChanged={() => invalidateHub(queryClient)}
            onClose={() => setSelectedTheme(null)}
          />
        ) : (
          <div className="grid h-full place-items-center text-[13px]" style={{ color: "rgba(233,233,237,.4)" }}>
            No stations yet.
          </div>
        )}

        {showAddItem && selectedStation && (
          <AddItemSheet level={level} theme={selectedStation.theme} onClose={() => setShowAddItem(false)} onAdded={() => invalidateHub(queryClient)} />
        )}
      </div>

      <div className="min-h-0 overflow-y-auto">
        <div className="text-[22px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
          Sources
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
          {sourcesData?.sources.length ?? 0} resource{sourcesData?.sources.length === 1 ? "" : "s"}
        </div>

        {!sourcesData || sourcesData.sources.length === 0 ? (
          <p className="mt-6 py-8 text-center text-[13px]" style={{ color: "rgba(233,233,237,.4)" }}>
            No sources yet.
          </p>
        ) : rankedSources ? (
          <div className="mt-4 flex flex-col gap-2.5">
            {rankedSources.some((r) => r.matched) && (
              <div className="mb-1 flex items-center gap-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "#b5abfc" }}>
                <Sparkle size={11} weight="regular" aria-hidden="true" />
                Suggested for {selectedStation!.theme}
              </div>
            )}
            {rankedSources.map(({ source, matched }, i) => (
              <div key={source.id}>
                {!matched && i > 0 && rankedSources[i - 1]!.matched && (
                  <div className="mt-1 mb-2.5 h-px" style={{ background: "rgba(233,233,237,.08)" }} />
                )}
                <SourceRow source={source} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {sourcesData.sources.map((s) => (
              <SourceRow key={s.id} source={s} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
          <HandTap size={13} weight="regular" aria-hidden="true" />
          Tap a source to log today's session
        </div>
      </div>
    </div>
  );
}

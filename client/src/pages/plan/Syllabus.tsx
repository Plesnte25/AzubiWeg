import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { useLocation } from "react-router-dom";
import { CaretLeft, Check, Flag, Lock } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel } from "../../api/types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useNavStack } from "../../lib/navStack";
import { invalidateHub } from "../learning-hub/queryHelpers";
import { StationDetailModal } from "./StationDetailModal";
import { SyllabusSourcesDesktop } from "./SyllabusSourcesDesktop";
import { deriveStations, stationStatus, type Station } from "./stations";

export const LEVEL_LABELS: Record<CefrLevel, string> = { a1: "A1", a2: "A2", b1: "B1" };
export const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

/** One station's timeline node — the literal handoff vertical-timeline
 * treatment (checkmark/numbered/dashed-outline/locked bead + connecting
 * line), not the pre-Nocturne StationRoute.tsx's curved horizontal-strip
 * layout, which is a visually different metaphor (per the Phase 11 plan's
 * own note to compare the two before assuming reuse — they don't match).
 * Tapping a reachable station opens the existing StationDetailModal for the
 * real item-management functionality (skip/add/delete/attachments) rather
 * than reimplementing all of that inline. Exported for reuse by the
 * desktop paired Syllabus+Sources screen (SyllabusSourcesDesktop.tsx). */
export function StationNode({
  station,
  index,
  status,
  isLast,
  onOpen,
}: {
  station: Station;
  index: number;
  status: "done" | "current" | "upcoming";
  isLast: boolean;
  onOpen: () => void;
}) {
  const done = station.items.filter((i) => i.completedAt !== null).length;
  const total = station.items.length;

  return (
    <div className="relative pb-5" style={{ paddingLeft: 34 }}>
      {!isLast && (
        <div
          className="absolute top-[2px] w-[2px]"
          style={{ left: 13, bottom: -10, background: status === "upcoming" ? "#292b31" : "linear-gradient(180deg,#9184d9,#5d5294)" }}
        />
      )}
      <div
        className="absolute grid size-7 place-items-center rounded-full text-[12px] font-semibold"
        style={{
          left: 0,
          top: 2,
          background: status === "done" ? "#9184d9" : status === "current" ? "#9184d9" : "transparent",
          boxShadow: status === "current" ? "0 0 0 5px rgba(145,132,217,.18)" : "none",
          border: status === "upcoming" ? "1px solid #3f424d" : "none",
          color: status === "upcoming" ? "rgba(233,233,237,.35)" : "#161826",
        }}
      >
        {status === "done" ? <Check size={16} weight="bold" aria-hidden="true" /> : index + 1}
      </div>

      <div
        className="text-[10px] tracking-[.12em] uppercase"
        style={{ color: status === "done" ? "rgba(233,233,237,.4)" : status === "current" ? "#b5abfc" : "rgba(233,233,237,.3)" }}
      >
        {status === "done" ? "complete" : status === "current" ? "you are here" : "locked"}
      </div>

      {status === "current" ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 w-full rounded-xl p-3.5 text-left"
          style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-medium">{station.theme}</span>
            <span className="text-[12px]" style={{ color: "#b5abfc" }}>
              {done}/{total}
            </span>
          </div>
          <div className="mt-2 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
            <div className="h-full rounded-[3px]" style={{ width: `${total === 0 ? 0 : (done / total) * 100}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-[5px]">
            {station.items.slice(0, 3).map((i) => (
              <span key={i.id} className="rounded-full px-2 py-1 text-[10px]" style={{ background: "#292b31", color: "rgba(233,233,237,.6)" }}>
                {i.title}
              </span>
            ))}
            {station.items.length > 3 && (
              <span className="rounded-full px-2 py-1 text-[10px]" style={{ border: "1px solid rgba(233,233,237,.14)", color: "rgba(233,233,237,.5)" }}>
                +{station.items.length - 3}
              </span>
            )}
          </div>
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="text-left">
          <div className="text-[15px] font-medium" style={{ color: status === "done" ? "rgba(233,233,237,.8)" : "rgba(233,233,237,.45)" }}>
            {station.theme}
          </div>
          <div className="text-[11.5px]" style={{ color: status === "done" ? "rgba(233,233,237,.45)" : "rgba(233,233,237,.3)" }}>
            {total} item{total === 1 ? "" : "s"}
            {status === "upcoming" ? " · opens after this station" : ""}
          </div>
        </button>
      )}
    </div>
  );
}

export default function Syllabus() {
  const { goBack, backLabel, push } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);
  // A deep link from the command palette (a word's contextual "Syllabus —
  // Chapter N" jump) arrives as router state — open on that station instead
  // of the default "nothing open" state, same one-time-read pattern
  // ReviewSession.tsx uses for its own curated router state.
  const [openStationTheme, setOpenStationTheme] = useState<string | null | undefined>(
    () => (location.state as { openStationTheme?: string } | null)?.openStationTheme ?? undefined,
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

  if (isLoading || !data) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "#161826" }} />
    );
  }

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

  const openStation = openStationTheme ? (stations.find((s) => s.theme === openStationTheme) ?? null) : null;

  // exam-gate teaser: this level's syllabus is done but the level itself
  // isn't "done" per lockStates -> the real ExamAttempt gate is what's
  // holding it back (see levelStatesWithExamGate()'s doc comment).
  const examGate = data.examGate[levelIdx]!;
  const showExamGate = lockState === "active" && levelProgress.percent >= 100 && examGate.hasContent;

  const priorLevel = levelIdx > 0 ? LEVELS[levelIdx - 1] : null;
  const priorProgress = priorLevel ? data.levels.find((l) => l.level === priorLevel) : null;
  const priorExamGate = priorLevel ? data.examGate[levelIdx - 1] : null;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-6 lg:hidden"
      style={{ background: "linear-gradient(180deg,#161826 0%,#1c1e30 60%,#161826 100%)" }}
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={goBack} className="flex items-center gap-[3px] text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
          {LEVELS.map((l) => {
            const ls = data.lockStates[LEVELS.indexOf(l)]!;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setUserLevel(l)}
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

      <div className="mt-3 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
        Syllabus
      </div>
      <div className="mt-0.5 text-[12px]" style={{ color: "rgba(233,233,237,.45)" }}>
        {LEVEL_LABELS[level]} route · {stations.length} station{stations.length === 1 ? "" : "s"} · {levelProgress.percent}%
      </div>

      {lockState === "locked" && (
        <div className="mt-5 flex items-center gap-2 rounded-xl p-3.5" style={{ background: "rgba(233,233,237,.06)" }}>
          <Lock size={16} weight="regular" style={{ color: "rgba(233,233,237,.4)", flexShrink: 0 }} aria-hidden="true" />
          <p className="text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>
            {priorProgress && priorProgress.percent < 100
              ? `Finish ${LEVEL_LABELS[priorLevel!]} first — previewing ${LEVEL_LABELS[level]} read-only.`
              : priorExamGate?.hasContent
                ? `Pass the ${LEVEL_LABELS[priorLevel!]} exam to unlock ${LEVEL_LABELS[level]} — previewing read-only.`
                : `${LEVEL_LABELS[level]} unlocks after ${LEVEL_LABELS[priorLevel!]} — previewing read-only.`}
          </p>
        </div>
      )}
      <div className="mt-6 flex-1" style={{ paddingLeft: 4 }}>
        {stations.map((station, i) => (
          <Fragment key={station.theme}>
            <StationNode
              station={station}
              index={i}
              status={lockState === "locked" ? "upcoming" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming"}
              isLast={i === stations.length - 1 && !showExamGate}
              onOpen={() => setOpenStationTheme(station.theme)}
            />
            {openStationTheme === station.theme && (
              <StationDetailModal
                station={station}
                resolvedIdx={i}
                isPreview={lockState === "locked" || i > currentIdx}
                skipped={stationStatus(station) === "skipped"}
                currentItemId={i === currentIdx ? (station.items.find((it) => it.completedAt === null && it.skippedAt === null)?.id ?? undefined) : undefined}
                onToggleItem={(id, completed) => toggle.mutate({ id, completed })}
                onDeleteItem={(id) => deleteItem.mutate(id)}
                onSkip={() => {
                  const skipped = stationStatus(station) === "skipped";
                  if (skipped) {
                    skipStation.mutate({ level, theme: station.theme, skipped: false });
                    return;
                  }
                  if (confirm(`Skip station "${station.theme}"? Its items stay open but the route moves past it.`)) {
                    skipStation.mutate({ level, theme: station.theme, skipped: true });
                  }
                }}
                onAddItem={() => setShowAddItem(true)}
                onChanged={() => invalidateHub(queryClient)}
                onClose={() => setOpenStationTheme(null)}
              />
            )}
          </Fragment>
        ))}

        {showExamGate && (
          <div className="relative" style={{ paddingLeft: 34 }}>
            <div
              className="absolute grid size-7 place-items-center rounded-full"
              style={{ left: 0, top: 2, border: "1px solid #5d5294", color: "#b5abfc" }}
            >
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

      {showAddItem && openStation && (
        <AddItemSheet level={level} theme={openStation.theme} onClose={() => setShowAddItem(false)} onAdded={() => invalidateHub(queryClient)} />
      )}
    </div>

    {/* Desktop (lg+) — the paired Syllabus+Sources 3-pane screen (German
        Companion Desktop.dc.html id="2d"); Sources renders the identical
        component from its own route too, see SyllabusSourcesDesktop.tsx's
        doc comment. */}
    <div className="hidden lg:flex">
      <SyllabusSourcesDesktop />
    </div>
    </>
  );
}

export function AddItemSheet({ level, theme, onClose, onAdded }: { level: CefrLevel; theme: string; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () => api.addSyllabusItem({ level, category: "grammar", theme, title: title.trim() }),
    onSuccess: () => {
      onAdded();
      onClose();
    },
  });

  return (
    <BottomSheet open onClose={onClose}>
      <div className="text-[16px] font-medium">Add item — {theme}</div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && title.trim() && save.mutate()}
        placeholder="Item title"
        className="mt-3 box-border w-full rounded-[11px] px-[13px] outline-none"
        style={{ minHeight: 44, color: "#e9e9ed", background: "#20222f", border: "1px solid rgba(233,233,237,.14)" }}
      />
      <button
        type="button"
        disabled={!title.trim() || save.isPending}
        onClick={() => save.mutate()}
        className="mt-3 min-h-[44px] w-full rounded-[10px] text-[14px] font-medium text-white disabled:opacity-50"
        style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
      >
        Add item
      </button>
    </BottomSheet>
  );
}

import { useState } from "react";
import { CaretDown, Check, DotsThree, NotePencil, Plus, SkipForward, Trash } from "@phosphor-icons/react";
import type { SyllabusItem } from "../../api/types";
import type { Station } from "./stations";

/**
 * The Syllabus desktop screen's column 2 (Claude Design handoff turn 7a) —
 * replaces the old click-to-open `StationDetailModal` overlay with an
 * inline accordion: exactly one item expands at a time, in place, instead
 * of a separate panel. `StationDetailModal` itself is untouched and still
 * backs mobile's inline-after-clicked-node usage (see Syllabus.tsx) — this
 * is a from-scratch component, not an adaptation, since the interaction
 * model is fundamentally different (accordion vs. click-outside-to-close
 * overlay).
 *
 * "Practice" (per expanded item) jumps to that item's own scheduled
 * RoadmapTask — real data (`SyllabusItem.roadmapTaskId`, set only when this
 * topic is on the active roadmap), reusing the exact
 * push("/plan", {state:{openTaskId}}) mechanism the Task Detail modal
 * rework (turn 9a) already established, rather than a new nav path. An
 * unscheduled item (most non-current ones) has nothing real to jump to, so
 * the action is omitted rather than faked.
 */
export function StationAccordion({
  station,
  resolvedIdx,
  isPreview,
  skipped,
  currentItemId,
  noteCountByItemId,
  onToggleItem,
  onDeleteItem,
  onAddItem,
  onSkip,
  onPractice,
  onAddNote,
}: {
  station: Station;
  resolvedIdx: number;
  isPreview: boolean;
  skipped: boolean;
  currentItemId: string | undefined;
  noteCountByItemId: Map<string, number>;
  onToggleItem: (id: string, completed: boolean) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: () => void;
  onSkip: () => void;
  onPractice: (item: SyllabusItem) => void;
  onAddNote: (item: SyllabusItem) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(currentItemId ?? null);
  const closedCount = station.items.filter((i) => i.completedAt !== null).length;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            Station {resolvedIdx + 1}
          </div>
          <div className="mt-0.5 text-[19px] font-medium">{station.theme}</div>
          <div className="mt-0.5 text-[12px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {station.items.length} item{station.items.length === 1 ? "" : "s"} · {closedCount}/{station.items.length} closed
          </div>
        </div>
        {!isPreview && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onAddItem}
              title="Add item"
              className="grid size-8 place-items-center rounded-full"
              style={{ background: "#20222f", color: "rgba(233,233,237,.65)" }}
            >
              <Plus size={15} weight="regular" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onSkip}
              title={skipped ? "Un-skip station" : "Skip station"}
              className="grid size-8 place-items-center rounded-full"
              style={{ background: "#20222f", color: "rgba(233,233,237,.65)" }}
            >
              <SkipForward size={15} weight="regular" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
        Tap a task to open its full detail · drag a task into Notes to attach a note.
      </p>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {station.items.map((item) => {
          const isCurrent = currentItemId === item.id;
          const isExpanded = expandedId === item.id;
          const noteCount = noteCountByItemId.get(item.id) ?? 0;
          const done = item.completedAt !== null;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/syllabus-item-id", item.id);
                e.dataTransfer.effectAllowed = "link";
              }}
              className="rounded-xl px-2 py-2"
              style={{ background: isCurrent ? "rgba(145,132,217,.08)" : "transparent" }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : item.id);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 text-left"
              >
                <DotsThree size={14} weight="bold" style={{ color: "rgba(233,233,237,.25)", cursor: "grab" }} aria-hidden="true" />
                <button
                  type="button"
                  disabled={isPreview}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleItem(item.id, !done);
                  }}
                  aria-label={done ? "Mark not done" : "Mark done"}
                  className="grid size-[18px] shrink-0 place-items-center rounded-full disabled:cursor-not-allowed"
                  style={{ background: done ? "#9184d9" : "transparent", border: done ? "none" : "1px solid rgba(233,233,237,.3)" }}
                >
                  {done && <Check size={11} weight="bold" style={{ color: "#161826" }} aria-hidden="true" />}
                </button>
                <span
                  className="min-w-0 flex-1 truncate text-[14px]"
                  style={{ color: done ? "rgba(233,233,237,.4)" : "#e9e9ed", textDecoration: done ? "line-through" : "none" }}
                >
                  {item.title}
                </span>
                {isCurrent && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "#9184d9", color: "#161826" }}>
                    on today
                  </span>
                )}
                <span className="shrink-0 text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
                  {done || item.skippedAt ? "closed" : "open"}
                </span>
                <CaretDown
                  size={12}
                  weight="bold"
                  style={{ color: "rgba(233,233,237,.3)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}
                  aria-hidden="true"
                />
              </div>

              {isExpanded && (
                <div className="mt-2 pl-[38px]">
                  {item.description && (
                    <p className="text-[12.5px]" style={{ color: "rgba(233,233,237,.6)" }}>
                      {item.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                    <NotePencil size={12} weight="regular" aria-hidden="true" />
                    {noteCount} note{noteCount === 1 ? "" : "s"}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {item.roadmapTaskId && (
                      <button type="button" onClick={() => onPractice(item)} className="text-[12.5px] font-semibold" style={{ color: "#b5abfc" }}>
                        Practice
                      </button>
                    )}
                    <button type="button" onClick={() => onAddNote(item)} className="text-[12.5px]" style={{ color: "rgba(233,233,237,.55)" }}>
                      + note
                    </button>
                    {!isPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${item.title}"? This can't be undone.`)) onDeleteItem(item.id);
                        }}
                        className="ml-auto text-[11.5px]"
                        style={{ color: "rgba(233,233,237,.4)" }}
                      >
                        <Trash size={13} weight="regular" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

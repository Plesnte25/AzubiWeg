import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import type { Word } from "../../api/types";
import { cn } from "../../lib/cn";
import { STATE_COLORS } from "../../lib/vocab";
import { GROUP_OPTIONS, type GroupBy } from "./shelves";
import type { VocabFilters } from "./useVocabFacets";

const STATE_TABS: { key: VocabFilters["state"]; label: string; color: string }[] = [
  { key: "all", label: "All", color: "var(--color-ink-400)" },
  { key: "due", label: "Due today", color: STATE_COLORS.due },
  { key: "new", label: "New", color: STATE_COLORS.new },
  { key: "leech", label: "Problem words", color: "var(--color-state-problem)" },
  { key: "learning", label: "Learning", color: STATE_COLORS.learning },
  { key: "mastered", label: "Mastered", color: STATE_COLORS.mastered },
];

interface StateTabsProps {
  allWords: Word[];
  stateCounts: Record<string, number>;
  value: VocabFilters["state"];
  onChange: (state: VocabFilters["state"]) => void;
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  /** List mode is inherently flat A-Z — the Wortart/A-Z/Woche grouping
   * dropdown on the "All" chip doesn't apply there. */
  hideGroupBy?: boolean;
}

/** Small popover anchored to the "All" chip's caret, listing the
 * Wortart/A-Z/Woche grouping modes — a separate tap target from the chip
 * itself (which keeps just clearing the state filter, unchanged), so the
 * two orthogonal concerns (state filter vs. shelf grouping) stay
 * independent. Portaled + `fixed`-positioned off the caret's own rect
 * rather than a plain `absolute` child, since the row it lives in is
 * horizontally scrollable (`overflow-x-auto` implies `overflow-y: auto`
 * too, which would clip a normally-positioned dropdown). */
function GroupByDropdown({
  anchorRef,
  groupBy,
  onGroupByChange,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  }, [anchorRef]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent | globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown as (e: globalThis.KeyboardEvent) => void);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown as (e: globalThis.KeyboardEvent) => void);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Group by"
      className="fixed z-50 flex flex-col gap-0.5 rounded-xl border border-hairline bg-card p-1 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      {GROUP_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          role="menuitemradio"
          aria-checked={groupBy === opt.key}
          className={cn(
            "rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors",
            groupBy === opt.key ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper hover:text-ink-900",
          )}
          onClick={() => {
            onGroupByChange(opt.key);
            onClose();
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/** The page's primary navigation — practice-readiness state (All/Due/New/
 * Problem/Learning/Mastered). Pulled out of `MasteryBar` into its own
 * prominent, keyboard-native `role="radiogroup"` control: exactly one of N
 * mutually-exclusive options is the textbook case for radio semantics (not
 * `aria-current`, which is for wayfinding). Roving tabindex + arrow-key
 * navigation matches how screen readers already expect a radio group to
 * behave, no new interaction pattern for users to learn.
 *
 * The "All" chip also carries a caret that opens a Wortart/A-Z/Woche
 * grouping dropdown (`GroupByDropdown` above) — shared by every breakpoint
 * from this one component, replacing what used to be a standalone
 * `SegmentedControl` row duplicated per breakpoint. */
export default function StateTabs({ allWords, stateCounts, value, onChange, groupBy, onGroupByChange, hideGroupBy }: StateTabsProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const caretRef = useRef<HTMLButtonElement>(null);
  const [groupByOpen, setGroupByOpen] = useState(false);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % STATE_TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + STATE_TABS.length) % STATE_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STATE_TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const tab = STATE_TABS[next]!;
    onChange(tab.key);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Word state"
      className="flex snap-x gap-1.5 overflow-x-auto [scroll-behavior:auto] [scrollbar-width:none]"
    >
      {STATE_TABS.map((tab, i) => {
        const active = value === tab.key;
        const isAll = tab.key === "all";
        const showCaret = isAll && !hideGroupBy;
        const count = isAll ? allWords.length : (stateCounts[tab.key] ?? 0);
        return (
          <div key={tab.key} className="flex shrink-0 snap-start items-center gap-1">
            <button
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                showCaret && "rounded-r-none",
                isAll && active
                  ? "border-transparent bg-ink-900 text-white"
                  : active
                    ? "border-transparent text-white"
                    : "border-hairline text-ink-600 hover:bg-paper",
              )}
              style={active && !isAll ? { backgroundColor: tab.color } : undefined}
              onClick={() => onChange(tab.key)}
            >
              {!active && <span className="size-1.5 rounded-full" style={{ backgroundColor: tab.color }} aria-hidden="true" />}
              {tab.label}
              <span className="tabular-nums opacity-80">{count}</span>
              <span className="sr-only">, {count} words</span>
            </button>
            {showCaret && (
              <button
                ref={caretRef}
                type="button"
                title="Group by"
                aria-haspopup="menu"
                aria-expanded={groupByOpen}
                className={cn(
                  "grid h-[26px] shrink-0 place-items-center rounded-r-full border border-l-0 px-1.5 transition-colors",
                  active ? "border-l border-l-white/20 bg-ink-900 text-white" : "border-hairline text-ink-600 hover:bg-paper",
                )}
                onClick={() => setGroupByOpen((o) => !o)}
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      {groupByOpen && (
        <GroupByDropdown anchorRef={caretRef} groupBy={groupBy} onGroupByChange={onGroupByChange} onClose={() => setGroupByOpen(false)} />
      )}
    </div>
  );
}

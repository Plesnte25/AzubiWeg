import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Word } from "../../api/types";
import { cn } from "../../lib/cn";
import { STATE_COLORS } from "../../lib/vocab";
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
}

/** The page's primary navigation — practice-readiness state (All/Due/New/
 * Problem/Learning/Mastered). Pulled out of `MasteryBar` into its own
 * prominent, keyboard-native `role="radiogroup"` control: exactly one of N
 * mutually-exclusive options is the textbook case for radio semantics (not
 * `aria-current`, which is for wayfinding). Roving tabindex + arrow-key
 * navigation matches how screen readers already expect a radio group to
 * behave, no new interaction pattern for users to learn. */
export default function StateTabs({ allWords, stateCounts, value, onChange }: StateTabsProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
        const count = tab.key === "all" ? allWords.length : (stateCounts[tab.key] ?? 0);
        return (
          <button
            key={tab.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex shrink-0 snap-start items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
              active ? "border-transparent text-white" : "border-hairline text-ink-600 hover:bg-paper",
            )}
            style={active ? { backgroundColor: tab.color } : undefined}
            onClick={() => onChange(tab.key)}
          >
            {!active && <span className="size-1.5 rounded-full" style={{ backgroundColor: tab.color }} aria-hidden="true" />}
            {tab.label}
            <span className="tabular-nums opacity-80">{count}</span>
            <span className="sr-only">, {count} words</span>
          </button>
        );
      })}
    </div>
  );
}

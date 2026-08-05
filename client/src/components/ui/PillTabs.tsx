import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "../../lib/cn";

export interface PillTabItem {
  key: string;
  label: string;
  /** CSS color value — active tab's solid fill, inactive tab's dot. */
  color: string;
  count?: number;
}

interface PillTabsProps {
  items: PillTabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  className?: string;
}

/** Horizontally-scrollable, single-select pill row with per-item color and
 * an optional count — the sm/md replacement for a sidebar/column layout
 * (Learning Hub's destination rail, Job Search's stage columns). Generalized
 * from the vocabulary vault's state-filter row (StateTabs.tsx), stripped of
 * that component's vocab-specific grouping dropdown. */
export function PillTabs({ items, value, onChange, ariaLabel, className }: PillTabsProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    const item = items[next]!;
    onChange(item.key);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex touch-pan-x gap-1.5 overflow-x-auto [scroll-behavior:auto] [scrollbar-width:none]", className)}
    >
      {items.map((item, i) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active ? "border-transparent text-white" : "border-hairline text-ink-600 hover:bg-paper",
            )}
            style={active ? { backgroundColor: item.color } : undefined}
          >
            {!active && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && <span className="tabular-nums opacity-80">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

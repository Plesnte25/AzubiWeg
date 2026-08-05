import type { ChecklistCategory, ChecklistItem } from "../../api/types";
import { DonutProgress } from "../../components/ui/DonutProgress";
import { cn } from "../../lib/cn";
import { CATEGORIES } from "./shared";

export default function CategoryGrid({
  items,
  activeCategory,
  onToggle,
}: {
  items: ChecklistItem[];
  activeCategory: ChecklistCategory | null;
  onToggle: (key: ChecklistCategory) => void;
}) {
  return (
    // sm/md: horizontally-scrollable ring row (44px rings on sm, 56px on
    // md). lg: reverts to the original non-scrolling 8-column grid at 28px
    // — the design system is unchanged at lg, this is additive below it.
    <div className="flex touch-pan-x gap-3 overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-8 lg:gap-2 lg:overflow-visible">
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key);
        const applicable = catItems.filter((i) => i.status !== "not_applicable");
        const done = applicable.filter((i) => i.status === "done").length;
        const active = activeCategory === cat.key;
        const segments = [{ value: done, color: "var(--color-ink-900)" }];
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onToggle(cat.key)}
            className={cn(
              "w-[68px] shrink-0 rounded-xl px-1 py-2.5 text-center lg:w-auto",
              active ? "border-[1.5px] border-ink-900" : "border border-hairline hover:border-brand-300",
            )}
          >
            <DonutProgress segments={segments} max={applicable.length} size={44} strokeWidth={4} className="mx-auto md:hidden" />
            <DonutProgress
              segments={segments}
              max={applicable.length}
              size={56}
              strokeWidth={5}
              className="mx-auto hidden md:block lg:hidden"
            />
            <DonutProgress segments={segments} max={applicable.length} size={28} strokeWidth={3} className="mx-auto hidden lg:block" />
            <p className="mt-1.5 truncate text-[10px] font-bold">{cat.label}</p>
            <p className="text-[9.5px] text-ink-300">
              {done}/{applicable.length}
            </p>
          </button>
        );
      })}
    </div>
  );
}

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
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key);
        const applicable = catItems.filter((i) => i.status !== "not_applicable");
        const done = applicable.filter((i) => i.status === "done").length;
        const active = activeCategory === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onToggle(cat.key)}
            className={cn(
              "rounded-xl px-1 py-2.5 text-center",
              active ? "border-[1.5px] border-ink-900" : "border border-hairline hover:border-brand-300",
            )}
          >
            <DonutProgress
              segments={[{ value: done, color: "var(--color-ink-900)" }]}
              max={applicable.length}
              size={28}
              strokeWidth={3}
              className="mx-auto"
            />
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

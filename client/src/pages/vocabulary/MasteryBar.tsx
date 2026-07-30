import { BarChart3 } from "lucide-react";
import type { Word } from "../../api/types";
import { cn } from "../../lib/cn";
import { STATE_COLORS } from "../../lib/vocab";
import type { VocabFilters } from "./useVocabFacets";

const MASTERED_INTERVAL_DAYS = 21;

const STATE_CHIPS: { key: VocabFilters["state"]; label: string; color: string }[] = [
  { key: "all", label: "All", color: "var(--color-ink-400)" },
  { key: "due", label: "Due today", color: STATE_COLORS.due },
  { key: "new", label: "New", color: STATE_COLORS.new },
  { key: "leech", label: "Problem words", color: "var(--color-state-problem)" },
  { key: "learning", label: "Learning", color: STATE_COLORS.learning },
  { key: "mastered", label: "Mastered", color: STATE_COLORS.mastered },
];

interface MasteryBarProps {
  allWords: Word[];
  stateCounts: Record<string, number>;
  filters: VocabFilters;
  onChangeState: (state: VocabFilters["state"]) => void;
  reviewsToday: number;
  totalReviews: number;
  onOpenAnalytics: () => void;
}

export function MasteryBar({ allWords, stateCounts, filters, onChangeState, reviewsToday, totalReviews, onOpenAnalytics }: MasteryBarProps) {
  let newCount = 0;
  let masteredCount = 0;
  for (const w of allWords) {
    if (w.srDue === null) newCount++;
    else if (w.srInterval !== null && w.srInterval >= MASTERED_INTERVAL_DAYS) masteredCount++;
  }
  const learningCount = allWords.length - newCount - masteredCount;
  const total = allWords.length || 1;
  const masteredPercent = Math.round((masteredCount / total) * 100);

  return (
    <div className="sticky top-0 z-[14] -mx-1 space-y-2 rounded-xl border border-hairline bg-card/95 px-4 py-3 shadow-md backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{masteredPercent}%</span>
        <span className="text-[10px] font-bold tracking-wide text-ink-400">GEMEISTERT</span>

        <div className="flex h-[22px] flex-1 min-w-32 overflow-hidden rounded-full bg-paper text-[10px] font-medium text-white">
          {newCount > 0 && (
            <div
              className="flex items-center justify-center overflow-hidden whitespace-nowrap"
              style={{ flexGrow: newCount, flexBasis: 0, backgroundColor: STATE_COLORS.new }}
            >
              {newCount} new
            </div>
          )}
          {learningCount > 0 && (
            <div
              className="flex items-center justify-center overflow-hidden whitespace-nowrap text-ink-900"
              style={{ flexGrow: learningCount, flexBasis: 0, backgroundColor: STATE_COLORS.learning }}
            >
              {learningCount} learning
            </div>
          )}
          {masteredCount > 0 && (
            <div
              className="flex items-center justify-center overflow-hidden whitespace-nowrap"
              style={{ flexGrow: masteredCount, flexBasis: 0, backgroundColor: STATE_COLORS.mastered }}
            >
              {masteredCount} mastered
            </div>
          )}
        </div>

        <span className="shrink-0 text-xs text-ink-400">
          <span className="font-medium text-ink-900">{reviewsToday}</span> today ·{" "}
          <span className="font-medium text-ink-900">{totalReviews}</span> all time
        </span>
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-400 hover:text-ink-900"
          onClick={onOpenAnalytics}
        >
          <BarChart3 className="size-3.5" aria-hidden="true" />
          Analytics
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATE_CHIPS.map((chip) => {
          const active = filters.state === chip.key;
          const count = chip.key === "all" ? allWords.length : (stateCounts[chip.key] ?? 0);
          return (
            <button
              key={chip.key}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "border-transparent text-white" : "border-hairline text-ink-600 hover:bg-paper",
              )}
              style={active ? { backgroundColor: chip.color } : undefined}
              onClick={() => onChangeState(chip.key)}
            >
              {!active && <span className="size-1.5 rounded-full" style={{ backgroundColor: chip.color }} aria-hidden="true" />}
              {chip.label}
              <span className="tabular-nums opacity-80">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

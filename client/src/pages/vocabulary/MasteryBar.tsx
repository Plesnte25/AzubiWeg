import { BarChart3 } from "lucide-react";
import type { Word } from "../../api/types";
import { masteryBreakdown, STATE_COLORS } from "../../lib/vocab";

interface MasteryBarProps {
  allWords: Word[];
  reviewsToday: number;
  totalReviews: number;
  onOpenAnalytics: () => void;
}

export function MasteryBar({ allWords, reviewsToday, totalReviews, onOpenAnalytics }: MasteryBarProps) {
  const { newCount, learningCount, masteredCount, masteredPercent } = masteryBreakdown(allWords);

  return (
    <div className="sticky top-0 z-[14] -mx-1 rounded-xl border border-hairline bg-card/95 px-4 py-3 shadow-md backdrop-blur">
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
    </div>
  );
}

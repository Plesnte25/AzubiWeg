import type { Word } from "../../api/types";
import { masteryBreakdown, STATE_COLORS } from "../../lib/vocab";

/** sm/md-only single mastery bar, sitting directly under the header (per
 * feedback: "underlining" the heading + Add-words CTA) — no outer card, no
 * standalone percentage label; the counts live inside the filled segments
 * themselves, same pattern lg's `MasteryBar` already uses. Shares its math
 * with `MasteryBar` via `masteryBreakdown()` so the two numbers never drift
 * apart. */
export default function MasteryStrip({ allWords }: { allWords: Word[] }) {
  const { newCount, learningCount, masteredCount } = masteryBreakdown(allWords);

  return (
    <div className="flex h-5 overflow-hidden rounded-full bg-paper text-[9px] font-medium text-white">
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
  );
}

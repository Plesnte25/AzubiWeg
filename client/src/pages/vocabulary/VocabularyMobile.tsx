import { BookOpen } from "lucide-react";
import type { Word } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import MobileShelfRow from "./MobileShelfRow";
import ReviewActions from "./ReviewActions";
import type { ShelfGroup } from "./shelves";

interface VocabularyMobileProps {
  allWords: Word[];
  filtered: Word[];
  dueTodayWords: Word[];
  shelves: ShelfGroup[];
  expandedShelves: Set<string>;
  onToggleExpand: (id: string) => void;
  reviewCount: number;
  onOpenReview: () => void;
  onOpenAnalytics: () => void;
}

/** sm/md Netflix-style vault — the top-level composer for this breakpoint
 * range, mounted unconditionally alongside lg's existing tree (each
 * self-gates visibility via `lg:hidden` on this root vs. `hidden lg:...` on
 * the lg-only elements), sharing the same fetched data/mutations, shelf
 * grouping, and expand state from `Vocabulary.tsx` — same principle
 * `Dashboard.tsx` already uses for its own `lg:hidden` vs `hidden ... lg:grid`
 * split. "See all" expands a shelf's own row in place (mirroring lg's
 * `Shelf.tsx` expand behavior) rather than navigating to a separate view.
 * Shelf grouping is picked via the dropdown on `StateTabs`' "All" chip, one
 * level up — shared verbatim with lg, not owned by this component. */
export default function VocabularyMobile({
  allWords,
  filtered,
  dueTodayWords,
  shelves,
  expandedShelves,
  onToggleExpand,
  reviewCount,
  onOpenReview,
  onOpenAnalytics,
}: VocabularyMobileProps) {
  const allShelves: ShelfGroup[] = [
    ...(dueTodayWords.length > 0 ? [{ id: "due-today", title: "Due today", words: dueTodayWords }] : []),
    ...shelves,
  ];

  return (
    <div className="lg:hidden">
      <div className="space-y-5 pb-[calc(3.5rem+4rem+env(safe-area-inset-bottom))] md:pb-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={allWords.length === 0 ? "No words yet" : "No words found"}
            description={allWords.length === 0 ? "Add your first word above to get started." : "Try a different filter."}
          />
        ) : (
          allShelves.map((shelf) => (
            <MobileShelfRow
              key={shelf.id}
              title={shelf.title}
              words={shelf.words}
              expanded={expandedShelves.has(shelf.id)}
              onToggleExpand={() => onToggleExpand(shelf.id)}
            />
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-hairline bg-card px-[18px] py-3 md:hidden">
        <ReviewActions reviewCount={reviewCount} onOpenReview={onOpenReview} onOpenAnalytics={onOpenAnalytics} />
      </div>
    </div>
  );
}

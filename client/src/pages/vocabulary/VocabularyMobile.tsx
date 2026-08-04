import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { Word } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import MobileShelfRow from "./MobileShelfRow";
import ReviewActions from "./ReviewActions";
import ShelfGridOverlay from "./ShelfGridOverlay";

interface ShelfGroup {
  id: string;
  title: string;
  words: Word[];
}

interface VocabularyMobileProps {
  allWords: Word[];
  filtered: Word[];
  dueTodayWords: Word[];
  mobileShelves: ShelfGroup[];
  reviewCount: number;
  onOpenReview: () => void;
  onOpenAnalytics: () => void;
}

/** sm/md Netflix-style vault — the top-level composer for this breakpoint
 * range, mounted unconditionally alongside lg's existing tree (each
 * self-gates visibility via `lg:hidden` on this root vs. `hidden lg:...` on
 * the lg-only elements), sharing the same fetched data/mutations from
 * `Vocabulary.tsx`, same principle `Dashboard.tsx` already uses for its own
 * `lg:hidden` vs `hidden ... lg:grid` split. The state filter (`StateTabs`)
 * and search trigger now live one level up in `Vocabulary.tsx`, shared
 * verbatim with lg instead of this component owning its own variants. */
export default function VocabularyMobile({
  allWords,
  filtered,
  dueTodayWords,
  mobileShelves,
  reviewCount,
  onOpenReview,
  onOpenAnalytics,
}: VocabularyMobileProps) {
  const [seeAllShelfId, setSeeAllShelfId] = useState<string | null>(null);

  const allShelves: ShelfGroup[] = [
    ...(dueTodayWords.length > 0 ? [{ id: "due-today", title: "Due today", words: dueTodayWords }] : []),
    ...mobileShelves,
  ];
  const seeAllShelf = allShelves.find((s) => s.id === seeAllShelfId) ?? null;

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
            <MobileShelfRow key={shelf.id} title={shelf.title} words={shelf.words} onSeeAll={() => setSeeAllShelfId(shelf.id)} />
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-hairline bg-card px-[18px] py-3 md:hidden">
        <ReviewActions reviewCount={reviewCount} onOpenReview={onOpenReview} onOpenAnalytics={onOpenAnalytics} />
      </div>

      {seeAllShelf && <ShelfGridOverlay title={seeAllShelf.title} words={seeAllShelf.words} onClose={() => setSeeAllShelfId(null)} />}
    </div>
  );
}

import { BookOpen } from "lucide-react";
import type { Word } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import MobileShelfRow from "./MobileShelfRow";
import ReviewActions from "./ReviewActions";
import type { ShelfGroup } from "./shelves";
import { WordDictionaryList } from "./WordDictionaryList";

interface VocabularyMobileProps {
  allWords: Word[];
  filtered: Word[];
  dueTodayWords: Word[];
  shelves: ShelfGroup[];
  viewMode: "tile" | "list";
  flippedWordId: string | null;
  onToggleFlip: (id: string) => void;
  onPlayAudio: (word: Word) => void;
  audioPlayingId: string | null;
  reviewCount: number;
  onOpenReview: () => void;
  onOpenAnalytics: () => void;
}

/** sm/md Netflix-style vault — the top-level composer for this breakpoint
 * range, mounted unconditionally alongside lg's existing tree (each
 * self-gates visibility via `lg:hidden` on this root vs. `hidden lg:...` on
 * the lg-only elements), sharing the same fetched data/mutations and shelf
 * grouping from `Vocabulary.tsx` — same principle `Dashboard.tsx` already
 * uses for its own `lg:hidden` vs `hidden ... lg:grid` split. This is Tile
 * mode only — List mode (`WordDictionaryList`) is rendered by
 * `Vocabulary.tsx` in place of this component entirely, since a flat list
 * doesn't need a separate mobile variant. Shelf grouping is picked via the
 * dropdown on `StateTabs`' "All" chip, one level up — shared verbatim with
 * lg, not owned by this component. */
export default function VocabularyMobile({
  allWords,
  filtered,
  dueTodayWords,
  shelves,
  viewMode,
  flippedWordId,
  onToggleFlip,
  onPlayAudio,
  audioPlayingId,
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
      <div className="space-y-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-4">
        {viewMode === "list" ? (
          <WordDictionaryList words={filtered} onPlayAudio={onPlayAudio} audioPlayingId={audioPlayingId} />
        ) : filtered.length === 0 ? (
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
              flippedWordId={flippedWordId}
              onToggleFlip={onToggleFlip}
              onPlayAudio={onPlayAudio}
              audioPlayingId={audioPlayingId}
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

import { useRef } from "react";
import type { Word } from "../../api/types";
import { useShelfPan } from "../../lib/useShelfPan";
import VocabTile from "./VocabTile";

interface MobileShelfRowProps {
  title: string;
  words: Word[];
  onSeeAll: () => void;
}

/** One Netflix-style shelf row for the sm/md vault — drag/touch-scrollable
 * (reuses `useShelfPan` exactly as `Shelf.tsx`'s lg row already does, no
 * adaptation needed), no arrow buttons or scrollbars (handoff: touch/drag
 * is the only affordance below lg). */
export default function MobileShelfRow({ title, words, onSeeAll }: MobileShelfRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { draggedRef } = useShelfPan(rowRef);

  if (words.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">
          {title} <span className="font-normal text-ink-400">{words.length}</span>
        </span>
        <button className="text-xs font-medium text-brand-700 hover:underline" onClick={onSeeAll}>
          See all ({words.length})
        </button>
      </div>
      <div ref={rowRef} className="flex gap-2.5 overflow-x-auto [scroll-behavior:auto] [scrollbar-width:none]">
        {words.map((w) => (
          <div
            key={w.id}
            onClickCapture={(e) => {
              if (draggedRef.current) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
          >
            <VocabTile word={w} />
          </div>
        ))}
      </div>
    </div>
  );
}

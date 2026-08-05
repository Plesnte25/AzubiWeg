import { useRef } from "react";
import type { Word } from "../../api/types";
import { useShelfPan } from "../../lib/useShelfPan";
import VocabTile from "./VocabTile";

// mirrors Shelf.tsx's SHOW_EXPAND_CONTROLS_ABOVE — below this, the row
// already shows every word horizontally, no "See all" needed
const SHOW_EXPAND_CONTROLS_ABOVE = 5;

interface MobileShelfRowProps {
  title: string;
  words: Word[];
  expanded: boolean;
  onToggleExpand: () => void;
}

/** One Netflix-style shelf row for the sm/md vault — collapsed, it's
 * drag/touch-scrollable (reuses `useShelfPan` exactly as `Shelf.tsx`'s lg row
 * already does). "See all"/"Collapse" toggles the row in place into a
 * wrapped grid showing every tile, mirroring `Shelf.tsx`'s lg `expanded`
 * behavior — no navigation, no overlay. */
export default function MobileShelfRow({ title, words, expanded, onToggleExpand }: MobileShelfRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { draggedRef } = useShelfPan(rowRef);

  if (words.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">
          {title} <span className="font-normal text-ink-400">{words.length}</span>
        </span>
        {words.length > SHOW_EXPAND_CONTROLS_ABOVE && (
          <button className="text-xs font-medium text-brand-700 hover:underline" onClick={onToggleExpand}>
            {expanded ? "Collapse" : `See all (${words.length})`}
          </button>
        )}
      </div>
      {expanded ? (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
          {words.map((w) => (
            <VocabTile key={w.id} word={w} />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}

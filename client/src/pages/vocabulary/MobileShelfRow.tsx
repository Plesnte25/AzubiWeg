import { useRef } from "react";
import type { Word } from "../../api/types";
import { useShelfPan } from "../../lib/useShelfPan";
import VocabTile from "./VocabTile";

interface MobileShelfRowProps {
  title: string;
  words: Word[];
  flippedWordId: string | null;
  onToggleFlip: (id: string) => void;
  onPlayAudio: (word: Word) => void;
  audioPlayingId: string | null;
}

/** One Netflix-style shelf row for the sm/md vault — collapsed, it's
 * drag/touch-scrollable (reuses `useShelfPan` exactly as `Shelf.tsx`'s lg row
 * already does). Tile mode always shows a fixed-cap horizontal-scroll row —
 * browsing every word in a category is what List mode is for now, so there's
 * no in-place expand/"See all" here anymore. */
export default function MobileShelfRow({ title, words, flippedWordId, onToggleFlip, onPlayAudio, audioPlayingId }: MobileShelfRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { draggedRef } = useShelfPan(rowRef);

  if (words.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">
          {title} <span className="font-normal text-ink-400">{words.length}</span>
        </span>
      </div>
      <div ref={rowRef} className="flex touch-pan-x gap-2.5 overflow-x-auto [scroll-behavior:auto] [scrollbar-width:none]">
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
            <VocabTile
              word={w}
              flipped={flippedWordId === w.id}
              onToggleFlip={() => onToggleFlip(w.id)}
              onPlayAudio={onPlayAudio}
              audioPlaying={audioPlayingId === w.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

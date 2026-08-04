import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Word } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { useShelfPan } from "../../lib/useShelfPan";
import { WordCard } from "./WordCard";

// only gates whether "See all"/collapse controls show at all — the
// collapsed row itself always renders every word, just horizontally
// (Practice N / See all N already cover the "jump to grid" cases)
const SHOW_EXPAND_CONTROLS_ABOVE = 5;
const CARD_WIDTH = 178;

interface ShelfProps {
  id: string;
  title: string;
  titleColor?: string;
  glyph?: string;
  words: Word[];
  expanded: boolean;
  onToggleExpand: () => void;
  onPractice?: (words: Word[]) => void;
  onToggleLeech: (word: Word) => void;
  onDelete: (word: Word) => void;
  onPlayAudio: (word: Word) => void;
  audioPlayingId: string | null;
  ringingId: string | null;
  registerCardRef: (id: string, el: HTMLDivElement | null) => void;
}

export function Shelf({
  id,
  title,
  titleColor,
  glyph,
  words,
  expanded,
  onToggleExpand,
  onPractice,
  onToggleLeech,
  onDelete,
  onPlayAudio,
  audioPlayingId,
  ringingId,
  registerCardRef,
}: ShelfProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { draggedRef, glideBy } = useShelfPan(rowRef);

  const levels = [...new Set(words.map((w) => w.level).filter(Boolean))] as string[];
  const practiceable = words.filter((w) => w.state === "due" || w.state === "new");

  return (
    <div id={id} className="rounded-xl border border-hairline bg-card p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {glyph && (
          <span className="text-sm font-bold" style={titleColor ? { color: titleColor } : undefined}>
            {glyph}
          </span>
        )}
        <span className="text-sm font-semibold" style={titleColor ? { color: titleColor } : undefined}>
          {title}
        </span>
        <span className="text-xs text-ink-400">
          {words.length} word{words.length === 1 ? "" : "s"}
          {levels.length > 0 && ` · ${levels.map((l) => l.toUpperCase()).join(" ")}`}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {onPractice && practiceable.length > 0 && (
            <Button
              size="sm"
              className="border-brand-100 bg-brand-50 text-brand-700 transition-transform hover:scale-105 hover:bg-brand-100"
              variant="outline"
              onClick={() => onPractice(practiceable)}
            >
              Practice {practiceable.length}
            </Button>
          )}
          {words.length > SHOW_EXPAND_CONTROLS_ABOVE && (
            <button
              className="hidden rounded-full px-2 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-paper hover:text-ink-900 lg:inline-block"
              onClick={onToggleExpand}
            >
              {expanded ? "Collapse" : `See all ${words.length}`}
            </button>
          )}
          {!expanded && words.length > SHOW_EXPAND_CONTROLS_ABOVE && (
            <span className="hidden gap-1 lg:flex">
              <button
                title="Scroll left"
                className="grid size-6 place-items-center rounded-full border border-hairline transition-all hover:scale-110 hover:border-brand-400 hover:bg-paper"
                onClick={() => glideBy(-CARD_WIDTH * 2)}
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </button>
              <button
                title="Scroll right"
                className="grid size-6 place-items-center rounded-full border border-hairline transition-all hover:scale-110 hover:border-brand-400 hover:bg-paper"
                onClick={() => glideBy(CARD_WIDTH * 2)}
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* below lg there's no "collapsed horizontal row" mode at all — sm
          gets a 2-column grid, md a 3-column grid, always, regardless of
          the expanded toggle (which only exists for lg's desktop-width
          collapse/scroll affordance) */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:hidden">
        {words.map((w) => (
          <WordCard
            key={w.id}
            word={w}
            onToggleLeech={onToggleLeech}
            onDelete={onDelete}
            onPlayAudio={onPlayAudio}
            audioPlaying={audioPlayingId === w.id}
            ringing={ringingId === w.id}
            cardRef={(el) => registerCardRef(w.id, el)}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        {expanded ? (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(176px, 1fr))" }}>
            {words.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                onToggleLeech={onToggleLeech}
                onDelete={onDelete}
                onPlayAudio={onPlayAudio}
                audioPlaying={audioPlayingId === w.id}
                ringing={ringingId === w.id}
                cardRef={(el) => registerCardRef(w.id, el)}
              />
            ))}
          </div>
        ) : (
          <div ref={rowRef} className="flex gap-2.5 overflow-x-auto [scroll-behavior:auto] [scrollbar-width:none]">
            {words.map((w) => (
              <div
                key={w.id}
                className="shrink-0"
                style={{ width: CARD_WIDTH }}
                onClickCapture={(e) => {
                  if (draggedRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                }}
              >
                <WordCard
                  word={w}
                  onToggleLeech={onToggleLeech}
                  onDelete={onDelete}
                  onPlayAudio={onPlayAudio}
                  audioPlaying={audioPlayingId === w.id}
                  ringing={ringingId === w.id}
                  cardRef={(el) => registerCardRef(w.id, el)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

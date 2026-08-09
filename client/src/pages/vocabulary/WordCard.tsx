import { useState } from "react";
import { Flag, Trash2, Volume2 } from "lucide-react";
import type { Word } from "../../api/types";
import { cn } from "../../lib/cn";
import { articleFront, GENUS_COLORS, STATE_COLORS, STATE_LABELS, THEMENFELD_LABELS, WORTART_COLORS } from "../../lib/vocab";

interface WordCardProps {
  word: Word;
  onToggleLeech: (word: Word) => void;
  onDelete: (word: Word) => void;
  onPlayAudio: (word: Word) => void;
  audioPlaying: boolean;
  ringing?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export function WordCard({ word, onToggleLeech, onDelete, onPlayAudio, audioPlaying, ringing, cardRef }: WordCardProps) {
  const [flipped, setFlipped] = useState(false);
  const stateColor = STATE_COLORS[word.state];
  const wortartColor = WORTART_COLORS[word.wortart];

  return (
    <div
      ref={cardRef}
      className="relative h-44 rounded-[14px] shadow-xs transition-all duration-200 [perspective:1000px] hover:-translate-y-0.5 hover:shadow-md"
      style={ringing ? { transition: "box-shadow 1.6s ease-out" } : undefined}
    >
      <div
        className={cn(
          "flip-card-3d relative h-full w-full cursor-pointer rounded-[14px] transition-transform duration-300",
          flipped && "[transform:rotateY(180deg)]",
        )}
        style={
          ringing
            ? { boxShadow: "0 0 0 3px var(--color-wortart-wendung), 0 0 0 6px rgb(236 72 153 / 0.15)" }
            : undefined
        }
        onClick={() => setFlipped((f) => !f)}
      >
        {/* front */}
        <div className="flip-card-face absolute inset-0 flex flex-col rounded-[14px] border border-hairline bg-card p-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: stateColor }} aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: wortartColor }}>
              {word.wortart}
            </span>
            {word.level && (
              <span className="rounded-full border border-hairline px-1.5 text-[10px] font-medium text-ink-400">
                {word.level.toUpperCase()}
              </span>
            )}
            {word.leech && <Flag className="ml-auto size-3 shrink-0 text-danger-600" aria-hidden="true" />}
          </div>

          <div className="mt-2 min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{word.headword}</p>
            {word.ipa && <p className="truncate text-xs text-ink-400">/{word.ipa}/</p>}
            {word.themenfeld[0] && (
              <p className="mt-1 truncate text-[11px] text-ink-400">{THEMENFELD_LABELS[word.themenfeld[0]]}</p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-[10px] font-medium text-ink-400">{STATE_LABELS[word.state]}</span>
            {word.audioPath && (
              <button
                title="Play pronunciation"
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border border-hairline hover:bg-paper",
                  audioPlaying && "border-transparent text-white",
                )}
                style={audioPlaying ? { backgroundColor: stateColor } : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAudio(word);
                }}
              >
                {audioPlaying ? <span className="text-[10px] leading-none">❚❚</span> : <Volume2 className="size-3.5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

        {/* back */}
        <div className="flip-card-face absolute inset-0 flex flex-col rounded-[14px] border border-hairline bg-ink-900 p-3 text-ink-50 [transform:rotateY(180deg)]">
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-xs">
            <p
              className="text-sm font-semibold"
              style={word.genus ? { color: GENUS_COLORS[word.genus] } : undefined}
            >
              {articleFront(word.headword, word.genus)}
            </p>
            {word.meaning && <p>{word.meaning}</p>}
            {word.example && <p className="italic text-ink-50/70">{word.example}</p>}
            {word.grammar && <p className="text-ink-50/70">{word.grammar}</p>}
            {word.srInterval !== null && (
              <p className="text-[10px] text-ink-50/50">
                interval {word.srInterval}d · ease {word.srEase}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              title={word.leech ? "Unflag as problem word" : "Flag as problem word"}
              className={cn(
                "grid size-7 place-items-center rounded-full border border-white/20 hover:bg-white/10",
                word.leech && "border-transparent bg-danger-600",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLeech(word);
              }}
            >
              <Flag className="size-3.5" aria-hidden="true" />
            </button>
            <button
              title="Remove word"
              className="grid size-7 place-items-center rounded-full border border-white/20 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(word);
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

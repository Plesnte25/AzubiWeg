import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Flag, Volume2 } from "lucide-react";
import type { Word } from "../../api/types";

type Tint = "neutral" | "leech" | "learning" | "mastered";

// Tailwind 4 statically scans source for literal class-name tokens, so each
// variant is spelled out in full here rather than built at runtime (e.g. via
// `.replace("text-", "bg-")`) — a computed string wouldn't be picked up.
// `learning`'s dot references the same `--color-state-learning` token
// StateTabs/MasteryStrip use, so it stays in sync rather than drifting to
// its own color (it previously aliased the blue `info` token by mistake).
const TINT_CLASSES: Record<Tint, { bg: string; text: string; dot: string }> = {
  neutral: { bg: "bg-ink-50", text: "text-ink-600", dot: "bg-ink-400" },
  leech: { bg: "bg-danger-50", text: "text-danger-700", dot: "bg-danger-600" },
  learning: { bg: "bg-ink-50", text: "text-ink-600", dot: "bg-[var(--color-state-learning)]" },
  mastered: { bg: "bg-ok-50", text: "text-ok-600", dot: "bg-ok-600" },
};

// same left-accent-stripe idiom as Dashboard's SkillTaskRow (inline
// borderLeftWidth/Color rather than a Tailwind border-l-* utility, so the
// stripe can reuse the exact same CSS custom-property values as the tint dot
// instead of a second parallel color table).
const ACCENT_COLOR: Record<Tint, string> = {
  neutral: "var(--color-ink-400)",
  leech: "var(--color-danger-600)",
  learning: "var(--color-state-learning)",
  mastered: "var(--color-ok-600)",
};

function tintFor(word: Word): Tint {
  if (word.leech) return "leech";
  if (word.state === "mastered") return "mastered";
  if (word.state === "learning") return "learning";
  return "neutral";
}

// a tap must land within this many px of where the pointer went down to
// count as "flip," not "the browser resolved this as a scroll gesture" —
// see the long comment in useShelfPan.ts's onPointerMove for why relying on
// the browser's synthetic `click` isn't good enough on a touch device inside
// a horizontally-scrollable row (this fixes VocabTile specifically since it
// has no drag-vs-tap coordination of its own the way the row itself does).
const TAP_MOVE_THRESHOLD = 4;

interface VocabTileProps {
  word: Word;
  flipped: boolean;
  onToggleFlip: () => void;
  onPlayAudio: (word: Word) => void;
  audioPlaying: boolean;
}

/** Compact flippable "poster" tile — the sm/md Netflix-shelf equivalent of
 * `WordCard.tsx`, same CSS flip technique (perspective + preserve-3d +
 * rotateY + backface-hidden on both faces) at a much smaller fixed size.
 * Flip state is controlled (lifted to Vocabulary.tsx) so only one tile is
 * ever flipped at a time across the whole page — see `flippedWordId` there.
 * Back face is deliberately minimal (IPA + meaning + pronunciation only, no
 * example/grammar/plural) — full detail stays reserved for list mode and the
 * review/practice flows. */
export default function VocabTile({ word, flipped, onToggleFlip, onPlayAudio, audioPlaying }: VocabTileProps) {
  const tint = TINT_CLASSES[tintFor(word)];
  const accent = ACCENT_COLOR[tintFor(word)];
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    startRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_MOVE_THRESHOLD) onToggleFlip();
  }

  return (
    <div
      className="h-[140px] w-[108px] shrink-0 cursor-pointer [perspective:1000px] md:h-[172px] md:w-[140px]"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        className={`flip-card-3d relative h-full w-full rounded-[14px] shadow-xs transition-transform duration-300 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        {/* front */}
        <div
          className={`flip-card-face absolute inset-0 flex flex-col rounded-[14px] border border-hairline p-2.5 ${tint.bg}`}
          style={{ borderLeftWidth: 3, borderLeftColor: accent }}
        >
          <div className="flex justify-end">
            {word.leech ? (
              <Flag className="size-3.5 text-danger-600" aria-hidden="true" />
            ) : (
              <span className={`size-2 rounded-full ${tint.dot}`} aria-hidden="true" />
            )}
          </div>
          <div className="mt-auto min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{word.headword}</p>
            <p className={`truncate text-[10px] font-medium ${tint.text}`}>{word.wortart}</p>
          </div>
        </div>

        {/* back — meaning + IPA + pronunciation only, nothing else */}
        <div
          className="flip-card-face absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-[14px] border border-hairline bg-ink-900 p-2.5 text-center [transform:rotateY(180deg)]"
          style={{ borderLeftWidth: 3, borderLeftColor: accent }}
        >
          {word.ipa && (
            <p className="text-[10px]" style={{ color: "var(--color-wortart-wendung)" }}>
              /{word.ipa}/
            </p>
          )}
          {word.meaning && <p className="line-clamp-3 text-sm font-medium text-white">{word.meaning}</p>}
          {word.audioPath && (
            <button
              type="button"
              title="Play pronunciation"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/20 hover:bg-white/10"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio(word);
              }}
            >
              {audioPlaying ? (
                <span className="text-[10px] leading-none text-white">❚❚</span>
              ) : (
                <Volume2 className="size-3.5 text-white" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

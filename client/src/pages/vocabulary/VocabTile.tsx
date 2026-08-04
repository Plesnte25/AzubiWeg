import { useState } from "react";
import { Flag } from "lucide-react";
import type { Word } from "../../api/types";
import { articleFront } from "../../lib/vocab";

type Tint = "neutral" | "leech" | "learned" | "mastered";

// Tailwind 4 statically scans source for literal class-name tokens, so each
// variant is spelled out in full here rather than built at runtime (e.g. via
// `.replace("text-", "bg-")`) — a computed string wouldn't be picked up.
const TINT_CLASSES: Record<Tint, { bg: string; text: string; dot: string }> = {
  neutral: { bg: "bg-ink-50", text: "text-ink-600", dot: "bg-ink-400" },
  leech: { bg: "bg-danger-50", text: "text-danger-700", dot: "bg-danger-600" },
  learned: { bg: "bg-info-50", text: "text-info-600", dot: "bg-info-600" },
  mastered: { bg: "bg-ok-50", text: "text-ok-600", dot: "bg-ok-600" },
};

function tintFor(word: Word): Tint {
  if (word.leech) return "leech";
  if (word.state === "mastered") return "mastered";
  if (word.state === "learning") return "learned";
  return "neutral";
}

/** Compact flippable "poster" tile — the sm/md Netflix-shelf equivalent of
 * `WordCard.tsx`, same CSS flip technique (perspective + preserve-3d +
 * rotateY + backface-hidden on both faces) at a much smaller fixed size,
 * with a simpler front (status + word + one tag) and back (IPA/translation/
 * POS/example only — no leech-toggle/delete/audio, those stay lg-only). */
export default function VocabTile({ word }: { word: Word }) {
  const [flipped, setFlipped] = useState(false);
  const tint = TINT_CLASSES[tintFor(word)];

  return (
    <div
      className="h-[140px] w-[108px] shrink-0 cursor-pointer [perspective:1000px] md:h-[172px] md:w-[140px]"
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className={`relative h-full w-full rounded-[14px] transition-transform duration-300 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        {/* front */}
        <div className={`absolute inset-0 flex flex-col rounded-[14px] border border-hairline p-2.5 [backface-visibility:hidden] ${tint.bg}`}>
          <div className="flex justify-end">
            {word.leech ? (
              <Flag className="size-3.5 text-danger-600" aria-hidden="true" />
            ) : (
              <span className={`size-2 rounded-full ${tint.dot}`} aria-hidden="true" />
            )}
          </div>
          <div className="mt-auto min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{articleFront(word.headword, word.genus)}</p>
            <p className={`truncate text-[10px] font-medium ${tint.text}`}>{word.wortart}</p>
          </div>
        </div>

        {/* back */}
        <div className="absolute inset-0 flex flex-col justify-center gap-1 rounded-[14px] border border-hairline bg-ink-900 p-2.5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {word.ipa && <p className="truncate text-[10px]" style={{ color: "var(--color-wortart-wendung)" }}>/{word.ipa}/</p>}
          {word.meaning && <p className="line-clamp-2 text-xs font-medium text-white">{word.meaning}</p>}
          <p className="truncate text-[10px] text-ink-50/70">
            {word.wortart}
            {word.genus ? ` · ${word.genus}` : ""}
          </p>
          {word.example && <p className="line-clamp-2 text-[10px] italic text-ink-50/50">{word.example}</p>}
        </div>
      </div>
    </div>
  );
}

import { Volume2 } from "lucide-react";
import type { Word } from "../../api/types";
import { articleFront, GENUS_COLORS, WORTART_COLORS } from "../../lib/vocab";
import { byHeadword } from "./shelves";

interface WordDictionaryListProps {
  words: Word[];
  onPlayAudio: (word: Word) => void;
  audioPlayingId: string | null;
}

/** The "our own dictionary" flat view (List mode) — every word passing the
 * current filters, sorted purely lexicographically (`byHeadword`, ignoring
 * articles), one evenly-spaced row per word with the full detail set (unlike
 * Tile mode's deliberately trimmed flip-card back — see VocabTile.tsx).
 * Shared verbatim between desktop and mobile: a flat list doesn't need
 * separate breakpoint variants the way the horizontal-scroll shelves do. */
export function WordDictionaryList({ words, onPlayAudio, audioPlayingId }: WordDictionaryListProps) {
  const sorted = [...words].sort(byHeadword);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-card p-6 text-center text-sm text-ink-400 shadow-xs">
        No words match your filters.
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline rounded-xl border border-hairline bg-card shadow-xs">
      {sorted.map((w) => (
        <div key={w.id} className="flex items-start gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className="text-[15px] font-semibold text-ink-900"
                style={w.genus ? { color: GENUS_COLORS[w.genus] } : undefined}
              >
                {articleFront(w.headword, w.genus)}
              </span>
              <span className="text-[11px] font-bold tracking-wide" style={{ color: WORTART_COLORS[w.wortart] }}>
                {w.wortart}
              </span>
              {w.ipa && <span className="text-xs text-ink-400">/{w.ipa}/</span>}
            </div>
            {w.meaning && <p className="mt-1 text-sm text-ink-600">{w.meaning}</p>}
            {w.example && <p className="mt-0.5 text-xs italic text-ink-400">{w.example}</p>}
          </div>
          {w.audioPath && (
            <button
              type="button"
              title="Play pronunciation"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline hover:border-brand-400"
              onClick={() => onPlayAudio(w)}
            >
              {audioPlayingId === w.id ? (
                <span className="text-[10px] leading-none">❚❚</span>
              ) : (
                <Volume2 className="size-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

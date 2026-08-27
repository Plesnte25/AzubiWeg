import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import type { Word } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { articleFront, GENUS_COLORS, WORTART_COLORS } from "../../lib/vocab";
import { byHeadword } from "./shelves";

interface WordDictionaryListProps {
  words: Word[];
  onPlayAudio: (word: Word) => void;
  audioPlayingId: string | null;
}

// Rendered, not fetched — the word set is already in memory (facet counts
// need the whole thing anyway, see api/words.ts), so this caps DOM rows, not
// the network payload. Resets to one page whenever the filtered set changes.
const PAGE_SIZE = 60;

/** The "our own dictionary" flat view (List mode) — every word passing the
 * current filters, sorted purely lexicographically (`byHeadword`, ignoring
 * articles), one evenly-spaced row per word with the full detail set (unlike
 * Tile mode's deliberately trimmed flip-card back — see VocabTile.tsx).
 * Shared verbatim between desktop and mobile: a flat list doesn't need
 * separate breakpoint variants the way the horizontal-scroll shelves do. */
export function WordDictionaryList({ words, onPlayAudio, audioPlayingId }: WordDictionaryListProps) {
  const sorted = [...words].sort(byHeadword);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [words]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-card p-6 text-center text-body text-ink-400 shadow-xs">
        No words match your filters.
      </div>
    );
  }

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-hairline rounded-xl border border-hairline bg-card shadow-xs">
        {visible.map((w) => (
          <div key={w.id} className="flex items-start gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className="text-body-lg font-semibold text-ink-900"
                  style={w.genus ? { color: GENUS_COLORS[w.genus] } : undefined}
                >
                  {articleFront(w.headword, w.genus)}
                </span>
                <span className="text-micro font-bold tracking-wide" style={{ color: WORTART_COLORS[w.wortart] }}>
                  {w.wortart}
                </span>
                {w.ipa && <span className="text-caption text-ink-400">/{w.ipa}/</span>}
              </div>
              {w.meaning && <p className="mt-1 text-body text-ink-600">{w.meaning}</p>}
              {w.example && <p className="mt-0.5 text-caption italic text-ink-400">{w.example}</p>}
            </div>
            {w.audioPath && (
              <button
                type="button"
                title="Play pronunciation"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline hover:border-brand-400"
                onClick={() => onPlayAudio(w)}
              >
                {audioPlayingId === w.id ? (
                  <span className="text-micro leading-none">❚❚</span>
                ) : (
                  <Volume2 className="size-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Show more ({remaining} remaining)
        </Button>
      )}
    </div>
  );
}

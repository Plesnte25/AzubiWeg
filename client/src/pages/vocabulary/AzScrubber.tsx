import { useMemo, useRef, useState } from "react";
import type { Word } from "../../api/types";
import { articleFront } from "../../lib/vocab";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AzScrubberProps {
  words: Word[];
  onJump: (word: Word) => void;
}

export function AzScrubber({ words, onJump }: AzScrubberProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const draggingRef = useRef(false);
  const lastLetterRef = useRef<string | null>(null);

  const byLetter = useMemo(() => {
    const map = new Map<string, Word[]>();
    for (const w of [...words].sort((a, b) => a.sortKey.localeCompare(b.sortKey))) {
      const letter = (w.sortKey[0] ?? "").toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(w);
    }
    return map;
  }, [words]);

  function jumpTo(letter: string) {
    const first = byLetter.get(letter)?.[0];
    if (first) onJump(first);
  }

  function letterAtY(clientY: number): string | null {
    const rail = railRef.current;
    if (!rail) return null;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const index = Math.min(LETTERS.length - 1, Math.floor(ratio * LETTERS.length));
    return LETTERS[index] ?? null;
  }

  function handleDragMove(clientY: number) {
    const letter = letterAtY(clientY);
    if (!letter || !byLetter.has(letter)) return;
    setHovered(letter);
    if (letter !== lastLetterRef.current) {
      lastLetterRef.current = letter;
      jumpTo(letter);
    }
  }

  const hoveredWords = hovered ? (byLetter.get(hovered) ?? []) : [];
  const hoveredIndex = hovered ? LETTERS.indexOf(hovered) : -1;

  return (
    <div className="relative z-30 hidden shrink-0 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] lg:w-8 lg:self-start">
      {hovered && hoveredWords.length > 0 && (
        <div
          className="absolute right-full z-30 mr-2 w-48 -translate-y-1/2 rounded-lg bg-ink-900 p-2.5 text-xs text-ink-50 shadow-lg"
          style={{ top: `${(hoveredIndex / (LETTERS.length - 1)) * 100}%` }}
        >
          <p className="mb-1 font-bold">
            {hovered} · {hoveredWords.length}
          </p>
          <ul className="space-y-0.5 text-ink-50/80">
            {hoveredWords.slice(0, 4).map((w) => (
              <li key={w.id} className="truncate">
                {articleFront(w.headword, w.genus)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        ref={railRef}
        className="flex h-full select-none flex-col items-center justify-between py-1"
        onPointerDown={(e) => {
          draggingRef.current = true;
          lastLetterRef.current = null;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          handleDragMove(e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) handleDragMove(e.clientY);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) setHovered(null);
        }}
      >
        {LETTERS.map((letter, i) => {
          const active = byLetter.has(letter);
          const distance = hoveredIndex < 0 ? Infinity : Math.abs(i - hoveredIndex);
          const scale = distance === 0 ? 1.55 : distance === 1 ? 1.3 : distance === 2 ? 1.12 : 1;
          return (
            <button
              key={letter}
              disabled={!active}
              className="w-full text-center text-[10px] font-semibold leading-none text-ink-400 transition-transform disabled:opacity-30"
              style={{
                transform: `scale(${scale})`,
                color: active && distance === 0 ? "var(--color-brand-500)" : undefined,
              }}
              onMouseEnter={() => !draggingRef.current && setHovered(letter)}
              onMouseLeave={() => !draggingRef.current && setHovered(null)}
              onClick={() => active && jumpTo(letter)}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { Word } from "../../api/types";
import { articleFront, STATE_COLORS } from "../../lib/vocab";

interface SearchModalProps {
  words: Word[];
  onClose: () => void;
}

/** sm/md circular-search-button destination — a self-contained lookup
 * modal, not a live shelf filter (own local `query`, independent of the
 * shared `filters.search` that drives lg's inline input). */
export default function SearchModal({ words, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const results = query.trim()
    ? words.filter((w) => `${w.headword} ${w.meaning ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    : [...words].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/40 p-4 pt-[70px] md:pt-[90px] lg:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[70vh] w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border border-hairline bg-card shadow-xl md:max-w-[420px]">
        <div className="flex shrink-0 items-center gap-2 border-b border-hairline p-3">
          <input
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="Search words or meanings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-paper" onClick={onClose} title="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-ink-400">No matches.</p>
          ) : (
            results.map((w) => (
              <div key={w.id} className="flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STATE_COLORS[w.state] }} aria-hidden="true" />
                <span className="shrink-0 font-medium text-ink-900">{articleFront(w.headword, w.genus)}</span>
                {w.meaning && <span className="min-w-0 flex-1 line-clamp-2 text-ink-400">{w.meaning}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

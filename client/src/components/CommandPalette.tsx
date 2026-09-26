import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, NotePencil, Plus } from "@phosphor-icons/react";
import { api } from "../api/client";
import { QUICK_LINKS } from "../lib/navDestinations";
import { stripHtml } from "../lib/text";
import { articleLabel, wordColor } from "../lib/wordBento";
import { useNavStack } from "../lib/navStack";
import { useOverlay } from "../lib/overlay";
import { AddWordSheet } from "../pages/words/AddWordSheet";

function ShortcutBadge({ letter }: { letter: string }) {
  return (
    <span
      className="ml-auto flex shrink-0 items-center gap-[3px] px-[6px] py-[1px] font-mono text-[11px] font-bold"
      style={{ background: "var(--plain2)", border: "2px solid var(--line)", borderRadius: 7 }}
    >
      G {letter.toUpperCase()}
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pt-2.5 pb-1 text-[12px] font-bold tracking-[.1em] uppercase" style={{ color: "var(--plainMuted)" }}>
      {children}
    </div>
  );
}

/**
 * ⌘K palette (German Companion Desktop.dc.html's search trigger) — real
 * search over words and notes (client-side substring match against the
 * same full lists Vocabulary.tsx/Notes.tsx already fetch), grouped into
 * WORDS / JUMP TO / ACTIONS / NOTES sections. JUMP TO's static entries
 * (QUICK_LINKS) double as the target set for the global "G <letter>" chord
 * shortcuts (see Layout.tsx) — the same letters are shown here purely as a
 * legend; the chord listener itself is inert while this palette is open
 * (its input has focus). The keyboard shortcut to open works at any width;
 * the visible trigger button only shows in Rail (lg+), matching the handoff.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push, switchTab } = useNavStack();
  const [query, setQuery] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words, enabled: open });
  const { data: notesData } = useQuery({ queryKey: ["notes", "wall"], queryFn: api.notesWall, enabled: open });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { z, isTop } = useOverlay(open);
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopRef.current()) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const wordMatches = useMemo(
    () =>
      !q
        ? []
        : (wordsData?.words ?? [])
            .filter((w) => w.headword.toLowerCase().includes(q) || (w.meaning?.toLowerCase().includes(q) ?? false))
            .slice(0, 6),
    [q, wordsData],
  );

  const noteMatches = useMemo(
    () =>
      !q
        ? []
        : (notesData?.notes ?? [])
            .filter((n) => (n.title?.toLowerCase().includes(q) ?? false) || stripHtml(n.body ?? "").toLowerCase().includes(q))
            .slice(0, 6),
    [q, notesData],
  );

  const linkMatches = useMemo(() => (q ? QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(q)) : QUICK_LINKS), [q]);

  // Actions always render once there's a query (even with zero word/link/
  // note/syllabus matches — "add as new word"/"new note" are always valid),
  // so any non-empty query already has something to show.
  const hasResults = q ? true : linkMatches.length > 0;

  const go = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <>
      {/* AddWordSheet must stay mounted even when the palette itself
          closes (its own BottomSheet handles open/close transitions) —
          "Add as new word" closes the palette (onClose below) while
          opening this, so this can't be gated on `open` too, or it would
          unmount in the same tick it's meant to appear. */}
      <AddWordSheet open={addingWord} onClose={() => setAddingWord(false)} initialWord={query.trim()} />
      {/* Portalled out of #root: the overlay stack makes #root inert while any overlay is open. */}
      {open && createPortal(
      <div
        className="fixed inset-0 flex items-start justify-center pt-[14vh]"
        style={{ background: "var(--scrim)", zIndex: z }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="mx-3 w-full max-w-[540px] overflow-hidden"
          style={{ background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 24, boxShadow: "9px 9px 0 var(--shadow)", transform: "rotate(-0.6deg)" }}
        >
          <div className="flex items-center gap-[10px] px-4 py-3.5" style={{ borderBottom: "2.5px dashed var(--line)" }}>
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words, notes, or jump to a screen…"
              aria-label="Search"
              className="flex-1 border-0 bg-transparent text-[16px] font-semibold outline-none"
              style={{ color: "inherit" }}
            />
            <span className="px-[6px] py-[1px] font-mono text-[11px] font-bold" style={{ background: "var(--plain2)", border: "2px solid var(--line)", borderRadius: 7 }}>
              esc
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto overscroll-contain p-2">
            {!hasResults ? (
              <p className="px-3 py-6 text-center text-[13px] font-semibold" style={{ color: "var(--plainMuted)" }}>
                No matches.
              </p>
            ) : (
              <>
                {wordMatches.length > 0 && (
                  <div>
                    <SectionLabel>Words</SectionLabel>
                    {wordMatches.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => go(() => push(`/words/${w.id}`))}
                        className="flex w-full cursor-pointer items-center gap-[11px] rounded-[12px] px-3 py-2.5 text-left font-semibold hover:bg-[var(--plain2)]"
                        style={{ color: "inherit" }}
                      >
                        <span
                          lang="de"
                          className="inline-flex shrink-0 items-center justify-center"
                          style={{ minWidth: 42, height: 26, padding: "0 7px", borderRadius: 8, border: "2px solid var(--line)", background: wordColor(w), color: "var(--onTile)", fontSize: 12, fontWeight: 700, transform: "rotate(-3deg)", boxSizing: "border-box" }}
                        >
                          {articleLabel(w)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold">{w.headword}</span>
                          {w.meaning && (
                            <span className="block truncate text-[11px]" style={{ color: "var(--plainMuted)" }}>
                              {w.meaning}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {linkMatches.length > 0 && (
                  <div>
                    <SectionLabel>Jump to</SectionLabel>
                    {linkMatches.map((l) => (
                      <button
                        key={l.to}
                        type="button"
                        onClick={() => go(() => switchTab(l.to))}
                        className="flex w-full cursor-pointer items-center gap-[11px] rounded-[12px] px-3 py-2.5 text-left font-semibold hover:bg-[var(--plain2)]"
                        style={{ color: "inherit" }}
                      >
                        <l.icon size={16} weight="fill" style={{ flexShrink: 0 }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{l.label}</span>
                        <ShortcutBadge letter={l.shortcut} />
                      </button>
                    ))}
                  </div>
                )}

                {q && (
                  <div>
                    <SectionLabel>Actions</SectionLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingWord(true);
                        onClose();
                      }}
                      className="flex w-full cursor-pointer items-center gap-[11px] rounded-[12px] px-3 py-2.5 text-left font-semibold hover:bg-[var(--plain2)]"
                      style={{ color: "inherit" }}
                    >
                      <Plus size={16} weight="fill" style={{ flexShrink: 0 }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold">Add &ldquo;{query.trim()}&rdquo; as a new word</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => go(() => push("/notes", { state: { draft: query.trim() } }))}
                      className="flex w-full cursor-pointer items-center gap-[11px] rounded-[12px] px-3 py-2.5 text-left font-semibold hover:bg-[var(--plain2)]"
                      style={{ color: "inherit" }}
                    >
                      <NotePencil size={16} weight="fill" style={{ flexShrink: 0 }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold">New note: &ldquo;{query.trim()}&rdquo;</span>
                    </button>
                  </div>
                )}

                {noteMatches.length > 0 && (
                  <div>
                    <SectionLabel>Notes</SectionLabel>
                    {noteMatches.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => go(() => push("/notes", { state: { open: n.id } }))}
                        className="flex w-full cursor-pointer items-center gap-[11px] rounded-[12px] px-3 py-2.5 text-left font-semibold hover:bg-[var(--plain2)]"
                        style={{ color: "inherit" }}
                      >
                        <NotePencil size={16} weight="fill" style={{ flexShrink: 0 }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold">{n.title?.trim() || "Untitled note"}</span>
                          <span className="block truncate text-[11px]" style={{ color: "var(--plainMuted)" }}>
                            {stripHtml(n.body ?? "").slice(0, 60)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>,
      document.body,
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, NotePencil, Path as SyllabusIcon, Plus } from "@phosphor-icons/react";
import { api } from "../api/client";
import { QUICK_LINKS } from "../lib/navDestinations";
import type { Themenfeld } from "../api/types";
import { stripHtml } from "../lib/text";
import { chipColor, chipLabel } from "../lib/wordDisplay";
import { useNavStack } from "../lib/navStack";
import { bestMatchingStation, deriveStations } from "../pages/plan/stations";
import { AddWordsDialog } from "../pages/vocabulary/AddWordsDialog";

function ShortcutBadge({ letter }: { letter: string }) {
  return (
    <span
      className="ml-auto flex shrink-0 items-center gap-[3px] rounded px-[5px] py-[2px] font-mono text-[9.5px] font-semibold"
      style={{ background: "rgba(233,233,237,.08)", color: "rgba(233,233,237,.4)" }}
    >
      G {letter.toUpperCase()}
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.35)" }}>
      {children}
    </div>
  );
}

// Vocab themenfeld labels (THEMENFELD_LABELS, lib/vocab.ts) are German;
// syllabus station themes are English — bestMatchingStation's word-overlap
// needs same-language tokens, so this probes with an English gloss per
// themenfeld instead of the German display label. Several categories
// (medien_technik, geld, gesellschaft, …) genuinely have no matching
// grammar-focused station in this app's syllabus — no match then is
// correct, the same "empty is a normal outcome" convention
// WordFamilySheet.tsx already documents for its own best-effort lookup.
const THEMENFELD_PROBE: Record<Themenfeld, string> = {
  person_familie: "personal world family",
  alltag_zuhause: "everyday life living home",
  essen_einkaufen: "everyday life shopping",
  arbeit_ausbildung: "work free time education",
  bildung: "education exam prep",
  gesundheit: "health basics",
  reise_verkehr: "out about travel transport",
  freizeit_kultur: "work free time culture",
  medien_technik: "media technology",
  geld: "money",
  amt_buerokratie: "bureaucracy office",
  gefuehle_meinung: "feelings opinion personal world",
  natur_umwelt: "nature environment",
  gesellschaft: "society",
};

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
  const { data: notesData } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed(), enabled: open });
  const { data: syllabusData } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus, enabled: open });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  // Contextual "Syllabus — Chapter N" jump target: the top word match's
  // themenfeld, fuzzy-matched against the active level's syllabus stations
  // via the same word-overlap heuristic Dashboard.tsx/Plan.tsx already use
  // for the analogous roadmap-week-theme -> station pairing (see
  // THEMENFELD_PROBE above for why it probes with an English gloss).
  const syllabusJump = useMemo(() => {
    const topWord = wordMatches[0];
    const themenfeld = topWord?.themenfeld[0];
    if (!themenfeld || !syllabusData) return null;
    const activeLevel = syllabusData.levels.find((l) => l.percent < 100)?.level ?? syllabusData.levels[syllabusData.levels.length - 1]?.level;
    const levelItems = syllabusData.items.filter((i) => i.level === activeLevel);
    const stations = deriveStations(levelItems);
    const station = bestMatchingStation(stations, THEMENFELD_PROBE[themenfeld]);
    if (!station) return null;
    const index = stations.indexOf(station);
    return { label: `Syllabus — Chapter ${index + 1}: ${station.theme}`, theme: station.theme };
  }, [wordMatches, syllabusData]);

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
      {/* AddWordsDialog must stay mounted even when the palette itself
          closes (its own BottomSheet handles open/close transitions) —
          "Add as new word" closes the palette (onClose below) while
          opening this, so this can't be gated on `open` too, or it would
          unmount in the same tick it's meant to appear. */}
      <AddWordsDialog open={addingWord} onClose={() => setAddingWord(false)} initialWord={query.trim()} />
      {open && (
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh]"
        style={{ background: "rgba(10,11,18,.6)" }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-[520px] overflow-hidden rounded-[14px]" style={{ background: "#1c1f2c", boxShadow: "0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(233,233,237,.1)" }}>
          <div className="flex items-center gap-[10px] px-4 py-3.5" style={{ borderBottom: "1px solid rgba(233,233,237,.08)" }}>
            <MagnifyingGlass size={16} weight="regular" style={{ color: "rgba(233,233,237,.45)" }} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words, notes, or jump to a screen…"
              className="flex-1 border-0 bg-transparent text-[14.5px] outline-none"
              style={{ color: "#e9e9ed" }}
            />
            <span className="rounded px-[5px] py-[2px] font-mono text-[10px] font-semibold" style={{ background: "rgba(233,233,237,.08)", color: "rgba(233,233,237,.4)" }}>
              esc
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {!hasResults ? (
              <p className="px-3 py-6 text-center text-[12.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
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
                        className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                        style={{ color: "#e9e9ed" }}
                      >
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[10px] font-medium"
                          style={{ background: "rgba(233,233,237,.08)", color: chipColor(w) }}
                        >
                          {chipLabel(w)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px]">{w.headword}</span>
                          {w.meaning && (
                            <span className="block truncate text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
                              {w.meaning}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {(linkMatches.length > 0 || syllabusJump) && (
                  <div>
                    <SectionLabel>Jump to</SectionLabel>
                    {linkMatches.map((l) => (
                      <button
                        key={l.to}
                        type="button"
                        onClick={() => go(() => switchTab(l.to))}
                        className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                        style={{ color: "#e9e9ed" }}
                      >
                        <l.icon size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{l.label}</span>
                        <ShortcutBadge letter={l.shortcut} />
                      </button>
                    ))}
                    {syllabusJump && (
                      <button
                        type="button"
                        onClick={() => go(() => push("/plan/syllabus", { state: { openStationTheme: syllabusJump.theme } }))}
                        className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                        style={{ color: "#e9e9ed" }}
                      >
                        <SyllabusIcon size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{syllabusJump.label}</span>
                        <ShortcutBadge letter="s" />
                      </button>
                    )}
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
                      className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                      style={{ color: "#e9e9ed" }}
                    >
                      <Plus size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">Add &ldquo;{query.trim()}&rdquo; as a new word</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => go(() => push("/plan/notes/edit/new", { state: { contextTag: query.trim() } }))}
                      className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                      style={{ color: "#e9e9ed" }}
                    >
                      <NotePencil size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">New note tagged &ldquo;{query.trim()}&rdquo;</span>
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
                        onClick={() => go(() => push(`/plan/notes/edit/${n.id}`))}
                        className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                        style={{ color: "#e9e9ed" }}
                      >
                        <NotePencil size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px]">{n.title?.trim() || "Untitled note"}</span>
                          <span className="block truncate text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
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
      </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Briefcase,
  Cards,
  ChartLineUp,
  Exam,
  House,
  MagnifyingGlass,
  NotePencil,
  Path,
} from "@phosphor-icons/react";
import { api } from "../api/client";
import { stripHtml } from "../lib/text";
import { useNavStack } from "../lib/navStack";

const QUICK_LINKS = [
  { to: "/", label: "Today", icon: House },
  { to: "/words", label: "Words", icon: Cards },
  { to: "/plan", label: "Plan", icon: Path },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/stats", label: "Stats", icon: ChartLineUp },
  { to: "/plan/sources", label: "Sources", icon: BookOpen },
  { to: "/plan/self-tests", label: "Self-tests", icon: Exam },
];

interface Result {
  key: string;
  icon: typeof House;
  label: string;
  sub?: string;
  go: () => void;
}

/**
 * ⌘K palette (German Companion Desktop.dc.html's search trigger) — real
 * search over words and notes (client-side substring match against the
 * same full lists Vocabulary.tsx/Notes.tsx already fetch, same pattern as
 * Vocabulary's own search box), plus static quick-links to every real
 * route. The keyboard shortcut works at any width; the visible trigger
 * button only shows in DesktopSidebar (lg+), matching the handoff.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push, switchTab } = useNavStack();
  const [query, setQuery] = useState("");
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words, enabled: open });
  const { data: notesData } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed(), enabled: open });

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

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return QUICK_LINKS.map((l) => ({ key: l.to, icon: l.icon, label: l.label, go: () => switchTab(l.to) }));
    }
    const wordMatches: Result[] = (wordsData?.words ?? [])
      .filter((w) => w.headword.toLowerCase().includes(q) || (w.meaning?.toLowerCase().includes(q) ?? false))
      .slice(0, 6)
      .map((w) => ({ key: `word:${w.id}`, icon: Cards, label: w.headword, sub: w.meaning ?? undefined, go: () => push(`/words/${w.id}`) }));
    const noteMatches: Result[] = (notesData?.notes ?? [])
      .filter((n) => (n.title?.toLowerCase().includes(q) ?? false) || stripHtml(n.body ?? "").toLowerCase().includes(q))
      .slice(0, 6)
      .map((n) => ({
        key: `note:${n.id}`,
        icon: NotePencil,
        label: n.title?.trim() || "Untitled note",
        sub: stripHtml(n.body ?? "").slice(0, 60) || undefined,
        go: () => push(`/plan/notes/edit/${n.id}`),
      }));
    const linkMatches: Result[] = QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(q)).map((l) => ({
      key: l.to,
      icon: l.icon,
      label: l.label,
      go: () => switchTab(l.to),
    }));
    return [...linkMatches, ...wordMatches, ...noteMatches];
  }, [query, wordsData, notesData, push, switchTab]);

  if (!open) return null;

  return (
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
        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
              No matches.
            </p>
          ) : (
            results.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    r.go();
                    onClose();
                  }}
                  className="flex w-full items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left hover:bg-white/5"
                  style={{ color: "#e9e9ed" }}
                >
                  <Icon size={16} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{r.label}</span>
                    {r.sub && (
                      <span className="block truncate text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
                        {r.sub}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

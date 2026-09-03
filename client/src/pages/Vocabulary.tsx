import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CaretRight, MagnifyingGlass, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Grade } from "../api/types";
import { barColor, buildSparkline, chipColor, chipLabel, NO_DATA_HEIGHT, SPARKLINE_SLOTS } from "../lib/wordDisplay";
import { useNavStack } from "../lib/navStack";
import { AddWordsDialog } from "./vocabulary/AddWordsDialog";
import { NotesDock } from "./words/NotesDock";
import { WordDetailContent } from "./words/WordDetailContent";

type FilterKey = "all" | "der" | "die" | "das" | "verb";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "all" },
  { key: "der", label: "der" },
  { key: "die", label: "die" },
  { key: "das", label: "das" },
  { key: "verb", label: "verbs" },
];

export default function Vocabulary() {
  const { push } = useNavStack();
  const { data } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: historyData } = useQuery({ queryKey: ["reviews", "history", "sparkline"], queryFn: () => api.reviewHistory(200) });
  const allWords = useMemo(() => data?.words ?? [], [data]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingHeadword, setDraggingHeadword] = useState<string | null>(null);

  const sparklines = useMemo(() => {
    const byWord = new Map<string, Grade[]>();
    for (const entry of [...(historyData?.entries ?? [])].reverse()) {
      const list = byWord.get(entry.wordId);
      if (list) list.push(entry.grade);
      else byWord.set(entry.wordId, [entry.grade]);
    }
    const result = new Map<string, number[]>();
    for (const [wordId, grades] of byWord) result.set(wordId, buildSparkline(grades));
    return result;
  }, [historyData]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      allWords.filter((w) => {
        const okFilter = filter === "all" || (filter === "verb" ? w.wortart === "Verb" : w.genus === filter);
        const okQuery = !q || w.headword.toLowerCase().includes(q) || (w.meaning?.toLowerCase().includes(q) ?? false);
        return okFilter && okQuery;
      }),
    [allWords, filter, q],
  );

  const shakyCount = allWords.filter((w) => w.leech).length;
  const resultLabel = q ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}` : "All words";
  const effectiveSelectedId = selectedId ?? filtered[0]?.id ?? null;

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col pt-[calc(env(safe-area-inset-top)+18px)] lg:hidden"
      style={{ background: "#161826" }}
    >
      <div className="px-[18px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
              Words
            </div>
            <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {allWords.length} total · {shakyCount} shaky
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex min-h-[38px] items-center gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            Word
          </button>
        </div>

        <div className="relative mt-[13px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your words"
            aria-label="Search your words"
            className="min-h-[42px] w-full rounded-[11px] pr-[38px] pl-9 text-[15px] outline-none"
            style={{ background: "#1c1f2c", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.1)" }}
          />
          <MagnifyingGlass size={16} weight="regular" className="absolute top-[13px] left-3" style={{ color: "rgba(233,233,237,.45)" }} aria-hidden="true" />
          <SlidersHorizontal size={16} weight="regular" className="absolute top-[13px] right-3" style={{ color: "rgba(233,233,237,.45)" }} aria-hidden="true" />
        </div>

        <div className="mt-[11px] flex gap-1.5 overflow-hidden">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className="rounded-full px-[11px] py-[5px] text-[12px] whitespace-nowrap transition-colors"
                style={{
                  background: active ? "rgba(145,132,217,.22)" : "#20222f",
                  color: active ? "#d2cefd" : "rgba(233,233,237,.6)",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-[15px] min-h-0 flex-1 overflow-y-auto pb-2.5">
        <div className="flex items-center justify-between px-[18px] pb-2">
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            {resultLabel}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.35)" }}>
            history
          </div>
        </div>

        {filtered.map((w) => {
          const bars = sparklines.get(w.id) ?? Array<number>(SPARKLINE_SLOTS).fill(NO_DATA_HEIGHT);
          const plural = w.declension?.nom?.pl;
          return (
            <div
              key={w.id}
              onClick={() => push(`/words/${w.id}`)}
              className="flex cursor-pointer items-center gap-3 px-[18px] py-3"
              style={{ borderBottom: "1px solid rgba(233,233,237,.06)" }}
            >
              <div
                className="grid size-[34px] shrink-0 place-items-center rounded-[9px] text-[11px] font-medium"
                style={{ background: "rgba(233,233,237,.08)", color: chipColor(w) }}
              >
                {chipLabel(w)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-medium">{w.headword}</div>
                <div className="truncate text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                  {w.meaning ?? "no meaning yet"}
                  {plural ? ` · Pl. ${plural}` : ""}
                </div>
              </div>
              <div className="flex h-[18px] shrink-0 items-end gap-[2.5px]">
                {bars.map((h, i) => (
                  <i key={i} className="block w-1 rounded-[1px]" style={{ height: h, background: barColor(h) }} />
                ))}
              </div>
              <CaretRight size={13} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <MagnifyingGlass size={22} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
            <div className="mt-2.5 text-[13.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
              Nothing matches &ldquo;{query}&rdquo;.
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-[13px] min-h-10 rounded-[10px] px-4 text-[13.5px] font-medium text-white"
              style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
            >
              Add it as a new word
            </button>
          </div>
        )}
      </div>

    </div>

    {/* ── lg+: master-detail + docked Notes (German Companion
        Desktop.dc.html id="1b") — same word list/filter/search state as
        mobile, a click selects instead of navigating away. Word rows are
        draggable onto NotesDock's note cards to link a word to a note
        (Note.wordId, already real — see NotesDock.tsx's doc comment for
        the one adaptation from the literal drag-onto-active-composer
        interaction). ── */}
    <div className="hidden min-h-0 lg:grid lg:h-full lg:grid-cols-[300px_1fr_300px] lg:gap-5">
      <div className="flex min-h-0 flex-col">
        <div className="px-[18px] pt-[18px] pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[19px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
                Words
              </div>
              <div className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
                {allWords.length} total · {shakyCount} shaky
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex min-h-[34px] items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-medium text-white"
              style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              Word
            </button>
          </div>
          <div className="relative mt-[11px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your words"
              aria-label="Search your words"
              className="min-h-[38px] w-full rounded-[10px] pl-[34px] text-[13.5px] outline-none"
              style={{ background: "#1c1f2c", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.1)" }}
            />
            <MagnifyingGlass size={15} weight="regular" className="absolute top-[11px] left-[11px]" style={{ color: "rgba(233,233,237,.45)" }} aria-hidden="true" />
          </div>
          <div className="mt-[9px] flex gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="rounded-full px-[10px] py-1 text-[10.5px] whitespace-nowrap"
                  style={{ background: active ? "rgba(145,132,217,.22)" : "#20222f", color: active ? "#d2cefd" : "rgba(233,233,237,.6)" }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {filtered.map((w) => {
            const bars = sparklines.get(w.id) ?? Array<number>(SPARKLINE_SLOTS).fill(NO_DATA_HEIGHT);
            const active = w.id === effectiveSelectedId;
            return (
              <div
                key={w.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/word-id", w.id);
                  e.dataTransfer.effectAllowed = "link";
                  setDraggingHeadword(w.headword);
                }}
                onDragEnd={() => setDraggingHeadword(null)}
                onClick={() => setSelectedId(w.id)}
                className="flex cursor-grab items-center gap-[11px] px-[18px] py-[11px] active:cursor-grabbing"
                style={{
                  background: active ? "linear-gradient(90deg,rgba(145,132,217,.14),transparent)" : "transparent",
                  boxShadow: active ? "inset 2px 0 0 #9184d9" : "none",
                  borderBottom: "1px solid rgba(233,233,237,.05)",
                }}
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-[9px] text-[10.5px] font-medium" style={{ background: "rgba(233,233,237,.08)", color: chipColor(w) }}>
                  {chipLabel(w)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{w.headword}</div>
                  <div className="truncate text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                    {w.meaning ?? "no meaning yet"}
                  </div>
                </div>
                <div className="flex h-4 shrink-0 items-end gap-[2.5px]">
                  {bars.map((h, i) => (
                    <i key={i} className="block w-1 rounded-[1px]" style={{ height: h * 0.8, background: barColor(h) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 min-w-0">
        {effectiveSelectedId ? (
          <WordDetailContent key={effectiveSelectedId} id={effectiveSelectedId} embedded />
        ) : (
          <div className="grid h-full place-items-center text-[13px]" style={{ color: "rgba(233,233,237,.4)" }}>
            No words yet.
          </div>
        )}
      </div>

      <div className="min-h-0">
        <NotesDock draggingHeadword={draggingHeadword} />
      </div>
    </div>

      <AddWordsDialog
        open={showAdd}
        initialWord={q && filtered.length === 0 ? query.trim() : ""}
        onClose={() => setShowAdd(false)}
      />
    </>
  );
}

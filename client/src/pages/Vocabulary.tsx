import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { api, playWordAudio } from "../api/client";
import type { Themenfeld, Word } from "../api/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SkeletonCard } from "../components/ui/Skeleton";
import { THEMENFELD_LABELS, THEMENFELD_ORDER, WORTART_COLORS, WORTART_ORDER } from "../lib/vocab";
import { AddWordsDialog } from "./vocabulary/AddWordsDialog";
import { AnalyticsModal } from "./vocabulary/AnalyticsModal";
import { AzScrubber } from "./vocabulary/AzScrubber";
import { FilterRail } from "./vocabulary/FilterRail";
import { MasteryBar } from "./vocabulary/MasteryBar";
import { PracticeOverlay } from "./vocabulary/PracticeOverlay";
import { Shelf } from "./vocabulary/Shelf";
import { glidePageTo } from "../lib/useShelfPan";
import { DEFAULT_FILTERS, useVocabFacets, type VocabFilters } from "./vocabulary/useVocabFacets";

type GroupBy = "wortart" | "thema" | "level" | "woche" | "az" | "neu";
const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "wortart", label: "Wortart" },
  { key: "thema", label: "Thema" },
  { key: "level", label: "Level" },
  { key: "woche", label: "Woche" },
  { key: "az", label: "A–Z" },
  { key: "neu", label: "Neu" },
];

interface ShelfGroup {
  id: string;
  title: string;
  titleColor?: string;
  glyph?: string;
  words: Word[];
}

const byHeadword = (a: Word, b: Word) => a.sortKey.localeCompare(b.sortKey);

function buildShelves(words: Word[], groupBy: GroupBy): ShelfGroup[] {
  if (groupBy === "neu") {
    return [
      {
        id: "neu",
        title: "Newest first",
        words: [...words].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      },
    ];
  }
  if (groupBy === "wortart") {
    return WORTART_ORDER.map((w) => ({
      id: `wortart-${w}`,
      title: w,
      glyph: "●",
      titleColor: WORTART_COLORS[w],
      words: words.filter((word) => word.wortart === w).sort(byHeadword),
    })).filter((s) => s.words.length > 0);
  }
  if (groupBy === "thema") {
    const groups = THEMENFELD_ORDER.map((t) => ({
      id: `thema-${t}`,
      title: THEMENFELD_LABELS[t],
      words: words.filter((w) => w.themenfeld.includes(t)).sort(byHeadword),
    }));
    const unclassified = {
      id: "thema-unclassified",
      title: "Unclassified",
      words: words.filter((w) => w.themenfeld.length === 0).sort(byHeadword),
    };
    return [...groups, unclassified].filter((s) => s.words.length > 0);
  }
  if (groupBy === "level") {
    const levels: { key: string | null; label: string }[] = [
      { key: "a1", label: "A1" },
      { key: "a2", label: "A2" },
      { key: "b1", label: "B1" },
      { key: null, label: "Unclassified" },
    ];
    return levels
      .map((l) => ({ id: `level-${l.label}`, title: l.label, words: words.filter((w) => w.level === l.key).sort(byHeadword) }))
      .filter((s) => s.words.length > 0);
  }
  if (groupBy === "woche") {
    const map = new Map<string, Word[]>();
    for (const w of words) {
      const key = w.lesson ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return [...map.entries()]
      .map(([key, ws]) => ({ id: `woche-${key || "none"}`, title: key || "No lesson", words: ws.sort(byHeadword) }))
      .sort((a, b) => (a.title === "No lesson" ? 1 : b.title === "No lesson" ? -1 : a.title.localeCompare(b.title)));
  }
  // az
  const map = new Map<string, Word[]>();
  for (const w of words) {
    const letter = (w.sortKey[0] ?? "#").toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(w);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, ws]) => ({ id: `az-${letter}`, title: letter, words: ws.sort(byHeadword) }));
}

function activePills(filters: VocabFilters, onChange: (patch: Partial<VocabFilters>) => void) {
  const pills: { key: string; label: string; onClear: () => void }[] = [];
  if (filters.search) pills.push({ key: "search", label: `"${filters.search}"`, onClear: () => onChange({ search: "" }) });
  if (filters.state !== "all") pills.push({ key: "state", label: `STATE ${filters.state}`, onClear: () => onChange({ state: "all" }) });
  if (filters.level !== "all") pills.push({ key: "level", label: `LEVEL ${filters.level.toUpperCase()}`, onClear: () => onChange({ level: "all" }) });
  if (filters.wortart !== "all") pills.push({ key: "wortart", label: `WORTART ${filters.wortart}`, onClear: () => onChange({ wortart: "all" }) });
  if (filters.genus !== "all") pills.push({ key: "genus", label: `GENUS ${filters.genus}`, onClear: () => onChange({ genus: "all" }) });
  if (filters.themenfeld !== "all")
    pills.push({
      key: "themenfeld",
      label: `THEMA ${filters.themenfeld === "unclassified" ? "Unclassified" : THEMENFELD_LABELS[filters.themenfeld]}`,
      onClear: () => onChange({ themenfeld: "all" }),
    });
  if (filters.lesson !== "all") pills.push({ key: "lesson", label: `WOCHE ${filters.lesson}`, onClear: () => onChange({ lesson: "all" }) });
  return pills;
}

export default function Vocabulary() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: statsData } = useQuery({ queryKey: ["reviews", "stats"], queryFn: api.reviewStats });
  const allWords = useMemo(() => data?.words ?? [], [data]);

  const [filters, setFilters] = useState<VocabFilters>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("wortart");
  const [showAdd, setShowAdd] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  // null = closed, undefined = general due+fresh queue, Word[] = curated queue
  const [practiceWords, setPracticeWords] = useState<Word[] | undefined | null>(null);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const [ringingId, setRingingId] = useState<string | null>(null);
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set());
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const onFilterChange = (patch: Partial<VocabFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const { filtered, stateCounts, levelCounts, wortartCounts, genusCounts, themenfeldCounts, lessonCounts } = useVocabFacets(
    allWords,
    filters,
  );

  const shelves = useMemo(() => buildShelves(filtered, groupBy), [filtered, groupBy]);
  const problemWords = useMemo(() => filtered.filter((w) => w.leech).sort(byHeadword), [filtered]);
  const showProblemShelf = problemWords.length > 0 && filters.state !== "leech";
  const pills = activePills(filters, onFilterChange);

  const del = useMutation({
    mutationFn: (word: Word) => api.deleteWord(word.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["words"] }),
  });
  const toggleLeech = useMutation({
    mutationFn: (word: Word) => api.updateWord(word.id, { leech: !word.leech }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["words"] }),
  });

  function handlePlayAudio(word: Word) {
    setAudioPlayingId(word.id);
    void playWordAudio(word.id).catch(() => {});
    setTimeout(() => setAudioPlayingId((id) => (id === word.id ? null : id)), 1500);
  }

  function handleDelete(word: Word) {
    if (confirm(`Delete "${word.headword}"? This also removes it from your vault.`)) del.mutate(word);
  }

  function toggleShelfExpand(id: string) {
    setExpandedShelves((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const registerCardRef = (id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  function handleJump(word: Word) {
    const shelf = shelves.find((s) => s.words.some((w) => w.id === word.id));
    const index = shelf?.words.findIndex((w) => w.id === word.id) ?? -1;
    const needsExpand = shelf !== undefined && index >= 5 && !expandedShelves.has(shelf.id);
    if (shelf && needsExpand) setExpandedShelves((prev) => new Set(prev).add(shelf.id));

    setTimeout(
      () => {
        const el = cardRefs.current.get(word.id);
        if (el) glidePageTo(el.getBoundingClientRect().top + window.scrollY - 140);
        setRingingId(word.id);
        setTimeout(() => setRingingId((id) => (id === word.id ? null : id)), 1600);
      },
      needsExpand ? 60 : 0,
    );
  }

  function openPractice(words?: Word[]) {
    setPracticeWords(words ?? undefined);
  }

  function handleDrillTheme(themenfeld: string) {
    onFilterChange({ themenfeld: themenfeld as Themenfeld });
    setShowAnalytics(false);
    setPracticeWords(
      allWords.filter((w) => w.themenfeld.includes(themenfeld as Themenfeld) && (w.state === "due" || w.state === "new")),
    );
  }

  const dueCount = allWords.filter((w) => w.state === "due").length;
  const newCount = allWords.filter((w) => w.state === "new").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Vocabulary</h1>
          <p className="text-sm text-ink-600">
            {allWords.length} words · {dueCount} due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-56 rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="Search words or meanings…"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
          <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setShowAdd(true)}>
            Add words
          </Button>
        </div>
      </div>

      {(dueCount > 0 || newCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-card px-4 py-3">
          <p className="text-sm text-ink-600">
            {dueCount > 0 && (
              <>
                You have <span className="font-semibold text-ink-900">{dueCount}</span> due
              </>
            )}
            {dueCount > 0 && newCount > 0 && " · "}
            {newCount > 0 && (
              <>
                <span className="font-semibold text-ink-900">{newCount}</span> new
              </>
            )}
          </p>
          <div className="ml-auto flex gap-2">
            {dueCount > 0 && (
              <Button size="sm" onClick={() => openPractice(allWords.filter((w) => w.state === "due"))}>
                Practice {dueCount} due
              </Button>
            )}
            {newCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => openPractice(allWords.filter((w) => w.state === "new"))}>
                Drill {newCount} new
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FilterRail
          filters={filters}
          onChange={onFilterChange}
          levelCounts={levelCounts}
          wortartCounts={wortartCounts}
          genusCounts={genusCounts}
          themenfeldCounts={themenfeldCounts}
          lessonCounts={lessonCounts}
          filtered={filtered}
        />

        <div className="min-w-0 flex-1 space-y-3">
          <MasteryBar
            allWords={allWords}
            stateCounts={stateCounts}
            filters={filters}
            onChangeState={(state) => onFilterChange({ state })}
            reviewsToday={statsData?.reviewsToday ?? 0}
            totalReviews={statsData?.totalReviews ?? 0}
            onOpenAnalytics={() => setShowAnalytics(true)}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {pills.map((p) => (
                <button
                  key={p.key}
                  className="flex items-center gap-1 rounded-full border border-hairline bg-card px-2.5 py-1 text-xs text-ink-600 hover:border-brand-400"
                  onClick={p.onClear}
                >
                  {p.label}
                  <X className="size-3" aria-hidden="true" />
                </button>
              ))}
              {pills.length > 0 && (
                <button className="text-xs font-medium text-ink-400 hover:text-ink-900" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear all
                </button>
              )}
            </div>
            <SegmentedControl options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
          </div>

          {!data ? (
            <div className="space-y-3">
              <SkeletonCard className="h-40" />
              <SkeletonCard className="h-40" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={allWords.length === 0 ? "No words yet" : "No words found"}
              description={
                allWords.length === 0
                  ? "Add your first word above to get started."
                  : "Try a different search, or clear your filters."
              }
              action={
                allWords.length > 0 && pills.length > 0 ? (
                  <Button size="sm" variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {showProblemShelf && (
                <Shelf
                  id="problem-words"
                  title="Problem words"
                  titleColor="var(--color-state-problem)"
                  words={problemWords}
                  expanded={expandedShelves.has("problem-words")}
                  onToggleExpand={() => toggleShelfExpand("problem-words")}
                  onPractice={openPractice}
                  onToggleLeech={(w) => toggleLeech.mutate(w)}
                  onDelete={handleDelete}
                  onPlayAudio={handlePlayAudio}
                  audioPlayingId={audioPlayingId}
                  ringingId={ringingId}
                  registerCardRef={registerCardRef}
                />
              )}
              {shelves.map((shelf) => (
                <Shelf
                  key={shelf.id}
                  id={shelf.id}
                  title={shelf.title}
                  titleColor={shelf.titleColor}
                  glyph={shelf.glyph}
                  words={shelf.words}
                  expanded={expandedShelves.has(shelf.id)}
                  onToggleExpand={() => toggleShelfExpand(shelf.id)}
                  onPractice={openPractice}
                  onToggleLeech={(w) => toggleLeech.mutate(w)}
                  onDelete={handleDelete}
                  onPlayAudio={handlePlayAudio}
                  audioPlayingId={audioPlayingId}
                  ringingId={ringingId}
                  registerCardRef={registerCardRef}
                />
              ))}
            </div>
          )}
        </div>

        <AzScrubber words={filtered} onJump={handleJump} />
      </div>

      {showAdd && <AddWordsDialog onClose={() => setShowAdd(false)} />}
      {showAnalytics && <AnalyticsModal words={allWords} onClose={() => setShowAnalytics(false)} onDrillTheme={handleDrillTheme} />}
      {practiceWords !== null && <PracticeOverlay words={practiceWords} onClose={() => setPracticeWords(null)} />}
    </div>
  );
}

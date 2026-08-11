import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api, playWordAudio } from "../api/client";
import type { Themenfeld, Word } from "../api/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { AddWordsDialog } from "./vocabulary/AddWordsDialog";
import { AnalyticsModal } from "./vocabulary/AnalyticsModal";
import AnalyticsSheet from "./vocabulary/AnalyticsSheet";
import { AzScrubber } from "./vocabulary/AzScrubber";
import { MasteryBar } from "./vocabulary/MasteryBar";
import MasteryStrip from "./vocabulary/MasteryStrip";
import { PracticeOverlay } from "./vocabulary/PracticeOverlay";
import ReviewActions from "./vocabulary/ReviewActions";
import ReviewModal from "./vocabulary/ReviewModal";
import SearchModal from "./vocabulary/SearchModal";
import { Shelf } from "./vocabulary/Shelf";
import { buildShelves, byHeadword, type GroupBy } from "./vocabulary/shelves";
import StateTabs from "./vocabulary/StateTabs";
import VocabularyMobile from "./vocabulary/VocabularyMobile";
import { WordDictionaryList } from "./vocabulary/WordDictionaryList";
import { glidePageTo } from "../lib/useShelfPan";
import { DEFAULT_FILTERS, useVocabFacets, type VocabFilters } from "./vocabulary/useVocabFacets";

type ViewMode = "tile" | "list";

/** Single shared Tile/List toggle, one instance in the header at every
 * breakpoint — replaces the old per-shelf "See all" links entirely: Tile
 * mode's shelves are always a fixed-cap horizontal-scroll row now, and List
 * mode is the "browse everything" affordance instead (a flat, alphabetical,
 * evenly-spaced dictionary view — see WordDictionaryList.tsx). */
function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-hairline bg-card p-0.5">
      <button
        type="button"
        title="Tile view"
        aria-pressed={value === "tile"}
        onClick={() => onChange("tile")}
        className={`grid size-8 place-items-center rounded-full transition-colors ${
          value === "tile" ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-900"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="List view"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={`grid size-8 place-items-center rounded-full transition-colors ${
          value === "list" ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-900"
        }`}
      >
        <List className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
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
  const [showSearch, setShowSearch] = useState(false);
  // null = closed, undefined = general due+fresh queue, Word[] = curated queue
  const [practiceWords, setPracticeWords] = useState<Word[] | undefined | null>(null);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const [ringingId, setRingingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tile");
  // page-wide, not per-shelf — only one tile/card is ever flipped at a time
  const [flippedWordId, setFlippedWordId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const onFilterChange = (patch: Partial<VocabFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const { filtered, stateCounts } = useVocabFacets(allWords, filters);

  const shelves = useMemo(() => buildShelves(filtered, groupBy), [filtered, groupBy]);
  const problemWords = useMemo(() => filtered.filter((w) => w.leech).sort(byHeadword), [filtered]);
  const showProblemShelf = problemWords.length > 0 && filters.state !== "leech";

  // sm/md Netflix shelves share the same grouping + expand state as lg's
  // `Shelf` list (only the presentation differs) — VocabularyMobile prepends
  // its own pinned "Due today" shelf on top of this.
  const dueTodayWords = useMemo(() => filtered.filter((w) => w.state === "due").sort(byHeadword), [filtered]);

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

  function onToggleFlip(id: string) {
    setFlippedWordId((cur) => (cur === id ? null : id));
  }

  const registerCardRef = (id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  function handleJump(word: Word) {
    const el = cardRefs.current.get(word.id);
    if (el) glidePageTo(el.getBoundingClientRect().top + window.scrollY - 140);
    setRingingId(word.id);
    setTimeout(() => setRingingId((id) => (id === word.id ? null : id)), 1600);
  }

  function openPractice(words?: Word[]) {
    setPracticeWords(words ?? undefined);
  }

  // Dashboard's "Start today's revision" CTA links here with ?startReview=1
  // to jump straight into the flashcard queue instead of just landing on the
  // page — strip the param right after so a refresh doesn't re-trigger it.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("startReview") === "1") {
      openPractice();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDrillTheme(themenfeld: string) {
    setShowAnalytics(false);
    setPracticeWords(
      allWords.filter((w) => w.themenfeld.includes(themenfeld as Themenfeld) && (w.state === "due" || w.state === "new")),
    );
  }

  const dueCount = allWords.filter((w) => w.state === "due").length;
  const newCount = allWords.filter((w) => w.state === "new").length;
  const hasActiveCustomization = filters.search !== "" || filters.state !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Vocabulary</h1>
          <p className="text-sm text-ink-600">
            {allWords.length} words · {dueCount} due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <div className="flex items-center gap-2 lg:hidden">
            <button
              className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-card hover:border-brand-400"
              onClick={() => setShowSearch(true)}
              title="Search"
            >
              <Search className="size-4" aria-hidden="true" />
            </button>
            <button
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
              onClick={() => setShowAdd(true)}
              title="Add words"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:block">
            <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setShowAdd(true)}>
              Add words
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex lg:hidden">
        <ReviewActions reviewCount={dueCount + newCount} onOpenReview={() => openPractice()} onOpenAnalytics={() => setShowAnalytics(true)} />
      </div>

      <div className="lg:hidden">
        <MasteryStrip allWords={allWords} />
      </div>

      <input
        className="hidden w-full rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400 md:max-w-sm lg:block lg:max-w-md"
        placeholder="Search words or meanings…"
        aria-label="Search words or meanings"
        value={filters.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
      />

      <StateTabs
        allWords={allWords}
        stateCounts={stateCounts}
        value={filters.state}
        onChange={(state) => onFilterChange({ state })}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        hideGroupBy={viewMode === "list"}
      />

      <VocabularyMobile
        allWords={allWords}
        filtered={filtered}
        dueTodayWords={dueTodayWords}
        shelves={shelves}
        viewMode={viewMode}
        flippedWordId={flippedWordId}
        onToggleFlip={onToggleFlip}
        onPlayAudio={handlePlayAudio}
        audioPlayingId={audioPlayingId}
        reviewCount={dueCount + newCount}
        onOpenReview={() => openPractice()}
        onOpenAnalytics={() => setShowAnalytics(true)}
      />

      {(dueCount > 0 || newCount > 0) && (
        <div className="hidden items-center gap-2 rounded-xl border border-hairline bg-card px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:flex">
          <p className="min-w-0 flex-1 truncate text-xs text-ink-600 sm:text-sm">
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
          <div className="flex shrink-0 gap-1.5 sm:gap-2">
            {dueCount > 0 && (
              <Button size="sm" onClick={() => openPractice(allWords.filter((w) => w.state === "due"))}>
                <span className="md:hidden">Practice</span>
                <span className="hidden md:inline">Practice {dueCount} due</span>
              </Button>
            )}
            {newCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => openPractice(allWords.filter((w) => w.state === "new"))}>
                <span className="md:hidden">Drill</span>
                <span className="hidden md:inline">Drill {newCount} new</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="hidden gap-4 lg:flex lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <MasteryBar
            allWords={allWords}
            reviewsToday={statsData?.reviewsToday ?? 0}
            totalReviews={statsData?.totalReviews ?? 0}
            onOpenAnalytics={() => setShowAnalytics(true)}
          />

          {hasActiveCustomization && (
            <button className="text-xs font-medium text-ink-400 hover:text-ink-900" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear filters
            </button>
          )}

          {!data ? (
            <div className="space-y-3">
              <SkeletonCard className="h-40" />
              <SkeletonCard className="h-40" />
            </div>
          ) : viewMode === "list" ? (
            <WordDictionaryList words={filtered} onPlayAudio={handlePlayAudio} audioPlayingId={audioPlayingId} />
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
                allWords.length > 0 && hasActiveCustomization ? (
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
                  flippedWordId={flippedWordId}
                  onToggleFlip={onToggleFlip}
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
                  flippedWordId={flippedWordId}
                  onToggleFlip={onToggleFlip}
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

        {viewMode === "tile" && <AzScrubber words={filtered} onJump={handleJump} />}
      </div>

      {showAdd && <AddWordsDialog onClose={() => setShowAdd(false)} />}
      {showSearch && <SearchModal words={allWords} onClose={() => setShowSearch(false)} />}
      {showAnalytics && (
        <>
          <AnalyticsModal desktopOnly words={allWords} onClose={() => setShowAnalytics(false)} onDrillTheme={handleDrillTheme} />
          <AnalyticsSheet words={allWords} onClose={() => setShowAnalytics(false)} />
        </>
      )}
      {practiceWords !== null && (
        <>
          <PracticeOverlay words={practiceWords} onClose={() => setPracticeWords(null)} />
          <ReviewModal words={practiceWords ?? undefined} onClose={() => setPracticeWords(null)} />
        </>
      )}
    </div>
  );
}

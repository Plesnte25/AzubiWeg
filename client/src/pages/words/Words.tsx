import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ArrowRight, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Word } from "../../api/types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Chip } from "../../components/ui/Chip";
import { RoundSticker } from "../../components/ui/Sticker";
import { Tile } from "../../components/ui/Tile";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { articleChipStyle, articleLabel, isNewWord, pipStyles, wordColor } from "../../lib/wordBento";
import { stripLeadingPosTag } from "../../lib/wordDisplay";
import { AddWordSheet } from "./AddWordSheet";
import { WordDetailPanel } from "./WordDetailPanel";
import { WordDetailsModal } from "./WordDetailsModal";

/*
 * Words / Wortschatz (Bento README §3, AzubiWords.dc.html). Grid areas per breakpoint from the prototype minus its
 * nav row. The detail is a tile at lg/md and a bottom sheet at sm. `/words/:id` deep-links select a word.
 */

type FilterKey = "all" | "nouns" | "verbs" | "shaky" | "new" | "starred" | "review" | "incomplete";
const FILTERS: [FilterKey, string][] = [
  ["all", "All"],
  ["nouns", "Nouns"],
  ["verbs", "Verbs"],
  ["shaky", "Shaky"],
  ["new", "New"],
  ["starred", "Starred"],
];
// enrichment problem states — only shown when there's something in them
const STATUS_FILTERS: [FilterKey, string][] = [
  ["review", "Needs review"],
  ["incomplete", "Incomplete"],
];

function matches(w: Word, f: FilterKey): boolean {
  switch (f) {
    case "all":
      return true;
    case "nouns":
      return w.genus !== null;
    case "verbs":
      return w.wortart === "Verb";
    case "shaky":
      return w.strength === 1 || w.strength === 2;
    case "new":
      return isNewWord(w);
    case "starred":
      return w.starred;
    case "review":
      return w.enrichmentStatus === "published_review";
    case "incomplete":
      return w.enrichmentStatus === "unresolved" || w.enrichmentStatus === "incomplete";
  }
}

function gridStyle(bp: Breakpoint, fill: boolean): CSSProperties {
  if (bp === "lg")
    return {
      gridTemplateColumns: "repeat(5,minmax(0,1fr))",
      gridTemplateRows: fill ? "176px minmax(0,1fr) 200px" : "176px 560px 200px",
      gridTemplateAreas: '"tools tools tools detail detail" "list list list detail detail" "list list list shaky gender"',
      gap: 22,
      height: fill ? "100%" : undefined,
      "--k": 1,
    } as CSSProperties;
  if (bp === "md")
    return {
      gridTemplateColumns: "repeat(4,minmax(0,1fr))",
      gridTemplateRows: "190px 600px 190px",
      gridTemplateAreas: '"tools tools tools tools" "list list detail detail" "shaky shaky gender gender"',
      gap: 20,
      "--k": 0.86,
    } as CSSProperties;
  return {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gridTemplateRows: "auto 180px auto",
    gridTemplateAreas: '"tools tools" "shaky gender" "list list"',
    gap: 18,
    "--k": 0.72,
  } as CSSProperties;
}

export default function Words() {
  const { id: routeId } = useParams();
  const { bp, fill } = useBreakpoint();
  const { data } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: quiz } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });
  const words = useMemo(() => data?.words ?? [], [data]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addPrefill, setAddPrefill] = useState("");

  // a deep link (/words/:id) selects that word; on sm it opens the sheet
  useEffect(() => {
    if (!routeId) return;
    setSelectedId(routeId);
    if (bp === "sm") setSheetOpen(true);
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const needle = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      words.filter(
        (w) => matches(w, filter) && (!needle || w.headword.toLowerCase().includes(needle) || (w.meaning ?? "").toLowerCase().includes(needle)),
      ),
    [words, filter, needle],
  );
  const selected = words.find((w) => w.id === selectedId) ?? (bp === "sm" ? null : visible[0] ?? words[0] ?? null);
  const shaky = words.filter((w) => matches(w, "shaky")).length;
  const statusChips = STATUS_FILTERS.map(([k, l]) => [k, l, words.filter((w) => matches(w, k)).length] as const).filter(([, , n]) => n > 0);

  // der · die · das distribution of the user's nouns
  const nouns = words.filter((w) => w.genus);
  const share = (g: "der" | "die" | "das") => (nouns.length ? Math.round((nouns.filter((w) => w.genus === g).length / nouns.length) * 100) : 0);
  const dist = [
    ["der", share("der"), "var(--sky)"],
    ["die", share("die"), "var(--pink)"],
    ["das", share("das"), "var(--mint)"],
  ] as const;
  const articles = quiz?.articles;

  const select = (w: Word) => {
    setSelectedId(w.id);
    if (bp === "sm") setSheetOpen(true);
  };
  const openAdd = (prefill = "") => {
    setAddPrefill(prefill);
    setAdding(true);
  };

  return (
    <div className="grid min-h-0 flex-1" style={{ ...gridStyle(bp, fill), "--cf": bp === "sm" ? "13px" : "15px" } as CSSProperties}>
      {/* tools */}
      <Tile
        bg="var(--lemon)"
        tilt={-0.4}
        radius={24}
        shadow={6}
        tape={{ left: "14%", width: 90, tilt: -4 }}
        className="flex flex-col justify-between gap-3.5"
        style={{ gridArea: "tools", padding: "calc(var(--k) * 22px)" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 style={{ margin: 0, fontSize: "calc(var(--k) * 52px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.9 }} lang="de">
              Wortschatz
            </h1>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {words.length.toLocaleString("en")} words · {shaky} shaky
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAdd()}
            className="press flex cursor-pointer items-center gap-2"
            style={{ height: 44, padding: "0 18px", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 15, boxShadow: "3px 3px 0 var(--shadow)" }}
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            Word
          </button>
        </div>
        <div className={bp === "lg" ? "flex items-center gap-3" : "flex flex-col gap-3"}>
          <label
            className="flex min-w-0 flex-1 items-center gap-2"
            style={{ height: 44, padding: "0 14px", background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 999, boxSizing: "border-box" }}
          >
            <MagnifyingGlass size={17} weight="bold" aria-hidden="true" className="shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search German or English…"
              aria-label="Search words"
              className="min-w-0 flex-1 border-0 bg-transparent outline-none"
              style={{ color: "inherit", fontSize: 15, fontWeight: 500 }}
            />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="flex cursor-pointer border-0 bg-transparent p-0" style={{ color: "inherit" }}>
                <X size={15} weight="bold" aria-hidden="true" />
              </button>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[...FILTERS, ...statusChips.map(([k, l, n]) => [k, `${l} ${n}`] as const)].map(([k, l]) => (
              <Chip key={k} selected={filter === k} onClick={() => setFilter(k as FilterKey)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
      </Tile>

      {/* list */}
      {/* no tilt on sm: the list grows to the full word count there, and rotating a page-tall tile shoves its bottom
          sideways off-screen */}
      <Tile tilt={bp === "sm" ? 0 : 0.3} radius={24} className="flex flex-col gap-1.5" style={{ gridArea: "list", padding: "calc(var(--k) * 14px)" }}>
        <div className="flex items-center justify-between uppercase" style={{ padding: "4px 8px 6px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "var(--plainMuted)" }}>
          <span>{visible.length} shown</span>
          <span>Strength</span>
        </div>
        <div className={bp === "sm" ? "flex flex-col gap-0.5" : "no-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden"} role="listbox" aria-label="Words">
          {visible.map((w) => {
            const on = bp !== "sm" && w.id === selected?.id;
            return (
              <div
                key={w.id}
                role="option"
                aria-selected={on}
                tabIndex={0}
                onClick={() => select(w)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(w);
                  }
                }}
                className="flex shrink-0 cursor-pointer items-center gap-3"
                style={{
                  padding: "9px 10px",
                  borderRadius: 14,
                  border: `2px solid ${on ? "var(--line)" : "transparent"}`,
                  background: on ? "var(--plain2)" : "transparent",
                  boxShadow: on ? "3px 3px 0 var(--shadow)" : "none",
                }}
              >
                <span style={articleChipStyle(w)}>{articleLabel(w)}</span>
                <div className="min-w-0 flex-1">
                  <div lang="de" className="truncate" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                    {w.headword}
                  </div>
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--plainMuted)" }}>
                    {stripLeadingPosTag(w.meaning ?? "") || "—"}
                  </div>
                </div>
                {isNewWord(w) && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: "var(--lemon)", color: "var(--onTile)", border: "2px solid var(--line)", borderRadius: 999, padding: "1px 7px", transform: "rotate(-5deg)" }}>neu</span>
                )}
                <div className="flex shrink-0 gap-[3px]" role="img" aria-label={`Strength ${w.strength ?? 0} of 5`}>
                  {pipStyles(w.strength ?? 0).map((s, i) => (
                    <span key={i} style={s} />
                  ))}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 text-center" style={{ padding: "40px 12px" }}>
              <div
                className="flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 16, background: "var(--lilac)", color: "var(--onTile)", border: "2.5px solid var(--line)", transform: "rotate(-8deg)" }}
              >
                <MagnifyingGlass size={24} weight="bold" aria-hidden="true" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {q ? `Nothing matches “${q}”.` : words.length === 0 ? "No words yet." : "No words in this filter yet."}
              </span>
              {!q && words.length === 0 && (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)", maxWidth: 260 }}>
                    Type a German word and its meaning, gender and plural are looked up for you.
                  </span>
                  <button
                    type="button"
                    onClick={() => openAdd("")}
                    className="cursor-pointer"
                    style={{ height: 40, padding: "0 16px", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 14 }}
                  >
                    Add your first word
                  </button>
                </>
              )}
              {q && (
                <button
                  type="button"
                  onClick={() => openAdd(q.trim())}
                  className="cursor-pointer"
                  style={{ height: 40, padding: "0 16px", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 14 }}
                >
                  Add it as a new word
                </button>
              )}
            </div>
          )}
        </div>
      </Tile>

      {/* detail (lg/md) */}
      {bp !== "sm" && (
        <Tile
          bg={selected ? wordColor(selected) : "var(--plain)"}
          tilt={-0.8}
          radius={24}
          shadow={6}
          tape={{ left: "auto", width: 84, tilt: 5, style: { right: "22%", top: -10 } }}
          className="flex flex-col overflow-hidden"
          style={{ gridArea: "detail", padding: "calc(var(--k) * 26px)" }}
        >
          {selected ? (
            <WordDetailPanel key={selected.id} word={selected} onDetails={() => setDetailsOpen(true)} onDeleted={() => setSelectedId(null)} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 700 }}>Add your first word with “+ Word”.</span>
          )}
        </Tile>
      )}

      {/* shaky */}
      <Tile bg="var(--tomato)" tilt={1.4} radius={22} className="flex flex-col justify-between gap-2" style={{ gridArea: "shaky", padding: "calc(var(--k) * 18px)" }}>
        <RoundSticker size={56} tilt={14} bg="var(--lemon)" style={{ position: "absolute", top: -16, right: -10, fontSize: 12 }}>
          wackel!
        </RoundSticker>
        <span className="uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
          Shaky words
        </span>
        <div className="flex items-baseline gap-2">
          <span style={{ fontSize: "calc(var(--k) * 60px)", fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.85 }}>{shaky}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>strength ≤ 2</span>
        </div>
        <button
          type="button"
          onClick={() => setFilter("shaky")}
          className="press flex cursor-pointer items-center justify-between"
          style={{ height: 40, padding: "0 14px", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 14, boxShadow: "3px 3px 0 var(--shadow)" }}
        >
          Show them
          <ArrowRight size={15} weight="bold" aria-hidden="true" />
        </button>
      </Tile>

      {/* der · die · das */}
      <Tile tilt={-1.2} radius={22} className="flex flex-col justify-between gap-2.5" style={{ gridArea: "gender", padding: "calc(var(--k) * 18px)" }}>
        <span className="uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }} lang="de">
          der · die · das
        </span>
        <div className="flex overflow-hidden" style={{ height: 30, border: "2.5px solid var(--line)", borderRadius: 10, color: "var(--onTile)", fontSize: 13, fontWeight: 700 }}>
          {nouns.length === 0 ? (
            <span className="flex flex-1 items-center justify-center" style={{ background: "var(--plain2)", color: "var(--plainText)" }}>
              no nouns yet
            </span>
          ) : (
            dist
              .filter(([, pct]) => pct > 0)
              .map(([g, pct], i, arr) => (
                <span
                  key={g}
                  className="flex items-center justify-center overflow-hidden"
                  title={`${g}: ${pct}%`}
                  style={{ width: `${pct}%`, background: dist.find((d) => d[0] === g)![2], borderRight: i < arr.length - 1 ? "2.5px solid var(--line)" : "none" }}
                >
                  {pct >= 12 ? `${pct}%` : ""}
                </span>
              ))
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)", lineHeight: 1.35 }}>
          {articles?.mostMissed && articles.recentWrong ? (
            <>
              You miss <b style={{ color: "var(--plainText)" }}>{articles.mostMissed}</b> most often. {articles.recentWrong.wrong} of the last {articles.recentWrong.of} were wrong.
            </>
          ) : (
            "A gender drill shows which article trips you up."
          )}
        </span>
      </Tile>

      {/* sm: detail as a bottom sheet */}
      {bp === "sm" && (
        <BottomSheet open={sheetOpen && !!selected} onClose={() => setSheetOpen(false)} bg={selected ? wordColor(selected) : "var(--plain)"}>
          {selected && (
            <WordDetailPanel
              key={selected.id}
              word={selected}
              compact
              onClose={() => setSheetOpen(false)}
              onDetails={() => setDetailsOpen(true)}
              onDeleted={() => {
                setSheetOpen(false);
                setSelectedId(null);
              }}
            />
          )}
        </BottomSheet>
      )}

      {detailsOpen && selected && <WordDetailsModal word={selected} onClose={() => setDetailsOpen(false)} />}
      <AddWordSheet
        open={adding}
        initialWord={addPrefill}
        onClose={() => setAdding(false)}
        onAdded={(saved) => {
          setQ("");
          setFilter("all");
          setSelectedId(saved[0]!.id);
        }}
      />
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, HandTap, Sparkle, SpeakerHigh, Timer, Trophy, X } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { api, playWordAudio } from "../../api/client";
import type { Grade, Word } from "../../api/types";
import { ThemeToggle } from "../../components/chrome/ThemeToggle";
import { toast } from "../../components/ui/Toast";
import { generateGrammarTip } from "../../lib/grammarTips";
import { useNavStack } from "../../lib/navStack";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { wordColor } from "../../lib/wordBento";
import { stripLeadingPosTag } from "../../lib/wordDisplay";
import { NothingDue } from "./NothingDue";
import { useReviewSession, type CardTag, type GradedEntry, type QueueItem } from "./useReviewSession";

/*
 * Review — flashcards (AzubiReview.dc.html, handoff addendum §2). A transient, focused screen: no main nav, no page
 * scroll at any size. Session bar · (lg) Stack tile | card + grade row | Session + Keys tiles · (md) card, then Stack +
 * Session · (sm) mode row, card, grades.
 *
 * Real-data notes: grades are this app's scheduler (again is a lapse: 1 day, and the card comes back 4 places later
 * this session); the interval under each button is the real preview (GET /reviews/:id/preview), with Again reading
 * "again today" since the scheduler works in days. Undo reverts the grade on the server. The rule sticker is the
 * deterministic noun-ending rule (lib/grammarTips.ts), shown only when it agrees with the word's gender.
 */

type Mode = "word" | "meaning" | "article";
type Article = "der" | "die" | "das";

const TAG_COLOR: Record<CardTag, string> = { New: "var(--lilac)", Due: "var(--sky)", Shaky: "var(--tomato)" };
const GRADES: [Grade, string, string][] = [
  ["again", "Again", "var(--tomato)"],
  ["hard", "Hard", "var(--orange)"],
  ["good", "Good", "var(--mint)"],
  ["easy", "Easy", "var(--sky)"],
];
const GENDER_COLOR: Record<Article, string> = { der: "var(--sky)", die: "var(--pink)", das: "var(--mint)" };
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const kicker: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };
const intervalLabel = (days: number) => (days <= 1 ? "1 day" : days < 31 ? `${days} days` : days < 365 ? `${Math.round(days / 30)} mo` : `${Math.round(days / 365)} yr`);

function kindLabel(w: Word): string {
  if (w.genus) return "noun";
  if (w.wortart === "Verb") return "verb";
  return (w.wortart ?? "word").toLowerCase();
}

/** Plural for nouns, principal parts for verbs. */
function formsLine(w: Word): string | null {
  if (w.wortart === "Verb") {
    const parts = [w.conjugation?.past, w.conjugation?.perfect].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  const pl = w.declension?.nom?.pl;
  return pl ? `pl. die ${pl}` : null;
}

/**
 * Route component — forces a full remount (key={location.key}) on every navigation to /review, even to the same
 * pathname (a drill pushes /review again with new words); React Router doesn't remount on a state change alone.
 */
export default function ReviewSession() {
  const location = useLocation();
  const state = location.state as { words?: Word[]; deckLabel?: string } | null;
  return <ReviewSessionInner key={location.key} words={state?.words} deckLabel={state?.deckLabel} />;
}

function roundBtn(size: number, enabled = true): CSSProperties {
  return {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: "50%",
    border: "2.5px solid var(--line)",
    background: "var(--plain2)",
    color: "var(--plainText)",
    cursor: enabled ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    opacity: enabled ? 1 : 0.4,
  };
}

function ModeChips({ mode, setMode, bp }: { mode: Mode; setMode: (m: Mode) => void; bp: Breakpoint }) {
  const sm = bp === "sm";
  const MODES: [Mode, string, string][] = [
    ["word", "Word → meaning", "Word"],
    ["meaning", "Meaning → word", "Meaning"],
    ["article", "der · die · das", "Article"],
  ];
  return (
    <div className="flex shrink-0" style={{ gap: sm ? 6 : 4, marginLeft: sm ? 0 : 6 }} role="radiogroup" aria-label="Review mode">
      {MODES.map(([k, l, short]) => {
        const on = mode === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setMode(k)}
            className="cursor-pointer whitespace-nowrap"
            style={{
              height: sm ? 32 : 36,
              padding: sm ? "0 10px" : "0 12px",
              border: "2.5px solid",
              borderColor: on || sm ? "var(--line)" : "transparent",
              borderRadius: 999,
              background: on ? "var(--sel)" : sm ? "var(--plain)" : "transparent",
              color: on ? "var(--selText)" : "var(--plainText)",
              fontWeight: 700,
              fontSize: sm ? 12 : 13,
              boxShadow: on ? "2px 2px 0 var(--shadow)" : "none",
              transform: on ? "rotate(-1.5deg)" : "none",
            }}
          >
            {bp === "lg" ? l : short}
          </button>
        );
      })}
    </div>
  );
}

function StackTile({ rest, bp }: { rest: QueueItem[]; bp: Breakpoint }) {
  const mix = (["Due", "New", "Shaky"] as CardTag[]).map((t) => ({ t, n: rest.filter((r) => r.tag === t).length }));
  const rows = mix.map((m) => (
    <div key={m.t} className="flex items-center" style={{ gap: 8, fontSize: 14, fontWeight: 700 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, border: "2.5px solid var(--line)", background: TAG_COLOR[m.t], boxSizing: "border-box" }} />
      <span className="flex-1">{m.t}</span>
      <span>{m.n}</span>
    </div>
  ));
  const tile: CSSProperties = {
    background: "var(--lemon)",
    color: "var(--onTile)",
    border: "2.5px solid var(--line)",
    borderRadius: 24,
    boxShadow: "5px 5px 0 var(--shadow)",
    transform: "rotate(-0.6deg)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };
  if (bp === "md") {
    return (
      <section style={{ ...tile, gap: 8, flex: 1, minWidth: 0 }}>
        <span style={kicker}>Stack</span>
        <div className="flex items-baseline" style={{ gap: 6 }}>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-.05em", lineHeight: 1 }}>{rest.length}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>cards left</span>
        </div>
        {rows}
      </section>
    );
  }
  const n = Math.min(5, rest.length);
  return (
    <section style={{ ...tile, gap: 12, flexShrink: 0 }}>
      <span style={kicker}>Stack</span>
      <div className="relative" style={{ height: 150, margin: "6px 10px 0 4px" }}>
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: (n - 1 - i) * 7,
              top: (n - 1 - i) * 7,
              width: 150,
              height: 110,
              borderRadius: "6px 6px 20px 6px",
              border: "2.5px solid var(--line)",
              background: i === n - 1 ? "var(--plain)" : ["var(--sky)", "var(--pink)", "var(--mint)", "var(--lilac)"][i % 4],
              boxShadow: "3px 3px 0 var(--shadow)",
              transform: `rotate(${[-4, 3, -2, 2, 0][i]}deg)`,
              boxSizing: "border-box",
            }}
          />
        ))}
        <div className="absolute flex flex-col items-center justify-center" style={{ left: 0, top: 0, width: 150, height: 110, lineHeight: 1, color: "var(--plainText)" }}>
          <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-.05em" }}>{rest.length}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>cards left</span>
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {rows}
      </div>
    </section>
  );
}

function sessionNumbers(graded: GradedEntry[]) {
  const firsts = new Map<string, Grade>();
  for (const g of graded) if (!firsts.has(g.wordId)) firsts.set(g.wordId, g.grade);
  const ok = [...firsts.values()].filter((g) => g !== "again").length;
  const acc = firsts.size ? `${Math.round((ok / firsts.size) * 100)}%` : "—";
  const missed = [...new Set(graded.filter((g) => g.grade === "again").map((g) => g.wordId))];
  return { words: firsts.size, acc, missed };
}

function SessionTile({ graded, bp }: { graded: GradedEntry[]; bp: Breakpoint }) {
  const { acc, missed } = sessionNumbers(graded);
  return (
    <section
      style={{
        background: "var(--plain)",
        color: "var(--plainText)",
        border: "2.5px solid var(--line)",
        borderRadius: 24,
        boxShadow: "5px 5px 0 var(--shadow)",
        transform: "rotate(0.6deg)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxSizing: "border-box",
        flex: bp === "md" ? 1.3 : "none",
        minWidth: 0,
      }}
    >
      <span style={kicker}>This session</span>
      <div className="grid grid-cols-2" style={{ gap: 10 }}>
        {GRADES.map(([k, l, bg], i) => (
          <div
            key={k}
            className="flex flex-col"
            style={{ gap: 4, padding: "10px 12px", border: "2.5px solid var(--line)", borderRadius: 14, background: bg, color: "var(--onTile)", transform: `rotate(${[-1.5, 1, 1.2, -1][i]}deg)` }}
          >
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{graded.filter((g) => g.grade === k).length}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{l}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between" style={{ fontSize: 14, fontWeight: 700, paddingTop: 4 }}>
        <span>Right first time</span>
        <span>{acc}</span>
      </div>
      <div className="flex justify-between" style={{ fontSize: 14, fontWeight: 700 }}>
        <span>Back tomorrow</span>
        <span>
          {missed.length} card{missed.length === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}

function KeysTile() {
  const keys: [string, string][] = [
    ["Space", "Flip the card"],
    ["1–4", "Again · Hard · Good · Easy"],
    ["Z", "Undo last grade"],
  ];
  return (
    <section
      style={{
        background: "var(--lilac)",
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: 24,
        boxShadow: "5px 5px 0 var(--shadow)",
        transform: "rotate(-0.8deg)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxSizing: "border-box",
      }}
    >
      <span style={kicker}>Keys</span>
      {keys.map(([k, l]) => (
        <div key={k} className="flex items-center" style={{ gap: 10, fontSize: 14, fontWeight: 700 }}>
          <kbd
            className="flex items-center justify-center"
            style={{
              minWidth: 30,
              height: 28,
              padding: "0 7px",
              border: "2.5px solid var(--line)",
              borderRadius: 8,
              background: "var(--plain)",
              color: "var(--plainText)",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 700,
              boxShadow: "2px 2px 0 var(--shadow)",
              boxSizing: "border-box",
            }}
          >
            {k}
          </kbd>
          {l}
        </div>
      ))}
    </section>
  );
}

function FlashCard({
  item,
  mode,
  flipped,
  pick,
  onPick,
  onFlip,
  bp,
}: {
  item: QueueItem;
  mode: Mode;
  flipped: boolean;
  pick: Article | null;
  onPick: (a: Article) => void;
  onFlip: () => void;
  bp: Breakpoint;
}) {
  const w = item.word;
  const sm = bp === "sm";
  const meaning = stripLeadingPosTag(w.meaning ?? "", w.wortart);
  const tint = wordColor(w);
  const fullWord = `${w.genus ? `${w.genus} ` : ""}${w.headword}`;
  const forms = formsLine(w);
  const rule = w.genus ? generateGrammarTip(w) : null;
  const shown = mode === "meaning" ? meaning : w.headword;
  const bigWord: CSSProperties = { fontSize: `calc(var(--k) * ${shown.length > 12 ? 50 : 66}px)`, fontWeight: 700, letterSpacing: "-.05em", lineHeight: 1, overflowWrap: "anywhere" };
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    border: "2.5px solid var(--line)",
    borderRadius: "8px 8px 34px 8px",
    boxShadow: "8px 8px 0 var(--shadow)",
    padding: sm ? 18 : 26,
    display: "flex",
    flexDirection: "column",
    gap: sm ? 12 : 16,
    boxSizing: "border-box",
  };
  const right = pick !== null && pick === w.genus;
  const prompt = mode === "word" ? "What does it mean?" : mode === "meaning" ? "Say it in German" : "Which article?";
  const hint = mode === "article" ? "Pick one, or tap to give up" : bp === "lg" ? "Tap the card or press Space" : "Tap to flip";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={flipped ? `Answer: ${fullWord}, ${meaning}. Tap to turn back` : "Flashcard. Tap to show the answer"}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFlip();
      }}
      className="relative min-h-0 w-full flex-1 cursor-pointer"
      style={{ maxWidth: bp === "lg" ? 660 : "none", maxHeight: bp === "lg" ? 520 : bp === "md" ? 600 : "none", perspective: 1800, transform: "rotate(-0.8deg)" }}
    >
      <div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d", transition: "transform .6s cubic-bezier(.3,1.3,.5,1)", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* front */}
        <div
          aria-hidden={flipped}
          style={{ ...face, background: "var(--plain)", color: "var(--plainText)", backgroundImage: "repeating-linear-gradient(transparent 0 35px, var(--rule) 35px 36px)" }}
        >
          <span aria-hidden="true" style={{ position: "absolute", top: -12, left: "50%", marginLeft: -44, width: 88, height: 24, background: "var(--tape)", transform: "rotate(-3deg)", borderRadius: 3 }} />
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <span style={{ padding: "4px 11px", border: "2.5px solid var(--line)", borderRadius: 999, background: TAG_COLOR[item.tag], color: "var(--onTile)", fontSize: 12, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(-3deg)" }}>
              {item.tag}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--plainMuted)" }}>{prompt}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center" style={{ gap: 14 }}>
            {mode === "word" && (
              <>
                {w.genus && (
                  <span lang="de" style={{ padding: "4px 14px", border: "2.5px solid var(--line)", borderRadius: 999, background: tint, color: "var(--onTile)", fontSize: 18, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(-3deg)" }}>
                    {w.genus}
                  </span>
                )}
                <span lang="de" style={bigWord}>
                  {w.headword}
                </span>
              </>
            )}
            {mode === "meaning" && (
              <>
                <span style={bigWord}>{meaning || "—"}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--plainMuted)" }}>{w.genus ? "noun · with article" : kindLabel(w)}</span>
              </>
            )}
            {mode === "article" && (
              <>
                <span lang="de" style={bigWord}>
                  <span style={{ display: "inline-block", minWidth: "1.6em", borderBottom: "4px solid var(--line)", marginRight: ".2em" }}> </span>
                  {w.headword}
                </span>
                <div className="flex" style={{ gap: 10 }}>
                  {(["der", "die", "das"] as Article[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      lang="de"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!flipped) onPick(a);
                      }}
                      className="cursor-pointer"
                      style={{
                        width: sm ? 76 : 96,
                        height: sm ? 52 : 60,
                        border: "2.5px solid var(--line)",
                        borderRadius: 16,
                        background: GENDER_COLOR[a],
                        color: "var(--onTile)",
                        fontSize: sm ? 20 : 24,
                        fontWeight: 700,
                        boxShadow: "3px 3px 0 var(--shadow)",
                        transform: `rotate(${a === "die" ? 2 : -2}deg)`,
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="flex items-center justify-center" style={{ gap: 6, fontSize: 13, fontWeight: 700, color: "var(--plainMuted)" }}>
            <HandTap size={15} weight="fill" aria-hidden="true" />
            {hint}
          </span>
        </div>

        {/* back */}
        <div aria-hidden={!flipped} style={{ ...face, background: tint, color: "var(--onTile)", transform: "rotateY(180deg)", overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <span style={{ padding: "4px 11px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontSize: 12, fontWeight: 700 }}>
              {item.tag} · {kindLabel(w)}
            </span>
            <div className="flex items-center" style={{ gap: 6 }}>
              {mode === "article" && flipped && (
                <span style={{ padding: "4px 11px", border: "2.5px solid var(--line)", borderRadius: 999, background: right ? "var(--mint)" : "var(--tomato)", color: "var(--onTile)", fontSize: 12, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(2deg)" }}>
                  {!pick ? "Skipped" : right ? `${pick} ✓` : `You said ${pick}`}
                </span>
              )}
              <button
                type="button"
                aria-label="Listen"
                tabIndex={flipped ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  playWordAudio(w.id).catch(() => toast.error("Couldn't play it"));
                }}
                className="flex cursor-pointer items-center justify-center p-0"
                style={{ width: 40, height: 40, borderRadius: "50%", border: "2.5px solid var(--line)", background: "var(--plain)", color: "var(--plainText)", boxShadow: "2px 2px 0 var(--shadow)" }}
              >
                <SpeakerHigh size={17} weight="fill" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col" style={{ gap: 4 }}>
            <span lang="de" style={{ fontSize: `calc(var(--k) * ${fullWord.length > 16 ? 40 : 52}px)`, fontWeight: 700, letterSpacing: "-.05em", lineHeight: 1, overflowWrap: "anywhere" }}>
              {fullWord}
            </span>
            {forms && (
              <span lang="de" style={{ fontSize: 15, fontWeight: 700 }}>
                {forms}
              </span>
            )}
          </div>
          <span style={{ fontSize: "calc(var(--k) * 24px)", fontWeight: 700, letterSpacing: "-.02em" }}>{meaning || "no meaning yet"}</span>
          {w.example && (
            <div className="flex flex-col" style={{ gap: 3, padding: "12px 14px", border: "2.5px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)" }}>
              <span lang="de" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
                „{w.example}“
              </span>
              {w.exampleTranslation && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)" }}>{w.exampleTranslation}</span>}
            </div>
          )}
          {rule && (
            <span className="flex items-center self-start" style={{ gap: 6, padding: "5px 11px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--lemon)", color: "var(--onTile)", fontSize: 12, fontWeight: 700, transform: "rotate(-1deg)" }}>
              <Sparkle size={12} weight="fill" aria-hidden="true" />
              {rule}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GradeRow({ wordId, suggested, onGrade, busy, bp }: { wordId: string; suggested: Grade | null; onGrade: (g: Grade) => void; busy: boolean; bp: Breakpoint }) {
  const { data: preview } = useQuery({ queryKey: ["review-preview", wordId], queryFn: () => api.reviewPreview(wordId), staleTime: 60_000 });
  const sm = bp === "sm";
  return (
    <div className="grid w-full shrink-0" style={{ maxWidth: bp === "lg" ? 660 : "none", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: sm ? 8 : 12 }}>
      {GRADES.map(([k, l, bg], i) => {
        const sug = suggested === k;
        const iv = k === "again" ? "again today" : preview ? intervalLabel(preview[k].interval) : "…";
        return (
          <button
            key={k}
            type="button"
            disabled={busy}
            onClick={() => onGrade(k)}
            aria-label={`${l}, next in ${iv}`}
            className="relative flex cursor-pointer flex-col items-center justify-center p-0"
            style={{
              height: sm ? 64 : 72,
              gap: 2,
              border: "2.5px solid var(--line)",
              borderRadius: 18,
              background: bg,
              color: "var(--onTile)",
              boxShadow: sug ? "5px 5px 0 var(--shadow)" : "3px 3px 0 var(--shadow)",
              transform: sug ? "translateY(-4px) rotate(-2deg)" : `rotate(${i % 2 ? 1 : -1}deg)`,
              transition: "transform .15s",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>{iv}</span>
            {bp === "lg" && <span style={{ position: "absolute", top: 6, right: 8, fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{i + 1}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DoneCard({
  graded,
  queue,
  elapsed,
  bp,
  backLabel,
  onAgainPile,
  onRestart,
  onBack,
}: {
  graded: GradedEntry[];
  queue: QueueItem[];
  elapsed: number;
  bp: Breakpoint;
  backLabel: string;
  onAgainPile: () => void;
  onRestart: () => void;
  onBack: () => void;
}) {
  const sm = bp === "sm";
  const { words, acc, missed } = sessionNumbers(graded);
  const missedWords = missed.map((id) => queue.find((q) => q.word.id === id)?.word).filter((w): w is Word => !!w);
  const pill = (bg: string): CSSProperties => ({ height: 48, padding: "0 18px", border: "2.5px solid var(--line)", borderRadius: 999, background: bg, fontWeight: 700, fontSize: 15, cursor: "pointer" });
  return (
    <div
      className="relative flex w-full flex-col"
      style={{
        maxWidth: bp === "lg" ? 640 : "none",
        background: "var(--mint)",
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: "8px 8px 34px 8px",
        boxShadow: "8px 8px 0 var(--shadow)",
        transform: "rotate(-1deg)",
        padding: sm ? 20 : 30,
        gap: 18,
        boxSizing: "border-box",
        minHeight: sm ? 0 : 440,
        flex: sm ? 1 : "none",
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", top: -13, left: 40, width: 90, height: 24, background: "var(--tape)", transform: "rotate(-4deg)", borderRadius: 3 }} />
      <span
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{ position: "absolute", top: -22, right: 26, width: 78, height: 78, borderRadius: "50%", border: "2.5px solid var(--line)", background: "var(--lemon)", color: "var(--onTile)", boxShadow: "3px 3px 0 var(--shadow)", transform: "rotate(12deg)" }}
      >
        <Trophy size={36} weight="fill" />
      </span>
      <span style={kicker}>Session done</span>
      <h1 style={{ margin: 0, fontSize: "calc(var(--k) * 48px)", fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.95 }}>Stack cleared.</h1>
      <div className="grid grid-cols-3" style={{ gap: sm ? 8 : 12 }}>
        {(
          [
            [String(words), words === 1 ? "word" : "words"],
            [acc, "right first time"],
            [clock(elapsed), "minutes"],
          ] as const
        ).map(([v, l], i) => (
          <div
            key={l}
            className="flex flex-col"
            style={{ gap: 4, padding: sm ? 10 : 14, border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)", transform: `rotate(${[-1.5, 1, -0.5][i]}deg)`, boxShadow: "3px 3px 0 var(--shadow)" }}
          >
            <span style={{ fontSize: "calc(var(--k) * 34px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{l}</span>
          </div>
        ))}
      </div>
      {missedWords.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{missedWords.length} go back in tomorrow</span>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {missedWords.map((w) => (
              <span key={w.id} lang="de" style={{ padding: "5px 12px", border: "2px solid var(--line)", borderRadius: 999, background: wordColor(w), color: "var(--onTile)", fontSize: 13, fontWeight: 700 }}>
                {w.genus ? `${w.genus} ` : ""}
                {w.headword}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap" style={{ gap: 8 }}>
        {missedWords.length > 0 && (
          <button type="button" onClick={onAgainPile} style={{ ...pill("var(--plain)"), color: "var(--plainText)" }}>
            Drill the Again pile
          </button>
        )}
        <button type="button" onClick={onRestart} style={{ ...pill("var(--plain)"), color: "var(--plainText)" }}>
          Restart
        </button>
        <button type="button" onClick={onBack} className="press" style={{ ...pill("var(--btn)"), flex: 1, minWidth: 140, color: "var(--btnText)", boxShadow: "3px 3px 0 var(--shadow)" }}>
          Back to {backLabel}
        </button>
      </div>
    </div>
  );
}

function ReviewSessionInner({ words, deckLabel }: { words?: Word[]; deckLabel?: string }) {
  const { goBack, backLabel } = useNavStack();
  const { bp } = useBreakpoint();
  const s = useReviewSession({ words });
  const [mode, setMode] = useState<Mode>("word");
  const [pick, setPick] = useState<Article | null>(null);
  const sm = bp === "sm";
  const lg = bp === "lg";
  const current = s.current;
  // article mode needs a noun; anything else falls back to word mode for that card
  const cardMode: Mode = mode === "article" && !current?.word.genus ? "word" : mode;

  useEffect(() => setPick(null), [current?.word.id, s.idx]);

  const flip = () => {
    if (!current) return;
    s.setFlipped(!s.flipped);
  };
  const close = () => {
    if (s.graded.length) toast.success(`Saved · ${s.graded.length} graded`);
    goBack();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        flip();
      } else if (/^[1-4]$/.test(e.key) && s.flipped) {
        s.grade(GRADES[Number(e.key) - 1]![0]);
      } else if (e.key === "z" || e.key === "Z") {
        s.undo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // nothing to review at all: say when the next card is due (not an empty "Stack cleared")
  if (s.done && s.graded.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden" style={{ padding: sm ? 14 : 24 }}>
        <NothingDue onBack={goBack} />
      </div>
    );
  }

  const graded = s.idx;
  const rest = s.queue.slice(s.idx);
  const suggested: Grade | null = cardMode === "article" && s.flipped ? (pick && pick === current?.word.genus ? "good" : "again") : null;
  const deck = deckLabel ?? (words ? "Words · drill" : "Words · today's stack");

  const center = (
    <div className="flex min-h-0 min-w-0 flex-col items-center justify-center" style={{ gap: sm ? 14 : 20, flex: lg ? "none" : 1, height: lg ? "100%" : undefined }}>
      {s.loading ? (
        <div aria-busy="true" className="w-full flex-1" style={{ maxWidth: 660, maxHeight: 520, border: "2.5px dashed var(--line)", borderRadius: "8px 8px 34px 8px", opacity: 0.4 }} />
      ) : s.done || !current ? (
        <DoneCard
          graded={s.graded}
          queue={s.queue}
          elapsed={s.elapsedSeconds}
          bp={bp}
          backLabel={backLabel}
          onAgainPile={s.drillAgain}
          onRestart={s.restart}
          onBack={goBack}
        />
      ) : (
        <>
          <FlashCard
            item={current}
            mode={cardMode}
            flipped={s.flipped}
            pick={pick}
            onPick={(a) => {
              setPick(a);
              s.setFlipped(true);
            }}
            onFlip={flip}
            bp={bp}
          />
          {s.flipped ? (
            <GradeRow wordId={current.word.id} suggested={suggested} onGrade={s.grade} busy={s.busy} bp={bp} />
          ) : (
            <button
              type="button"
              onClick={flip}
              className="press flex w-full shrink-0 cursor-pointer items-center justify-center"
              style={{ maxWidth: lg ? 660 : "none", height: sm ? 60 : 68, gap: 10, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 18, boxShadow: "4px 4px 0 var(--shadow)" }}
            >
              Show answer
              {lg && <span style={{ padding: "2px 8px", border: "2px solid var(--btnText)", borderRadius: 6, fontSize: 12, opacity: 0.8 }}>Space</span>}
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ gap: sm ? 14 : 22, padding: sm ? 14 : bp === "md" ? 22 : 24, "--k": lg ? 1 : bp === "md" ? 0.95 : 0.78 } as CSSProperties}>
      <header
        className="flex shrink-0 items-center"
        style={{ height: sm ? 58 : 72, gap: sm ? 8 : 12, padding: sm ? "0 8px" : "0 12px", background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 999, boxShadow: "5px 5px 0 var(--shadow)", boxSizing: "border-box" }}
      >
        <button type="button" onClick={close} aria-label="Close review" style={roundBtn(sm ? 38 : 44)}>
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
        {!sm && (
          <>
            <div className="flex shrink-0 flex-col" style={{ lineHeight: 1.05 }}>
              <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.03em" }}>Review</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--plainMuted)" }}>{deck}</span>
            </div>
            <ModeChips mode={mode} setMode={(m) => (setMode(m), s.setFlipped(false), setPick(null))} bp={bp} />
          </>
        )}
        <div
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={s.total}
          aria-valuenow={graded}
          className="relative flex-1 overflow-hidden"
          style={{ minWidth: 40, height: 18, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain2)", boxSizing: "border-box" }}
        >
          <span
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${s.total ? (graded / s.total) * 100 : 0}%`, background: "var(--mint)", borderRight: graded ? "2.5px solid var(--line)" : "none", transition: "width .3s" }}
          />
        </div>
        <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 15, fontWeight: 700 }}>
          {Math.min(s.idx + (s.done ? 0 : 1), s.total)} / {s.total}
        </span>
        {!sm && (
          <span
            className="flex shrink-0 items-center"
            style={{ gap: 6, height: 36, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--lemon)", color: "var(--onTile)", fontSize: 14, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(2deg)", fontVariantNumeric: "tabular-nums" }}
          >
            <Timer size={14} weight="fill" aria-hidden="true" />
            {clock(s.elapsedSeconds)}
          </span>
        )}
        <button type="button" onClick={s.undo} disabled={!s.canUndo} aria-label="Undo last grade" style={roundBtn(sm ? 38 : 44, s.canUndo)}>
          <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
        </button>
        <ThemeToggle small={sm} />
      </header>

      {sm && (
        <div className="flex shrink-0 items-center" style={{ gap: 6 }}>
          <ModeChips mode={mode} setMode={(m) => (setMode(m), s.setFlipped(false), setPick(null))} bp={bp} />
          <span className="ml-auto flex items-center" style={{ gap: 5, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            <Timer size={13} weight="fill" aria-hidden="true" />
            {clock(s.elapsedSeconds)}
          </span>
        </div>
      )}

      {lg ? (
        <div className="grid min-h-0 flex-1 items-stretch" style={{ gridTemplateColumns: "280px minmax(0,1fr) 280px", gap: 28 }}>
          <div className="flex min-h-0 flex-col" style={{ gap: 22 }}>
            <StackTile rest={rest} bp={bp} />
          </div>
          {center}
          <div className="flex min-h-0 flex-col" style={{ gap: 22 }}>
            <SessionTile graded={s.graded} bp={bp} />
            <KeysTile />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: sm ? 14 : 22 }}>
          {center}
          {bp === "md" && (
            <div className="flex shrink-0" style={{ gap: 20 }}>
              <StackTile rest={rest} bp={bp} />
              <SessionTile graded={s.graded} bp={bp} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, SpeakerHigh, Timer, X } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { api, playWordAudio } from "../../api/client";
import type { Grade, Word } from "../../api/types";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { THEMENFELD_LABELS } from "../../lib/vocab";
import { useNavStack } from "../../lib/navStack";
import { useBreakpoint } from "../../lib/useBreakpoint";
import { articleChipStyle, articleLabel, wordColor } from "../../lib/wordBento";
import { stripLeadingPosTag } from "../../lib/wordDisplay";
import { ReviewNotesPane } from "./ReviewNotesPane";
import { ReviewQueuePane } from "./ReviewQueuePane";
import { ReviewWordPane } from "./ReviewWordPane";
import { NothingDue, SessionDone } from "./SessionDone";
import { useReviewSession } from "./useReviewSession";

/*
 * Review session — undesigned in the Bento handoff, built in the Sticker style (plan Phase 3.2). Transient route:
 * no app chrome. sm/md: progress, the flip card, the grade row. lg: the same card column between the stack and the
 * word's detail + notes tiles.
 *
 * This app's SRS is a 3-grade port of the Obsidian Spaced Repetition plugin (server/src/services/srs.ts): Hard /
 * Good / Easy only, and each button's interval is real (GET /api/reviews/:wordId/preview runs the same schedule()
 * the grade POST uses). Keyboard: Space/Enter flips, 1/2/3 grade once the answer is shown.
 */

const GRADES: { grade: Grade; label: string; color: string; key: string }[] = [
  { grade: "hard", label: "Hard", color: "var(--tomato)", key: "1" },
  { grade: "good", label: "Good", color: "var(--lemon)", key: "2" },
  { grade: "easy", label: "Easy", color: "var(--mint)", key: "3" },
];

const formatInterval = (days: number) => `${days} day${days === 1 ? "" : "s"}`;
const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Route component — forces a full remount of the session (key={location.key}) on every navigation to /review, even
 * to the same pathname (Session Done's "Drill it" pushes /review again with a new curated word). React Router doesn't
 * remount on a location.state change alone.
 */
export default function ReviewSession() {
  const location = useLocation();
  return <ReviewSessionInner key={location.key} state={location.state as { words?: Word[] } | null} />;
}

function roundButton(): CSSProperties {
  return { width: 40, height: 40, borderRadius: "50%", border: "2.5px solid var(--line)", background: "var(--plain)", color: "var(--plainText)", padding: 0, boxShadow: "2px 2px 0 var(--shadow)" };
}

function FlipCard({ word, flipped, onFlip, onOpen, height }: { word: Word; flipped: boolean; onFlip: () => void; onOpen: () => void; height: number }) {
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    border: "2.5px solid var(--line)",
    borderRadius: 26,
    boxShadow: "6px 6px 0 var(--shadow)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };
  const meaning = stripLeadingPosTag(word.meaning ?? "", word.wortart);
  return (
    <div className="flex justify-center" style={{ perspective: 1400 }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? `Answer: ${meaning}. Press Space to flip back.` : `${word.headword}. Press Space to show the answer.`}
        onClick={onFlip}
        className="relative w-full cursor-pointer"
        style={{
          maxWidth: 380,
          height,
          transformStyle: "preserve-3d",
          transition: "transform .6s cubic-bezier(.2,.85,.25,1)",
          transform: `rotate(-0.8deg) rotateY(${flipped ? 180 : 0}deg)`,
        }}
      >
        {/* front */}
        <div style={{ ...face, background: "var(--plain)", color: "var(--plainText)", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <div className="absolute" style={{ top: -12, left: "38%", width: 86, height: 24, background: "var(--tape)", transform: "rotate(-4deg)", borderRadius: 3 }} />
          <span style={{ ...articleChipStyle(word, true), alignSelf: "center" }}>{articleLabel(word)}</span>
          <span lang="de" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1, overflowWrap: "anywhere" }}>
            {word.headword}
          </span>
          <span className="absolute" style={{ bottom: 22, fontSize: 13, fontWeight: 700, color: "var(--plainMuted)" }}>
            Tap or press Space to flip
          </span>
        </div>
        {/* back */}
        <div style={{ ...face, background: wordColor(word), color: "var(--onTile)", transform: "rotateY(180deg)", justifyContent: "center", gap: 12 }}>
          <div className="flex items-center justify-between gap-2">
            <span lang="de" style={{ fontSize: 15, fontWeight: 700 }}>
              {word.genus ? `${word.genus} ` : ""}
              {word.headword}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void playWordAudio(word.id).catch(() => {});
              }}
              aria-label="Play pronunciation"
              className="flex shrink-0 cursor-pointer items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: "50%", border: "2.5px solid var(--line)", background: "var(--btn)", color: "var(--btnText)", padding: 0 }}
            >
              <SpeakerHigh size={17} weight="fill" aria-hidden="true" />
            </button>
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05 }}>{meaning || "no meaning yet"}</span>
          {word.example && (
            <div style={{ background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 14, padding: "10px 12px" }}>
              <p lang="de" style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
                „{word.example}“
              </p>
              {word.exampleTranslation && <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 500, color: "var(--plainMuted)" }}>{word.exampleTranslation}</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {word.declension?.nom?.pl && (
              <span lang="de" style={{ fontSize: 12, fontWeight: 700, background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 999, padding: "2px 9px" }}>
                plural: die {word.declension.nom.pl}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="inline-flex cursor-pointer items-center gap-1"
              style={{ fontSize: 12, fontWeight: 700, background: "transparent", border: "2px dashed var(--line)", borderRadius: 999, padding: "2px 9px", color: "inherit" }}
            >
              <BookOpen size={12} weight="fill" aria-hidden="true" />
              Full entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewSessionInner({ state }: { state: { words?: Word[] } | null }) {
  const { goBack, push } = useNavStack();
  const { bp } = useBreakpoint();
  // A curated queue ("Drill now", Session Done's "Drill it") arrives as router state; none means the due+fresh queue.
  const { loading, queue, current, total, sessionSize, progressPercent, revealed, setRevealed, done, grade, elapsedSeconds } = useReviewSession({
    words: state?.words,
  });
  const [flipped, setFlipped] = useState(false);
  const { data: preview } = useQuery({ queryKey: ["review-preview", current?.id], queryFn: () => api.reviewPreview(current!.id), enabled: !!current });

  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    setRevealed(next);
    if (next && current?.audioPath) void playWordAudio(current.id).catch(() => {});
  };
  const submit = (g: Grade) => {
    if (!current || grade.isPending) return;
    grade.mutate({ wordId: current.id, g });
    setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || !current) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      } else if (revealed) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) submit(g.grade);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const isDone = !loading && !current;
  const pagePad = bp === "lg" ? 24 : bp === "md" ? 22 : 14;

  if (isDone) {
    return (
      <div className="flex min-h-dvh flex-col justify-center" style={{ padding: pagePad }}>
        {total === 0 ? (
          <NothingDue onBack={() => goBack()} />
        ) : (
          <SessionDone done={done} total={total} elapsedSeconds={elapsedSeconds} onHome={() => goBack()} onTakeTest={() => push("/plan")} />
        )}
      </div>
    );
  }

  const cardColumn = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={goBack} aria-label="Close review session" className="flex shrink-0 cursor-pointer items-center justify-center" style={roundButton()}>
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <ProgressBar value={progressPercent / 100} height={14} label="Session progress" />
        </div>
        <span className="min-w-[48px] text-right" style={{ fontSize: 13, fontWeight: 700 }}>
          {loading ? "—" : `${total + 1}/${sessionSize}`}
        </span>
      </div>
      {current && (
        <div className="flex justify-center gap-1.5">
          {current.themenfeld[0] && (
            <span style={{ fontSize: 12, fontWeight: 700, background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 999, padding: "3px 10px" }}>
              {THEMENFELD_LABELS[current.themenfeld[0]]}
            </span>
          )}
          <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, background: "var(--sky)", color: "var(--onTile)", border: "2px solid var(--line)", borderRadius: 999, padding: "3px 10px", fontVariantNumeric: "tabular-nums" }}>
            <Timer size={12} weight="fill" aria-hidden="true" />
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
      )}
      {loading || !current ? (
        <div aria-busy="true" className="mx-auto w-full" style={{ maxWidth: 380, height: 400, border: "2.5px dashed var(--line)", borderRadius: 26, opacity: 0.4 }} />
      ) : (
        <FlipCard word={current} flipped={flipped} onFlip={flip} onOpen={() => push(`/words/${current.id}`)} height={bp === "sm" ? 380 : 420} />
      )}
      {current && (
        <div className="mx-auto w-full" style={{ maxWidth: 380 }}>
          <div
            className="transition-[opacity,transform] duration-300"
            style={{ opacity: revealed ? 1 : 0, transform: revealed ? "none" : "translateY(14px)", pointerEvents: revealed ? "auto" : "none" }}
            aria-hidden={!revealed}
          >
            <div className="mb-2.5 text-center uppercase" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>
              How did that go?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((g, i) => (
                <button
                  key={g.grade}
                  type="button"
                  disabled={grade.isPending || !revealed}
                  onClick={() => submit(g.grade)}
                  className="press flex cursor-pointer flex-col items-center gap-0.5 disabled:cursor-default"
                  style={{
                    ["--tilt" as string]: `${[-1.5, 0, 1.5][i]}deg`,
                    transform: `rotate(${[-1.5, 0, 1.5][i]}deg)`,
                    padding: "12px 4px",
                    background: g.color,
                    color: "var(--onTile)",
                    border: "2.5px solid var(--line)",
                    borderRadius: 18,
                    boxShadow: "3px 3px 0 var(--shadow)",
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{g.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{preview ? formatInterval(preview[g.grade].interval) : "…"}</span>
                  <span className="hidden md:inline" style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>
                    key {g.key}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {!revealed && (
            <div className="mt-2 text-center" style={{ fontSize: 13, fontWeight: 600 }}>
              See the answer first, then grade it.
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (bp !== "lg" || !current) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col" style={{ padding: pagePad }}>
        {cardColumn}
      </div>
    );
  }

  return (
    <div className="grid h-dvh min-h-[760px]" style={{ gridTemplateColumns: "280px minmax(380px,1fr) minmax(0,1fr) 300px", gap: 22, padding: pagePad }}>
      <ReviewQueuePane queue={queue} total={total} sessionSize={sessionSize} progressPercent={progressPercent} done={done} />
      {cardColumn}
      <ReviewWordPane key={current.id} wordId={current.id} />
      <ReviewNotesPane wordId={current.id} />
    </div>
  );
}

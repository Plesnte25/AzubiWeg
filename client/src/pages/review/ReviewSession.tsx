import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, HandTap, Plant, SpeakerHigh, Timer, Trophy, Tree, X } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { api, playWordAudio } from "../../api/client";
import type { Grade, Word } from "../../api/types";
import { Skeleton } from "../../components/ui/Skeleton";
import { chipColor, fullArtLabel } from "../../lib/wordDisplay";
import { THEMENFELD_LABELS } from "../../lib/vocab";
import { useNavStack } from "../../lib/navStack";
import { SessionDone } from "./SessionDone";
import { useReviewSession } from "./useReviewSession";

// This app's SRS is a 3-grade port of the Obsidian Spaced Repetition
// plugin's algorithm (server/src/services/srs.ts) -- there's no "again"
// grade the handoff's 4-button row assumes, so the grade row here is
// Hard/Good/Easy only. A grade button's interval preview is real (GET
// /api/reviews/:id/preview, which calls the exact same schedule() the real
// grade POST uses), not the handoff's hardcoded "<1 min"/"2 days" copy.
const GRADE_BUTTONS: { grade: Grade; label: string; icon: typeof Plant }[] = [
  { grade: "hard", label: "Hard", icon: Plant },
  { grade: "good", label: "Good", icon: Tree },
  { grade: "easy", label: "Easy", icon: Trophy },
];

function formatInterval(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Route component -- exists only to force a full remount of ReviewSessionInner
 * (via `key={location.key}`) on every navigation to /review, even when the
 * pathname is unchanged (e.g. Session Done's "drill" button on the slipping
 * word pushes /review again with a new curated word while already sitting on
 * /review). React Router doesn't remount a route element just because
 * location.state changed on the same pathname, so without this, useReviewSession's
 * useState(words ?? null) would keep serving the exhausted previous session's
 * state instead of starting fresh -- caught by actually driving this flow in
 * a browser, not by typecheck.
 */
export default function ReviewSession() {
  const location = useLocation();
  return <ReviewSessionInner key={location.key} state={location.state as { words?: Word[] } | null} />;
}

function ReviewSessionInner({ state }: { state: { words?: Word[] } | null }) {
  const { goBack, push } = useNavStack();
  // A curated queue (Word Detail's "Drill now") arrives as router state, not
  // a query param, so it never has to serialize full Word objects into the
  // URL -- see useNavStack's push(path, {state}). Absent state means the
  // general due+fresh queue (useReviewSession's own fetch).
  const curatedWords = state?.words;

  const { loading, current, total, sessionSize, progressPercent, revealed, setRevealed, done, grade, elapsedSeconds } = useReviewSession({
    words: curatedWords,
  });
  const [flipped, setFlipped] = useState(false);

  const { data: preview } = useQuery({
    queryKey: ["review-preview", current?.id],
    queryFn: () => api.reviewPreview(current!.id),
    enabled: !!current,
  });

  function flip() {
    const next = !flipped;
    setFlipped(next);
    setRevealed(next);
    if (next && current?.audioPath) void playWordAudio(current.id).catch(() => {});
  }

  function submitGrade(g: Grade) {
    if (!current) return;
    grade.mutate({ wordId: current.id, g });
    setFlipped(false);
  }

  const isDone = !loading && !current;

  return (
    <div
      className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
      style={{ background: isDone ? "radial-gradient(100% 44% at 50% 16%, #2b2741 0%, #161826 68%)" : "radial-gradient(120% 50% at 50% 0%, #1d2033, #161826 62%)" }}
    >
      {isDone ? (
        <SessionDone done={done} total={total} elapsedSeconds={elapsedSeconds} onHome={() => goBack()} onTakeTest={() => push("/plan?view=test")} />
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={goBack} aria-label="Close review session" style={{ color: "rgba(233,233,237,.55)" }}>
              <X size={19} weight="regular" aria-hidden="true" />
            </button>
            <div className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: "#292b31" }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }}
              />
            </div>
            <div className="min-w-[42px] text-right text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
              {loading ? "—" : `${total + 1}/${sessionSize}`}
            </div>
          </div>

          {!loading && current && (
            <div className="mt-2.5 flex justify-center gap-1.5">
              {current.themenfeld[0] && (
                <span className="rounded-full px-2 py-1 text-[9.5px]" style={{ background: "#292b31", color: "rgba(233,233,237,.6)" }}>
                  {THEMENFELD_LABELS[current.themenfeld[0]]}
                </span>
              )}
              <span
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px]"
                style={{ background: "rgba(145,132,217,.14)", color: "#b5abfc" }}
              >
                <Timer size={10} weight="regular" aria-hidden="true" />
                {formatElapsed(elapsedSeconds)} elapsed
              </span>
            </div>
          )}

          <div className="flex flex-1 items-center justify-center py-2" style={{ perspective: 1400 }}>
            {loading || !current ? (
              <Skeleton className="h-[392px] w-full max-w-[322px] rounded-[20px]" />
            ) : (
              <div
                onClick={flip}
                className="relative h-[392px] w-full max-w-[322px] cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform .6s cubic-bezier(.2,.85,.25,1)",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* front */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-[20px] p-6 text-center"
                  style={{
                    backfaceVisibility: "hidden",
                    background: "linear-gradient(165deg,#252838,#1d2030)",
                    boxShadow: "0 0 0 1px #3f424d, 0 18px 44px rgba(0,0,0,.5)",
                  }}
                >
                  <div className="text-[10px] tracking-[.14em] uppercase" style={{ color: chipColor(current) }}>
                    {fullArtLabel(current)}
                  </div>
                  <div className="text-[38px] leading-[1.1] font-medium" style={{ letterSpacing: "-.03em" }}>
                    {current.headword}
                  </div>
                  <div className="absolute bottom-[22px] left-0 right-0 flex flex-col items-center gap-1.5">
                    <HandTap size={21} weight="regular" className="animate-bob" style={{ color: "rgba(233,233,237,.35)" }} aria-hidden="true" />
                    <span className="text-[11.5px]" style={{ color: "rgba(233,233,237,.38)" }}>
                      Tap to flip
                    </span>
                  </div>
                </div>

                {/* back */}
                <div
                  className="absolute inset-0 flex flex-col justify-center gap-2.5 rounded-[20px] p-6"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: "linear-gradient(165deg,#2b2741,#20222f)",
                    boxShadow: "0 0 0 1px #423a6a, 0 18px 44px rgba(0,0,0,.5)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[12px]" style={{ letterSpacing: ".04em", color: chipColor(current) }}>
                      {fullArtLabel(current)} {current.headword}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void playWordAudio(current.id).catch(() => {});
                      }}
                      aria-label="Play pronunciation"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-white"
                      style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
                    >
                      <SpeakerHigh size={15} weight="fill" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="text-[28px] leading-[1.1] font-medium" style={{ letterSpacing: "-.025em" }}>
                    {current.meaning ?? "no meaning yet"}
                  </div>
                  <div
                    className="h-px"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgba(233,233,237,.18) 30px, rgba(233,233,237,.18) calc(100% - 30px), transparent)",
                    }}
                  />
                  {current.example && <div className="text-[14px] leading-[1.5]" style={{ color: "rgba(233,233,237,.85)" }}>{current.example}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {current.declension?.nom?.pl && (
                      <span className="rounded-full px-2 py-1 text-[10.5px]" style={{ background: "#292b31", color: "rgba(233,233,237,.6)" }}>
                        plural: {current.declension.nom.pl}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        push(`/words/${current.id}`);
                      }}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px]"
                      style={{ color: "rgba(233,233,237,.55)" }}
                    >
                      <BookOpen size={11} weight="regular" aria-hidden="true" />
                      Full entry
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!loading && current && (
            <>
              <div
                className="transition-[opacity,transform] duration-300"
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "translateY(0)" : "translateY(14px)",
                  pointerEvents: revealed ? "auto" : "none",
                }}
              >
                <div className="mb-2.5 text-center text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
                  How did that go?
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRADE_BUTTONS.map(({ grade: g, label, icon: Icon }) => {
                    const emphasized = g === "good";
                    return (
                      <button
                        key={g}
                        type="button"
                        disabled={grade.isPending}
                        onClick={() => submitGrade(g)}
                        className="flex flex-col items-center gap-1 rounded-[11px] px-0.5 py-3 disabled:opacity-50"
                        style={{
                          border: `1px solid ${emphasized ? "#9184d9" : "rgba(233,233,237,.16)"}`,
                          background: emphasized ? "rgba(145,132,217,.13)" : "transparent",
                          color: emphasized ? "#d2cefd" : "#e9e9ed",
                        }}
                      >
                        <Icon size={17} weight="regular" aria-hidden="true" />
                        <span className="text-[11.5px] font-medium">{label}</span>
                        <span className="text-[9px]" style={{ color: emphasized ? "rgba(210,206,253,.6)" : "rgba(233,233,237,.4)" }}>
                          {preview ? formatInterval(preview[g].interval) : "…"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid h-[38px] place-items-center">
                <div className="text-[12px] transition-opacity duration-300" style={{ opacity: revealed ? 0 : 1, color: "rgba(233,233,237,.4)" }}>
                  See the answer first, then grade it
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

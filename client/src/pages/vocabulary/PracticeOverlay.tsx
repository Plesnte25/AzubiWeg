import { useEffect } from "react";
import { Flag, PartyPopper, Volume2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { playWordAudio } from "../../api/client";
import type { Word } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import { articleFront, THEMENFELD_LABELS, WORTART_COLORS } from "../../lib/vocab";
import { ORDERS, useReviewSession } from "./useReviewSession";

interface PracticeOverlayProps {
  /** Pre-curated words (a shelf's "Practice N", the Problem-words shelf, a
   * theme "Drill") skip the general due+fresh queue fetch entirely. */
  words?: Word[];
  onClose: () => void;
}

export function PracticeOverlay({ words, onClose }: PracticeOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const {
    loading,
    current,
    total,
    remaining,
    progressPercent,
    revealed,
    setRevealed,
    order,
    changeOrder,
    done,
    grade,
    toggleLeech,
    checkForMore,
    isGeneralQueue,
  } = useReviewSession({ words });

  return createPortal(
    <div className="fixed inset-0 z-[60] hidden flex-col bg-paper lg:flex">
      <div className="h-[3px] w-full bg-hairline">
        <div className="h-full bg-brand-500 transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-wide text-ink-400">PRACTICE</span>
          {!loading && <span className="text-xs text-ink-400">{remaining} remaining · {total} done</span>}
        </div>
        <div className="flex items-center gap-3">
          {!loading && current && (
            <select
              className="rounded-md border border-hairline bg-card px-2 py-1 text-xs outline-none"
              value={order}
              onChange={(e) => changeOrder(e.target.value as (typeof ORDERS)[number]["key"])}
            >
              {ORDERS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button className="flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900" onClick={onClose}>
            Back to vault <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        {loading ? (
          <div className="w-full max-w-lg space-y-4">
            <Skeleton className="mx-auto h-4 w-32" />
            <SkeletonCard className="h-56" />
          </div>
        ) : !current ? (
          <Card padding="lg" className="w-full max-w-md text-center">
            <PartyPopper className="mx-auto size-8 text-brand-500" aria-hidden="true" />
            <h1 className="mt-2 text-lg font-semibold">Session complete</h1>
            {total > 0 ? (
              <p className="mt-1 text-sm text-ink-600">
                {total} reviewed — {done.easy} easy · {done.good} good · {done.hard} hard
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-600">Nothing due right now. Komm morgen wieder!</p>
            )}
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="primary" onClick={onClose}>
                Back to vault
              </Button>
              {isGeneralQueue && (
                <Button variant="outline" onClick={checkForMore}>
                  Check for more
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="w-full max-w-lg">
            <Card padding="lg" className="text-center">
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="font-bold" style={{ color: WORTART_COLORS[current.wortart] }}>
                  {current.wortart}
                </span>
                {current.level && (
                  <span className="rounded-full border border-hairline px-1.5 text-ink-400">{current.level.toUpperCase()}</span>
                )}
                {current.themenfeld[0] && <span className="text-ink-400">{THEMENFELD_LABELS[current.themenfeld[0]]}</span>}
                {current.srDue === null && <Badge variant="brand">new card</Badge>}
              </div>

              <div className="mt-3 text-[38px] font-semibold leading-tight">
                {revealed ? articleFront(current.headword, current.genus) : current.headword}
              </div>

              {revealed ? (
                <div className="mt-5 space-y-2 border-t border-hairline pt-5 text-left text-sm">
                  {current.ipa && <p className="text-center text-ink-400">/{current.ipa}/</p>}
                  {current.meaning && <p>{current.meaning}</p>}
                  {current.grammar && (
                    <p>
                      <span className="text-ink-400">Grammar </span>
                      {current.grammar}
                    </p>
                  )}
                  {current.example && (
                    <p>
                      <span className="text-ink-400">Example </span>
                      <em>{current.example}</em>
                    </p>
                  )}
                  {current.srInterval !== null && (
                    <p className="text-center text-xs text-ink-400">
                      interval {current.srInterval}d · ease {current.srEase}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    {current.audioPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Volume2 className="size-3.5" aria-hidden="true" />}
                        onClick={() => void playWordAudio(current.id)}
                      >
                        Play
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={current.leech ? "border-danger-100 bg-danger-50 text-danger-700" : ""}
                      leftIcon={<Flag className="size-3.5" aria-hidden="true" />}
                      onClick={() => toggleLeech.mutate(current)}
                    >
                      {current.leech ? "Flagged" : "Flag"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => {
                    setRevealed(true);
                    if (current.audioPath) void playWordAudio(current.id).catch(() => {});
                  }}
                >
                  Show answer
                </Button>
              )}
            </Card>

            {revealed && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    ["hard", "Hard", "border-danger-100 text-danger-700 hover:bg-danger-50"],
                    ["good", "Good", "border-hairline text-ink-900 hover:bg-paper"],
                    ["easy", "Easy", "border-ok-100 text-ok-700 hover:bg-ok-50"],
                  ] as const
                ).map(([g, label, cls]) => (
                  <button
                    key={g}
                    disabled={grade.isPending}
                    className={`rounded-md border bg-card px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${cls}`}
                    onClick={() => grade.mutate({ wordId: current.id, g })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

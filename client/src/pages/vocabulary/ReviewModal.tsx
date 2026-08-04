import { useEffect } from "react";
import { Award, PartyPopper, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { Word } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import { useReviewSession } from "./useReviewSession";

interface ReviewModalProps {
  words?: Word[];
  onClose: () => void;
}

const GRADE_BUTTONS = [
  ["hard", "Hard", "border-danger-100 text-danger-700 hover:bg-danger-50"],
  ["good", "Good", "border-hairline text-ink-900 hover:bg-paper"],
  ["easy", "Easy", "border-ok-100 text-ok-700 hover:bg-ok-50"],
] as const;

/** sm/md review session — a centered modal popup with a blurred/dimmed
 * backdrop (the one visual effect `Modal.tsx`'s flat dark backdrop can't
 * produce, so built directly here rather than bolted onto the shared
 * component), replacing lg's full-screen `PracticeOverlay` for these
 * breakpoints. Shares `useReviewSession` with `PracticeOverlay` — same
 * queue/grading/badge logic, different chrome. */
export default function ReviewModal({ words, onClose }: ReviewModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const { loading, current, total, remaining, progressPercent, revealed, setRevealed, done, newBadges, grade } = useReviewSession({
    words,
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 p-4 backdrop-blur-[6px] lg:hidden">
      <div className="w-full max-w-sm">
        {!loading && current && (
          <div className="mb-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="shrink-0 text-xs font-medium text-ink-600">
              {total}/{remaining + total}
            </span>
          </div>
        )}

        <div className="relative rounded-2xl border border-hairline bg-card p-5 shadow-xl">
          <button className="absolute right-3 top-3 grid size-7 place-items-center rounded-full hover:bg-paper" onClick={onClose} title="Close">
            <X className="size-4" aria-hidden="true" />
          </button>

          {loading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="mx-auto h-4 w-24" />
              <SkeletonCard className="h-40" />
            </div>
          ) : !current ? (
            <div className="py-4 text-center">
              <PartyPopper className="mx-auto size-8 text-brand-500" aria-hidden="true" />
              <h2 className="mt-2 text-lg font-semibold">Session complete</h2>
              {total > 0 ? (
                <p className="mt-1 text-sm text-ink-600">
                  {total} reviewed — {done.easy} easy · {done.good} good · {done.hard} hard
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-600">Nothing due right now.</p>
              )}
              {newBadges.length > 0 && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-brand-700">
                  <Award className="size-4" aria-hidden="true" />
                  New badge{newBadges.length === 1 ? "" : "s"}: {newBadges.map((b) => b.label).join(", ")}
                </p>
              )}
              <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
                Back to vault
              </Button>
            </div>
          ) : (
            <>
              <div
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center py-4 text-center"
                onClick={() => setRevealed((r) => !r)}
              >
                <p className="text-2xl font-semibold">{current.headword}</p>
                {!revealed ? (
                  <p className="mt-2 text-xs text-ink-400">tap card to flip →</p>
                ) : (
                  <div className="mt-3 space-y-1">
                    {current.meaning && <p className="text-base font-medium text-ink-900">{current.meaning}</p>}
                    {current.example && <p className="text-sm italic text-ink-600">{current.example}</p>}
                  </div>
                )}
              </div>

              {revealed && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {GRADE_BUTTONS.map(([g, label, cls]) => (
                    <button
                      key={g}
                      disabled={grade.isPending}
                      className={`rounded-full border bg-card px-3 py-2.5 text-sm font-medium disabled:opacity-50 ${cls}`}
                      onClick={() => grade.mutate({ wordId: current.id, g })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { ArrowRight, BarChart3 } from "lucide-react";

interface ReviewActionsProps {
  reviewCount: number;
  onOpenReview: () => void;
  onOpenAnalytics: () => void;
}

/** Presentational only — the "Start review (N) →" / "📊 Analytics" pair,
 * reused unchanged in two different wrapper placements (sm fixed footer,
 * md inline header) so the JSX/labels don't drift between the two. */
export default function ReviewActions({ reviewCount, onOpenReview, onOpenAnalytics }: ReviewActionsProps) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 md:flex-none md:rounded-full md:px-[18px] md:py-2.5"
        onClick={onOpenReview}
      >
        Start review ({reviewCount}) <ArrowRight className="size-4" aria-hidden="true" />
      </button>
      <button
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-card px-4 py-3 text-sm font-medium text-ink-600 hover:border-brand-400 hover:text-ink-900 md:flex-none md:rounded-full md:px-[18px] md:py-2.5"
        onClick={onOpenAnalytics}
      >
        <BarChart3 className="size-4" aria-hidden="true" />
        Analytics
      </button>
    </div>
  );
}

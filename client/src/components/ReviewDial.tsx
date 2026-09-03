/**
 * The Today screen's 176px two-ring progress dial — markup/styling ported
 * exactly from the handoff (German Companion App.dc.html): outer ring =
 * today's review progress (reviewed / (reviewed + due)). The README leaves
 * the inner ring open ("a secondary stat"); no per-word "mastered" count is
 * aggregatable server-side today without duplicating client-only SRS-state
 * logic (see Word's schema comment — computed at read time, never
 * persisted), so this uses the active CEFR level's syllabus-completion
 * percent instead — meaningful, and already available with no backend
 * change. Ring-fill animates via an inline stroke-dashoffset transition
 * (not the handoff's fixed-value ringfill/ringfill2 keyframes, which only
 * work for its hardcoded sample data — see index.css's comment above
 * --animate-pulse-glow).
 */
const OUTER_R = 50;
const INNER_R = 35;
const OUTER_CIRCUMFERENCE = 2 * Math.PI * OUTER_R;
const INNER_CIRCUMFERENCE = 2 * Math.PI * INNER_R;

export default function ReviewDial({
  dueCount,
  reviewedToday,
  secondaryPercent,
  onStart,
}: {
  dueCount: number;
  reviewedToday: number;
  /** Inner ring's fill percent (0-100) — see the class doc comment for what
   * this represents. */
  secondaryPercent: number;
  onStart: () => void;
}) {
  const todayTotal = reviewedToday + dueCount;
  const outerProgress = todayTotal > 0 ? reviewedToday / todayTotal : 0;
  const outerOffset = OUTER_CIRCUMFERENCE * (1 - outerProgress);
  const innerOffset = INNER_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, secondaryPercent)) / 100);

  return (
    <button
      type="button"
      onClick={onStart}
      className="animate-pop-in relative mx-auto mt-3 grid place-items-center"
      aria-label="Start reviewing"
    >
      <svg width={176} height={176} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={60} cy={60} r={OUTER_R} fill="none" stroke="#292b31" strokeWidth={7} />
        <circle
          cx={60}
          cy={60}
          r={OUTER_R}
          fill="none"
          stroke="#423a6a"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={OUTER_CIRCUMFERENCE}
          style={{ strokeDashoffset: outerOffset, transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx={60} cy={60} r={INNER_R} fill="none" stroke="#292b31" strokeWidth={5} />
        <circle
          cx={60}
          cy={60}
          r={INNER_R}
          fill="none"
          stroke="#9184d9"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={INNER_CIRCUMFERENCE}
          style={{ strokeDashoffset: innerOffset, transition: "stroke-dashoffset 1.1s .2s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div
        className="animate-pulse-glow absolute size-[176px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(145,132,217,.15), transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="absolute text-center">
        <div
          className={`tabular leading-none font-medium whitespace-nowrap ${
            dueCount >= 1000 ? "text-display" : dueCount >= 100 ? "text-display" : dueCount >= 10 ? "text-display-lg" : "text-display-xl"
          }`}
          style={{ letterSpacing: "-.045em", ...(dueCount >= 1000 ? { fontSize: "2rem" } : undefined) }}
        >
          {dueCount}
        </div>
        <div className="mt-0.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "#b5abfc" }}>
          due now
        </div>
        <div className="mt-0.5 text-[10.5px]" style={{ color: "rgba(233,233,237,.62)" }}>
          tap to review
        </div>
      </div>
    </button>
  );
}

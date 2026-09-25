/**
 * Bento progress bar (README §1.6): height 8–14, radius 999, 2px outline, plain/plain2 track; a partial fill gets a
 * 2px ink right edge; width animates .3s. `value` is 0–1.
 */
export function ProgressBar({
  value,
  height = 12,
  fill = "var(--mint)",
  track = "var(--plain)",
  label,
}: {
  value: number;
  height?: number;
  fill?: string;
  track?: string;
  /** Accessible name; the bar is exposed as a progressbar with a 0–100 value. */
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="w-full overflow-hidden"
      style={{ height, borderRadius: 999, border: "2px solid var(--line)", background: track, boxSizing: "border-box" }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: fill,
          borderRight: pct > 0 && pct < 100 ? "2px solid var(--line)" : "none",
          boxSizing: "border-box",
          transition: "width .3s",
        }}
      />
    </div>
  );
}

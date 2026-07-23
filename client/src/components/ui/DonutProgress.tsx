import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface DonutSegment {
  value: number;
  color: string;
  /** Short text (e.g. "70%") rendered as a floating pill at the segment's midpoint. */
  label?: string;
}

interface DonutProgressProps {
  /** Colored segments, drawn in order starting from 12 o'clock. */
  segments: DonutSegment[];
  /** Denominator the segments are measured against; defaults to the sum of segment values.
   *  Pass an explicit max (e.g. total word count) to leave an uncolored remainder on the track. */
  max?: number;
  size?: number;
  strokeWidth?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
  /** Angular gap between segments in degrees, for a "separated slices" look instead of one contiguous ring. */
  gap?: number;
  className?: string;
}

export function DonutProgress({
  segments,
  max,
  size = 120,
  strokeWidth = 14,
  centerValue,
  centerLabel,
  gap = 0,
  className,
}: DonutProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const sum = segments.reduce((total, seg) => total + seg.value, 0);
  const denom = max ?? sum ?? 0;
  const gapLength = (gap / 360) * circumference;

  let drawn = 0;
  const arcs = segments.map((seg) => {
    const fraction = denom > 0 ? seg.value / denom : 0;
    const rawLength = fraction * circumference;
    const visibleLength = Math.max(0, rawLength - gapLength);
    const dashoffset = -drawn;
    const midOffset = drawn + rawLength / 2;
    drawn += rawLength;
    // labels are separate HTML elements (not SVG text) so they can be simple
    // styled pills; compute their position in the same rotated frame as the
    // ring (-90deg, i.e. 0 offset = 12 o'clock, growing clockwise)
    const midAngleRad = ((midOffset / circumference) * 360 - 90) * (Math.PI / 180);
    return {
      color: seg.color,
      dasharray: `${visibleLength} ${circumference - visibleLength}`,
      dashoffset,
      label: seg.label,
      hasValue: seg.value > 0,
      labelX: size / 2 + radius * Math.cos(midAngleRad),
      labelY: size / 2 + radius * Math.sin(midAngleRad),
    };
  });

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth={strokeWidth}
        />
        {arcs.map(
          (arc, i) =>
            arc.hasValue && (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={arc.dasharray}
                strokeDashoffset={arc.dashoffset}
                strokeLinecap="round"
              />
            ),
        )}
      </svg>
      {(centerValue !== undefined || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
          {centerValue !== undefined && <span className="text-xl font-bold text-ink-900">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-ink-600">{centerLabel}</span>}
        </div>
      )}
      {arcs.map(
        (arc, i) =>
          arc.hasValue &&
          arc.label && (
            <span
              key={`label-${i}`}
              className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-warning-100 bg-warning-50 px-1.5 py-0.5 text-[10px] font-bold text-ink-900 shadow-sm"
              style={{ left: arc.labelX, top: arc.labelY }}
            >
              {arc.label}
            </span>
          ),
      )}
    </div>
  );
}

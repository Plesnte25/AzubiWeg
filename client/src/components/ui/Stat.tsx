import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

type Tone = "default" | "accent" | "warn" | "ok";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-ink-900",
  accent: "text-brand-600",
  warn: "text-warn-500",
  ok: "text-ok-600",
};

export interface StatProps {
  value: string | number;
  label: string;
  /** A lucide icon element, or an image src string (the app's .webp icon set) — see CLAUDE.md's icon-set table. */
  icon?: ReactNode | string;
  tone?: Tone;
  /** `positive: null` → neutral (`text-ink-400`), for a delta that isn't a
   * good/bad signal (e.g. "best 12d"). */
  delta?: { text: string; positive: boolean | null } | null;
  /** "visible" (default) · "sr-only" (icon+value only, label for a11y) ·
   * "hidden-below-md" (visible label only once there's room). */
  labelVisibility?: "visible" | "sr-only" | "hidden-below-md";
  /** Same options as `labelVisibility`, applied to the delta line independently. */
  deltaVisibility?: "visible" | "hidden-below-md";
  /** In a stacked layout, "sm" starts at `text-body` instead of the default
   * `text-body-lg` before the breakpoint (both still land on `text-heading`
   * at the breakpoint) — matches ProgressPage's smaller KPI tiles. */
  size?: "sm" | "md";
  /** "row" (default) — icon+value always horizontal. "stack-below-lg" /
   * "stack-below-md" — icon-over-value, centered, below the given
   * breakpoint; horizontal (icon left) at/above it — matches Dashboard's
   * stat row (breaks at `lg:`) and TodayPage's stat row (breaks at `md:`).
   * Implies a responsive value size (`text-body-lg` → `text-heading` at the
   * same breakpoint) since that pairing only ever occurs together. */
  layout?: "row" | "stack-below-lg" | "stack-below-md";
  className?: string;
}

/** Unified stat-tile — value + label + optional icon/tone/delta. Absorbs the
 * three previously-independent reimplementations (Dashboard's `Tile`,
 * TodayPage's inline stat row, ProgressPage's inline row with a delta/trend
 * field) into one API; `value` gets `.tabular`, `label` gets `.eyebrow`. */
export function Stat({
  value,
  label,
  icon,
  tone = "default",
  delta,
  labelVisibility = "visible",
  deltaVisibility = "visible",
  size = "md",
  layout = "row",
  className,
}: StatProps) {
  const labelClass = labelVisibility === "sr-only" ? "sr-only" : labelVisibility === "hidden-below-md" ? "hidden md:block" : "block";
  const deltaClass = deltaVisibility === "hidden-below-md" ? "hidden md:block" : "block";
  const stackBp = layout === "stack-below-lg" ? "lg" : layout === "stack-below-md" ? "md" : null;

  const numericValue = typeof value === "number" ? value : null;
  const animated = useAnimatedNumber(numericValue ?? 0);
  const displayValue = numericValue !== null ? Math.round(animated) : value;

  const containerClass =
    stackBp === "lg"
      ? "flex flex-col items-center justify-center gap-1 text-center lg:flex-row lg:items-center lg:justify-start lg:gap-2.5 lg:text-left"
      : stackBp === "md"
        ? "flex flex-col items-center justify-center gap-1 text-center md:flex-row md:items-center md:justify-start md:gap-2.5 md:text-left"
        : "flex items-center gap-2.5";
  const valueSizeClass =
    stackBp === "lg"
      ? "text-body-lg lg:text-heading"
      : stackBp === "md"
        ? size === "sm"
          ? "text-body md:text-heading"
          : "text-body-lg md:text-heading"
        : size === "sm"
          ? "text-body-lg"
          : "text-heading";

  return (
    <div className={cn(containerClass, className)}>
      {icon &&
        (typeof icon === "string" ? (
          <img src={icon} alt="" className={cn("shrink-0", size === "sm" ? "size-4" : "size-4 md:size-5")} />
        ) : (
          <span className="shrink-0 text-ink-400">{icon}</span>
        ))}
      <div className="min-w-0">
        <p className={cn("eyebrow text-ink-400", labelClass)}>{label}</p>
        <p className={cn("tabular font-bold leading-tight", valueSizeClass, TONE_CLASS[tone])}>{displayValue}</p>
        {delta && (
          <p
            className={cn(
              "tabular text-micro font-medium",
              deltaClass,
              delta.positive === null ? "text-ink-400" : delta.positive ? "text-ok-600" : "text-brand-500",
            )}
          >
            {delta.text}
          </p>
        )}
      </div>
    </div>
  );
}

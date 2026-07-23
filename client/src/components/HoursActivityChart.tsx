import { useState } from "react";

interface DayMinutes {
  date: string;
  minutes: number;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  return `${Math.round(minutes)}m`;
}

/**
 * Weekly hours-per-day bar chart with an hour/minute-scaled y-axis, weekday
 * labels, and a persistent callout above today's bar (not just on hover) —
 * the callout follows whichever bar is hovered, defaulting back to today.
 */
export default function HoursActivityChart({ data }: { data: DayMinutes[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 160;
  const PAD_LEFT = 34;
  const PAD_BOTTOM = 20;
  const plotW = W - PAD_LEFT;
  const plotH = H - PAD_BOTTOM;

  const maxMinutes = Math.max(1, ...data.map((d) => d.minutes));
  // friendly axis ceiling: 10-min steps under 20, 20-min under an hour, hour steps beyond
  const step = maxMinutes > 60 ? 60 : maxMinutes > 20 ? 20 : 10;
  const niceMax = Math.ceil(maxMinutes / step) * step;
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  const bandW = plotW / data.length;
  const barW = Math.min(32, bandW - 10);
  const highlightIndex = data.length - 1; // "today" is always the last entry
  const activeIndex = hover ?? highlightIndex;
  const active = data[activeIndex];

  const weekdayFmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
  const dateFmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Study minutes per day, last 7 days">
        {ticks.map((t) => {
          const y = plotH - (t / niceMax) * (plotH - 10);
          return (
            <g key={t}>
              <line x1={PAD_LEFT} x2={W} y1={y} y2={y} stroke="var(--color-hairline)" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--color-ink-400)">
                {formatDuration(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = d.minutes <= 0 ? 0 : Math.max(3, (d.minutes / niceMax) * (plotH - 10));
          const x = PAD_LEFT + i * bandW + (bandW - barW) / 2;
          const isHighlighted = i === highlightIndex;
          const fill =
            i === activeIndex ? "var(--color-brand-600)" : isHighlighted ? "var(--color-brand-500)" : "var(--color-brand-200)";
          return (
            <g key={d.date}>
              <rect
                x={PAD_LEFT + i * bandW}
                y={0}
                width={bandW}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {h > 0 && (
                <path
                  d={`M${x},${plotH} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`}
                  fill={fill}
                  pointerEvents="none"
                />
              )}
              <text x={PAD_LEFT + i * bandW + bandW / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-ink-400)">
                {weekdayFmt(d.date)}
              </text>
            </g>
          );
        })}
        <line x1={PAD_LEFT} x2={W} y1={plotH} y2={plotH} stroke="var(--color-hairline)" strokeWidth={1} />
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -top-1 whitespace-nowrap rounded-lg border border-warning-100 bg-warning-50 px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${((PAD_LEFT + activeIndex * bandW + bandW / 2) / W) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-ink-900">{formatDuration(active.minutes)}</div>
          <div className="text-ink-600">{dateFmt(active.date)}</div>
        </div>
      )}
    </div>
  );
}

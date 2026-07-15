import { useState } from "react";

interface Props {
  data: { date: string; count: number }[];
}

/**
 * Reviews-per-day bar chart (single series — the title names it, no legend).
 * Palette: categorical slot 1 blue on the light card surface; ink/grid tokens
 * from the reference palette.
 */
export default function ActivityChart({ data }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 120;
  const PAD_BOTTOM = 18;
  const plotH = H - PAD_BOTTOM;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = W / data.length;
  const barW = Math.min(24, step - 4);

  const fmt = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Reviews per day, last 14 days">
        {/* hairline gridlines at 0/50/100% */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={plotH - f * (plotH - 8)}
            y2={plotH - f * (plotH - 8)}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const h = d.count === 0 ? 0 : Math.max(3, (d.count / max) * (plotH - 8));
          const x = i * step + (step - barW) / 2;
          return (
            <g key={d.date}>
              {/* hit target bigger than the mark */}
              <rect
                x={i * step}
                y={0}
                width={step}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {h > 0 && (
                <path
                  d={`M${x},${plotH} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`}
                  fill={hover === i ? "#1c5cab" : "#2a78d6"}
                  pointerEvents="none"
                />
              )}
              {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
                <text x={i * step + step / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#898781">
                  {fmt(d.date)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={plotH} y2={plotH} stroke="#c3c2b7" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-hairline bg-card px-2 py-1 text-xs shadow-sm"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="font-medium">{data[hover].count}</span>{" "}
          <span className="text-ink-600">reviews · {fmt(data[hover].date)}</span>
        </div>
      )}
    </div>
  );
}

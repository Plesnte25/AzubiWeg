interface MiniBar {
  label: string;
  value: number;
  color: string;
}

/** Small hand-rolled SVG bar chart for compact mini-cards (sm/md Dashboard
 * Performance/Study time slots) — same "hand-rolled SVG, self-scaling
 * viewBox" approach as StudyActivityChart, just sized down. */
export default function MiniBarChart({ bars, max }: { bars: MiniBar[]; max?: number }) {
  const W = 140;
  const H = 56;
  const labelH = 12;
  const plotH = H - labelH;
  const barMax = max ?? Math.max(1, ...bars.map((b) => b.value));
  const gap = 4;
  const barW = (W - gap * (bars.length - 1)) / bars.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-hidden="true">
      {bars.map((b, i) => {
        const h = b.value === 0 ? 0 : Math.max(2, (b.value / barMax) * (plotH - 4));
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={plotH - h} width={barW} height={h} rx={2} fill={b.color} />
            <text x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill="var(--color-ink-400)">
              {b.label}
            </text>
          </g>
        );
      })}
      <line x1={0} x2={W} y1={plotH} y2={plotH} stroke="var(--color-hairline)" strokeWidth={1} />
    </svg>
  );
}

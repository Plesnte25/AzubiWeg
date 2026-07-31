/** Applications-per-week area/line chart — hand-rolled SVG per the handoff spec (not a bar chart, not ActivityChart). */
export default function TrendChart({ data }: { data: { weekStart: string; applied: number }[] }) {
  const W = 200;
  const H = 40;
  const max = Math.max(1, ...data.map((d) => d.applied));
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = H - 2 - (d.applied / max) * (H - 6);
    return `${x},${y}`;
  });
  const line = points.join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label="Applications per week, last 8 weeks"
    >
      <polygon points={area} fill="var(--color-brand-50)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

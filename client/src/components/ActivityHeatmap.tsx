import { useState } from "react";

interface Day {
  date: string;
  reviews: number;
  learning: number;
}

// sequential magnitude ramp: one hue (brand gold), light→dark, monotonic
// lightness; zero cells are a neutral so "no activity" never reads as data
const ZERO = "#eceae2";
const RAMP = ["#f5dd97", "#eda100", "#b57400", "#8f5c00"];

const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_W = 30;
const LABEL_H = 16;

function bin(total: number, max: number): string {
  if (total <= 0) return ZERO;
  const t = Math.min(1, total / Math.max(1, max));
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/**
 * GitHub-style study-activity heatmap: one cell per day, columns are weeks
 * (Mon–Sun), color encodes total activity (reviews + learning). Exact numbers
 * live in the per-cell tooltip.
 */
export default function ActivityHeatmap({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) return null;

  // pad the first week so rows align Mon (0) … Sun (6)
  const firstDay = new Date(data[0].date + "T00:00:00").getDay(); // 0 = Sun
  const lead = (firstDay + 6) % 7;
  const cells: (Day | null)[] = [...Array<null>(lead).fill(null), ...data];
  const weeks = Math.ceil(cells.length / 7);

  const max = Math.max(...data.map((d) => d.reviews + d.learning));
  const totalReviews = data.reduce((a, d) => a + d.reviews, 0);
  const totalLearning = data.reduce((a, d) => a + d.learning, 0);

  // month label at each week-column where the month changes
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const cell = cells[w * 7] ?? cells[w * 7 + lead];
    if (!cell) continue;
    const month = new Date(cell.date + "T00:00:00").getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        week: w,
        label: new Date(cell.date + "T00:00:00").toLocaleDateString(undefined, { month: "short" }),
      });
      lastMonth = month;
    }
  }

  const width = LABEL_W + weeks * STEP;
  const height = LABEL_H + 7 * STEP;
  const hovered = hover !== null ? (cells[hover] as Day) : null;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Study activity heatmap, last ${weeks} weeks: ${totalReviews} reviews and ${totalLearning} learning activities`}
        >
          {monthLabels.map((m) => (
            <text
              key={`${m.week}-${m.label}`}
              x={LABEL_W + m.week * STEP}
              y={10}
              fontSize={10}
              fill="#898781"
            >
              {m.label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((d, i) => (
            <text
              key={d}
              x={0}
              y={LABEL_H + (i * 2 + 0) * STEP + CELL - 3}
              fontSize={10}
              fill="#898781"
            >
              {d}
            </text>
          ))}
          {cells.map((day, i) => {
            if (!day) return null;
            const week = Math.floor(i / 7);
            const dow = i % 7;
            const total = day.reviews + day.learning;
            return (
              <rect
                key={day.date}
                x={LABEL_W + week * STEP}
                y={LABEL_H + dow * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                fill={bin(total, max)}
                stroke={hover === i ? "#0b0b0b" : "none"}
                strokeWidth={1.5}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${fmt(day.date)}: ${day.reviews} reviews, ${day.learning} learning`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-600">
        <span>
          {totalReviews} review{totalReviews === 1 ? "" : "s"} · {totalLearning} learning{" "}
          {totalLearning === 1 ? "activity" : "activities"} in the last {weeks} weeks
        </span>
        <span className="flex items-center gap-1 text-ink-400">
          Less
          {[ZERO, ...RAMP].map((c) => (
            <span key={c} className="inline-block size-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          More
        </span>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: LABEL_W + Math.floor((hover as number) / 7) * STEP + CELL / 2,
            top: LABEL_H + ((hover as number) % 7) * STEP,
          }}
        >
          <span className="font-medium">{fmt(hovered.date)}</span>
          <span className="text-ink-600">
            {" "}
            · {hovered.reviews} review{hovered.reviews === 1 ? "" : "s"} · {hovered.learning}{" "}
            learning
          </span>
        </div>
      )}
    </div>
  );
}

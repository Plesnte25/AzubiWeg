import type { CefrLevel } from "../api/types";
import { mergeSkillProgress, type SkillProgressDatum } from "../lib/skills";

export type { SkillProgressDatum };

export interface LevelTotal {
  level: CefrLevel;
  total: number;
  done: number;
}

const LEVEL_ORDER: CefrLevel[] = ["a1", "a2", "b1"];

function ArcGauge({ percent, color, label }: { percent: number; color: string; label: string }) {
  const width = 96;
  const height = 58;
  const r = 40;
  const strokeWidth = 10;
  const cx = width / 2;
  const cy = height - 8;
  const circumference = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * circumference;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height }}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`${label}: ${clamped}%`}>
          <path d={arcPath} fill="none" stroke="var(--color-hairline)" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-700"
          />
          <title>{`${label}: ${clamped}%`}</title>
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center text-sm font-bold text-ink-900">{clamped}%</div>
      </div>
      <span className="mt-0.5 text-xs text-ink-600">{label}</span>
    </div>
  );
}

/** Merged "My Progress" card body — an overall completion bar (across all 3
 * CEFR levels combined, with real tick marks at each level's boundary,
 * instead of the old evenly-spaced 25/50/75/100 milestones) above a grid of
 * per-skill arc gauges. Replaces two previously-separate cards (the ongoing-
 * course bar and the per-skill rings) since they were the same syllabus
 * data at two granularities. */
export default function SkillProgressGauges({
  name,
  nextLessonLine,
  dayOffset,
  totalDays,
  levels,
  skills,
}: {
  name: string;
  nextLessonLine: string | null;
  dayOffset: number;
  totalDays: number;
  levels: LevelTotal[];
  skills: SkillProgressDatum[];
}) {
  const grandTotal = levels.reduce((s, l) => s + l.total, 0);
  const grandDone = levels.reduce((s, l) => s + l.done, 0);
  const overallPercent = grandTotal === 0 ? 0 : Math.round((grandDone / grandTotal) * 100);

  let cumulative = 0;
  const boundaries = LEVEL_ORDER.filter((lvl) => levels.some((l) => l.level === lvl)).map((lvl) => {
    const level = levels.find((l) => l.level === lvl)!;
    cumulative += level.total;
    return { level: lvl, pct: grandTotal === 0 ? 0 : (cumulative / grandTotal) * 100 };
  });

  const gauges = mergeSkillProgress(skills);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-ink-900">{name}</p>
        {nextLessonLine && <p className="mt-0.5 text-sm text-ink-600">Next lesson: {nextLessonLine}</p>}
      </div>

      <div className="relative mt-8">
        <div
          className="absolute bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900 px-2.5 py-1 text-xs font-semibold text-white"
          style={{ left: `${overallPercent}%` }}
        >
          {overallPercent}% overall · Day {dayOffset}/{totalDays}
        </div>
        <div className="relative h-3.5 rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700"
            style={{ width: `${overallPercent}%` }}
          />
          {boundaries.map((b) => (
            <span
              key={b.level}
              className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border border-brand-600 bg-white"
              style={{ left: `calc(${b.pct}% - ${b.pct >= 99.5 ? "8px" : "4px"})` }}
              title={`${b.level.toUpperCase()} boundary`}
            />
          ))}
        </div>
        <div className="relative mt-1 h-3.5 text-[10px] font-medium text-ink-400">
          {boundaries.map((b) => (
            <span
              key={b.level}
              className={b.pct >= 99.5 ? "absolute -translate-x-full" : "absolute -translate-x-1/2"}
              style={{ left: `${b.pct}%` }}
            >
              {b.level.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 pt-1">
        {gauges.map((g) => (
          <ArcGauge key={g.skill} percent={g.percent} color={g.color} label={g.label} />
        ))}
      </div>
    </div>
  );
}

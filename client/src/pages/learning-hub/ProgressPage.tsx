import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { ProgressPeriod, RoadmapSkill } from "../../api/types";
import { Skeleton } from "../../components/ui/Skeleton";
import type { Destination } from "./LearningRail";

const PERIODS: { key: ProgressPeriod; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

const SKILL_LABEL: Record<RoadmapSkill, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  bureaucracy: "Context",
  milestone: "Milestone",
  reflection: "Rest",
};

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function deltaText(value: number | null | undefined, suffix: string, goodWhenPositive = true) {
  if (value === null || value === undefined || value === 0) return { text: "—", cls: "text-ink-400" };
  const positive = value > 0;
  const good = goodWhenPositive ? positive : !positive;
  return { text: `${positive ? "▲" : "▼"} ${Math.abs(value)}${suffix}`, cls: good ? "text-ok-600" : "text-brand-500" };
}

/** "Nice" axis ceiling — round maxVal up to a clean multiple of 10/30/60 so
 * gridline labels read like 0/30/60/90, not 0/23/46/69. */
function niceAxisMax(maxVal: number): number {
  const step = maxVal <= 40 ? 10 : maxVal <= 120 ? 30 : maxVal <= 240 ? 60 : Math.ceil(maxVal / 4 / 30) * 30;
  return Math.max(step * 4, Math.ceil(maxVal / step) * step);
}

/** Hand-rolled SVG bar chart (not a vendored library — same convention as
 * StudyActivityChart.tsx): previous-period bars in grey, current in ink,
 * today in brand red, with real y-axis gridlines/labels so a mostly-empty
 * week (lots of legitimate zero/rest days) still reads as "a chart", not a
 * blank box. */
function MinutesChart({ labels, previous, current, period }: { labels: string[]; previous: number[]; current: number[]; period: ProgressPeriod }) {
  const combined = [
    ...previous.map((v) => ({ v, kind: "previous" as const })),
    ...current.map((v, i) => ({ v, kind: i === current.length - 1 && period !== "all" ? ("today" as const) : ("current" as const) })),
  ];
  const axisMax = niceAxisMax(Math.max(1, ...combined.map((b) => b.v)));

  const W = 900;
  const H = 150;
  const PAD_LEFT = 30;
  const PAD_BOTTOM = 20;
  const plotW = W - PAD_LEFT;
  const plotH = H - PAD_BOTTOM;
  const gap = 2;
  const barW = combined.length > 0 ? plotW / combined.length - gap : 0;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const barsPerLabel = Math.max(1, Math.round(current.length / 5));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }} role="img" aria-label="Minutes logged per day">
      {gridLines.map((g) => {
        const y = plotH - g * plotH;
        return (
          <g key={g}>
            <line x1={PAD_LEFT} x2={W} y1={y} y2={y} stroke="var(--color-hairline)" strokeWidth={g === 0 ? 1.5 : 1} />
            <text x={PAD_LEFT - 6} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--color-ink-400)">
              {Math.round(g * axisMax)}
            </text>
          </g>
        );
      })}
      {combined.map((b, i) => {
        const x = PAD_LEFT + i * (barW + gap);
        const h = Math.max(1, (b.v / axisMax) * plotH);
        const fill = b.kind === "today" ? "var(--color-brand-500)" : b.kind === "current" ? "var(--color-ink-900)" : "var(--color-hairline)";
        return <rect key={i} x={x} y={plotH - h} width={barW} height={h} rx={2} fill={fill} />;
      })}
      {labels.map((label, i) => {
        if (i % barsPerLabel !== 0) return null;
        // current-period labels sit after the previous-period bars in `combined`
        const x = PAD_LEFT + (previous.length + i) * (barW + gap);
        const isToday = i === labels.length - 1 && period !== "all";
        return (
          <text key={label} x={x} y={H - 4} fontSize="9.5" fill={isToday ? "var(--color-brand-500)" : "var(--color-ink-400)"} fontWeight={isToday ? 700 : 400}>
            {new Date(label).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        );
      })}
    </svg>
  );
}

export function ProgressPage({ onNavigate }: { onNavigate: (d: Destination) => void }) {
  const [period, setPeriod] = useState<ProgressPeriod>("30d");
  const { data, isLoading } = useQuery({ queryKey: ["learning", "progress", period], queryFn: () => api.learningProgress(period) });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { kpis } = data;
  const tasksDelta = deltaText(kpis.tasksKept.delta, "", true);
  const minutesDelta = deltaText(kpis.minutes.deltaPercent, "%", true);
  const testDelta = deltaText(kpis.testAvg.deltaPoints, " pts", true);
  const syllabusDelta = deltaText(kpis.syllabusPercent.deltaPoints, " pts", true);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-bold">Progress</h1>
          <p className="text-[13px] text-ink-600">
            {fmtShort(data.rangeStart)} – {fmtShort(data.rangeEnd)}
            {period !== "all" && " · compared with the previous period"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-hairline bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${period === p.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { label: "Tasks kept", value: `${kpis.tasksKept.value}/${kpis.tasksKept.total}`, delta: tasksDelta },
          { label: "Minutes", value: String(kpis.minutes.value), delta: minutesDelta },
          { label: "Test avg", value: kpis.testAvg.value !== null ? `${kpis.testAvg.value}%` : "—", delta: testDelta },
          { label: "Syllabus", value: `${kpis.syllabusPercent.value}%`, delta: syllabusDelta },
          { label: "Streak", value: `${kpis.streak.current}d`, delta: { text: `best ${kpis.streak.best}d`, cls: "text-ink-400" } },
        ].map((k) => (
          <div key={k.label} className="rounded-[13px] border border-hairline bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-400">{k.label}</p>
            <p className="mt-1 text-[21px] font-bold">{k.value}</p>
            <p className={`mt-0.5 text-[10.5px] font-medium ${k.delta.cls}`}>{k.delta.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-hairline bg-card p-4">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Minutes logged per day</p>
        <div className="mt-3">
          <MinutesChart labels={data.chart.labels} previous={data.chart.previous} current={data.chart.current} period={period} />
        </div>
        <p className="mt-1.5 text-[10.5px] text-ink-400">Rest days explain the near-zero columns.</p>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_236px]">
        <div className="rounded-2xl border border-hairline bg-card p-4">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Completion by skill</p>
          <div className="mt-2 space-y-2">
            {data.bySkill.map((s) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="w-[66px] shrink-0 text-xs text-ink-600">{SKILL_LABEL[s.skill]}</span>
                <div className="flex h-[15px] flex-1 gap-0.5 overflow-hidden rounded-sm">
                  <div className="h-full bg-ink-900" style={{ width: `${(s.done / Math.max(1, s.planned)) * 100}%` }} />
                  <div className="h-full bg-warn-tint-100" style={{ width: `${(s.dropped / Math.max(1, s.planned)) * 100}%` }} />
                  <div className="h-full flex-1 bg-paper" />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-ink-600">
                  {s.done}/{s.planned}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 border-t border-hairline pt-3 sm:grid-cols-2">
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Weak areas · under 60%</p>
              <div className="mt-1.5 space-y-1">
                {data.weakAreas.length === 0 ? (
                  <p className="text-xs text-ink-400">None — nice.</p>
                ) : (
                  data.weakAreas.map((w) => (
                    <div key={w.topic} className="flex justify-between text-sm">
                      <span className="text-ink-600">{w.topic}</span>
                      <span className="font-medium text-brand-500">{w.percent}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Improved most</p>
              <div className="mt-1.5 space-y-1">
                {data.improvedMost.length === 0 ? (
                  <p className="text-xs text-ink-400">Not enough history yet.</p>
                ) : (
                  data.improvedMost.map((w) => (
                    <div key={w.topic} className="flex justify-between text-sm">
                      <span className="text-ink-600">{w.topic}</span>
                      <span className="font-medium text-ok-600">▲ {w.deltaPoints} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[13px] border border-hairline bg-card p-3.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Study streak</p>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {data.streakGrid.map((cell) => {
                const isToday = cell.date === data.streakGrid[data.streakGrid.length - 1]!.date;
                const intensity = cell.minutes === 0 ? 0 : cell.minutes < 15 ? 1 : cell.minutes < 30 ? 2 : cell.minutes < 60 ? 3 : 4;
                const bg = isToday
                  ? "bg-brand-500"
                  : ["bg-paper", "bg-brand-100", "bg-brand-200", "bg-brand-300", "bg-brand-500"][intensity];
                return <div key={cell.date} title={`${cell.date}: ${cell.minutes} min`} className={`size-4 rounded-[3px] ${bg}`} />;
              })}
            </div>
          </div>

          <div className="rounded-[13px] bg-ink-900 p-3.5 text-white">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Goethe {data.readiness.level.toUpperCase()}</p>
            <p className="mt-1 text-sm font-bold">{data.readiness.readinessLabel}</p>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-dark-1)]">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${data.readiness.syllabusPercent}%` }} />
            </div>
            <button onClick={() => onNavigate("syllabus")} className="mt-2 text-xs text-brand-400 hover:underline">
              Open syllabus →
            </button>
          </div>

          <div className="rounded-[13px] border border-hairline p-3.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Time coverage</p>
            <p className="mt-1.5 text-xs text-ink-600">
              {data.timeCoverage.tasksWithLoggedTime} of {data.timeCoverage.tasksCompleted} completed tasks had time logged. Minutes are self-reported, so
              treat the daily chart as a floor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

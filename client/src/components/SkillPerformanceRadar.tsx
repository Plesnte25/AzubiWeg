import { Filler, LineElement, PointElement, RadialLinearScale, Tooltip, Chart as ChartJS, type ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Radar } from "react-chartjs-2";
import type { RoadmapSkill } from "../api/types";
import { useTheme } from "../hooks/useTheme";
import { DISPLAY_SKILLS, DISPLAY_SKILL_LABELS, SKILL_COLORS, displaySkill } from "../lib/skills";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export interface SkillPerformanceDatum {
  skill: RoadmapSkill;
  percent: number;
}

/** Canvas 2D (what Chart.js draws on) can't resolve `var(--foo)` the way DOM/
 * SVG styles can, so theme-aware colors have to be read as computed values
 * and re-read whenever the theme toggles (see `useTheme()` below). */
function resolveColor(value: string): string {
  const match = value.match(/^var\((--[\w-]+)\)$/);
  if (!match) return value;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || value;
}

/** Chart.js (react-chartjs-2) radar chart — single "Performance" series across
 * the 5 display skills (listening merged into speaking). No legend: values
 * are read via hover tooltip only, per the original design spec. Each vertex
 * point and axis label uses the skill's global color. */
export default function SkillPerformanceRadar({ data }: { data: SkillPerformanceDatum[] }) {
  const { resolved } = useTheme();

  const byDisplaySkill = new Map<string, number>();
  for (const d of data) {
    const key = displaySkill(d.skill);
    byDisplaySkill.set(key, Math.max(byDisplaySkill.get(key) ?? 0, d.percent));
  }
  const values = DISPLAY_SKILLS.map((s) => byDisplaySkill.get(s) ?? 0);

  const { chartData, options } = useMemo(() => {
    const labels = DISPLAY_SKILLS.map((s) => DISPLAY_SKILL_LABELS[s]);
    const pointColors = DISPLAY_SKILLS.map((s) => resolveColor(SKILL_COLORS[s]));
    const brand = resolveColor("var(--color-brand-500)");
    const hairline = resolveColor("var(--color-hairline)");
    const inkMuted = resolveColor("var(--color-ink-400)");

    return {
      chartData: {
        labels,
        datasets: [
          {
            label: "Performance",
            data: values,
            backgroundColor: `${brand}33`,
            borderColor: brand,
            borderWidth: 2,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // reserves room for the outermost point labels so they never get
        // clipped against the canvas edge regardless of the container size
        animation: { duration: 400 },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20, showLabelBackdrop: false, color: inkMuted, font: { size: 9 } },
            grid: { color: hairline },
            angleLines: { color: hairline },
            pointLabels: {
              color: (ctx) => pointColors[ctx.index] ?? inkMuted,
              font: { size: 11, weight: 550},
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.formattedValue}%` } },
        },
      } satisfies ChartOptions<"radar">,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), resolved]);

  return (
    <div className="h-full w-full">
      <Radar data={chartData} options={options} />
    </div>
  );
}

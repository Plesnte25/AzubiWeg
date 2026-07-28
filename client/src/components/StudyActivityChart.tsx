import { useMemo, useState } from "react";
import type { RoadmapDailySkillMinutes } from "../api/types";
import annualIcon from "../assets/icons/annual.png";
import hourglassIcon from "../assets/icons/hourglass.png";
import scheduleIcon from "../assets/icons/schedule.png";
import { cn } from "../lib/cn";
import { DISPLAY_SKILL_LABELS, DISPLAY_SKILL_LABELS_COMPACT, DISPLAY_SKILLS, SKILL_COLORS, displaySkill } from "../lib/skills";

const MODE_ICON: Record<Mode, string> = { hour: hourglassIcon, weekly: scheduleIcon, monthly: annualIcon };

type Mode = "hour" | "weekly" | "monthly";

interface HourPoint {
  hour: number;
  minutes: number;
}

interface StackedBar {
  label: string;
  segments: { skill: string; minutes: number }[];
  total: number;
}

function mondayOf(d: Date): Date {
  const dayIdx = (d.getDay() + 6) % 7; // 0 = Monday
  const out = new Date(d);
  out.setDate(out.getDate() - dayIdx);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketBySkill(entries: RoadmapDailySkillMinutes[], dateFilter: (date: string) => boolean): Map<string, number> {
  const bucket = new Map<string, number>();
  for (const e of entries) {
    if (!dateFilter(e.date)) continue;
    const skill = displaySkill(e.skill);
    bucket.set(skill, (bucket.get(skill) ?? 0) + e.minutes);
  }
  return bucket;
}

function toSegments(bucket: Map<string, number>): { skill: string; minutes: number }[] {
  return DISPLAY_SKILLS.map((s) => ({ skill: s, minutes: bucket.get(s) ?? 0 }));
}

function buildWeeklyBars(entries: RoadmapDailySkillMinutes[]): StackedBar[] {
  const monday = mondayOf(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = isoDate(d);
    const segments = toSegments(bucketBySkill(entries, (date) => date === key));
    return { label: d.toLocaleDateString(undefined, { weekday: "short" }), segments, total: segments.reduce((a, s) => a + s.minutes, 0) };
  });
}

function buildMonthlyBars(entries: RoadmapDailySkillMinutes[]): StackedBar[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const weekStarts: string[] = [];
  for (let cursor = mondayOf(first); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
    weekStarts.push(isoDate(cursor));
  }
  return weekStarts.map((weekKey, i) => {
    const weekEnd = new Date(weekKey + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 6);
    const segments = toSegments(
      bucketBySkill(entries, (date) => date >= weekKey && date <= isoDate(weekEnd)),
    );
    return { label: `Wk ${i + 1}`, segments, total: segments.reduce((a, s) => a + s.minutes, 0) };
  });
}

function fmtHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

/** Hand-rolled stacked bar chart (not a vendored library — see plan notes):
 * Hour-of-day (default, single color, real automatic activity data) plus
 * Weekly/Monthly (stacked by skill, self-reported roadmap-task minutes). */
export default function StudyActivityChart({
  hourly,
  weekly,
  monthly,
}: {
  hourly: HourPoint[];
  weekly: RoadmapDailySkillMinutes[];
  monthly: RoadmapDailySkillMinutes[];
}) {
  const [mode, setMode] = useState<Mode>("hour");
  const [hover, setHover] = useState<number | null>(null);

  const bars = useMemo<StackedBar[] | null>(() => {
    if (mode === "weekly") return buildWeeklyBars(weekly);
    if (mode === "monthly") return buildMonthlyBars(monthly);
    return null;
  }, [mode, weekly, monthly]);

  const W = 560;
  const H = 180;
  const PAD_BOTTOM = 20;
  const plotH = H - PAD_BOTTOM;

  const isEmpty =
    mode === "hour" ? hourly.every((h) => h.minutes === 0) : (bars ?? []).every((b) => b.total === 0);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-end">
        <div className="flex gap-0.5 rounded-full bg-paper p-0.5">
          {(
            [
              ["hour", "Hour"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setHover(null);
              }}
              title={label}
              aria-label={label}
              className={cn("grid size-[26px] place-items-center rounded-full transition-colors", mode === m ? "bg-brand-600" : "hover:bg-ink-50")}
            >
              <img src={MODE_ICON[m]} alt="" className={cn("size-4", mode === m && "brightness-0 invert")} />
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {isEmpty ? (
          <p className="text-sm text-ink-600">
            {mode === "hour" ? "No study activity logged yet." : "No time logged against roadmap tasks yet."}
          </p>
        ) : mode === "hour" ? (
          <HourOfDayBars data={hourly} hover={hover} setHover={setHover} W={W} H={H} plotH={plotH} />
        ) : (
          <StackedBars bars={bars!} hover={hover} setHover={setHover} W={W} plotH={plotH} H={H} />
        )}
      </div>

      {mode !== "hour" && (
        <ul className="mt-2 flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-xs">
          {DISPLAY_SKILLS.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: SKILL_COLORS[s] }} />
              {DISPLAY_SKILL_LABELS_COMPACT[s]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HourOfDayBars({
  data,
  hover,
  setHover,
  W,
  H,
  plotH,
}: {
  data: HourPoint[];
  hover: number | null;
  setHover: (i: number | null) => void;
  W: number;
  H: number;
  plotH: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const step = W / data.length;
  const barW = Math.min(16, step - 3);
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label="Study minutes by hour of day">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={plotH - f * (plotH - 8)} y2={plotH - f * (plotH - 8)} stroke="var(--color-hairline)" strokeWidth={1} strokeDasharray="4,4" />
        ))}
        {data.map((d, i) => {
          const h = d.minutes === 0 ? 0 : Math.max(2, (d.minutes / max) * (plotH - 8));
          const x = i * step + (step - barW) / 2;
          return (
            <g key={d.hour}>
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              {h > 0 && (
                <rect x={x} y={plotH - h} width={barW} height={h} rx={3} fill={hover === i ? "var(--color-brand-600)" : "var(--color-brand-400)"} pointerEvents="none" />
              )}
              {d.hour % 6 === 0 && (
                <text x={i * step + step / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--color-ink-400)">
                  {d.hour}:00
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={plotH} y2={plotH} stroke="var(--color-hairline)" strokeWidth={1} />
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -top-1 whitespace-nowrap rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${((hover! + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="font-semibold text-ink-900">{active.minutes}m</span> <span className="text-ink-600">at {active.hour}:00</span>
        </div>
      )}
    </div>
  );
}

function StackedBars({
  bars,
  hover,
  setHover,
  W,
  plotH,
  H,
}: {
  bars: StackedBar[];
  hover: number | null;
  setHover: (i: number | null) => void;
  W: number;
  plotH: number;
  H: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.total));
  const step = W / bars.length;
  const barW = Math.min(48, step - 12);
  const active = hover !== null ? bars[hover] : null;

  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label="Study time by skill">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={plotH - f * (plotH - 8)} y2={plotH - f * (plotH - 8)} stroke="var(--color-hairline)" strokeWidth={1} strokeDasharray="4,4" />
        ))}
        {bars.map((bar, i) => {
          const x = i * step + (step - barW) / 2;
          let yCursor = plotH;
          return (
            <g key={bar.label}>
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              {bar.segments.map((seg) => {
                if (seg.minutes === 0) return null;
                const h = (seg.minutes / max) * (plotH - 8);
                yCursor -= h;
                return (
                  <rect
                    key={seg.skill}
                    x={x}
                    y={yCursor}
                    width={barW}
                    height={h}
                    fill={SKILL_COLORS[seg.skill as keyof typeof SKILL_COLORS]}
                    opacity={hover === null || hover === i ? 1 : 0.4}
                    pointerEvents="none"
                  />
                );
              })}
              <text x={i * step + step / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-ink-400)">
                {bar.label}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={plotH} y2={plotH} stroke="var(--color-hairline)" strokeWidth={1} />
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -top-1 whitespace-nowrap rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${((hover! + 0.5) / bars.length) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="font-semibold text-ink-900">
            {active.label} · {fmtHours(active.total)}
          </p>
          {active.segments
            .filter((s) => s.minutes > 0)
            .map((s) => (
              <p key={s.skill} className="flex items-center gap-1.5 text-ink-600">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: SKILL_COLORS[s.skill as keyof typeof SKILL_COLORS] }} />
                {DISPLAY_SKILL_LABELS[s.skill as keyof typeof DISPLAY_SKILL_LABELS]}: {fmtHours(s.minutes)}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

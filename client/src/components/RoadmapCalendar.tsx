import type { RoadmapCalendarDay, RoadmapDayStatus } from "../api/types";

const STATUS_STYLES: Record<RoadmapDayStatus, string> = {
  done: "border-ok-600 bg-ok-50 text-ok-600",
  overdue: "border-danger-600 bg-danger-50 text-danger-600",
  today: "border-brand-600 bg-brand-100 text-brand-700 ring-2 ring-brand-200",
  upcoming: "border-hairline bg-paper text-ink-400",
};

const STATUS_BAR: Record<RoadmapDayStatus, string> = {
  done: "bg-ok-600",
  overdue: "bg-danger-600",
  today: "bg-brand-600",
  upcoming: "bg-hairline",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  /** YYYY-MM */
  month: string;
  days: RoadmapCalendarDay[];
  onSelectDay: (date: string) => void;
}

/**
 * A true month grid (unlike the rolling contribution-graph layout used
 * elsewhere) with real day-of-month numbers, clickable cells, and a thin
 * completion bar per day so progress reads at a glance without opening it.
 * Reuses the same status-color language as Checklist.tsx's expiry badges
 * (bg-X-50/text-X-600) rather than inventing a new one.
 */
export default function RoadmapCalendar({ month, days, onSelectDay }: Props) {
  const [year, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, m - 1, 1);
  const daysInMonth = new Date(year, m, 0).getDate();
  // Monday-aligned leading blanks, matching ActivityHeatmap's convention
  const lead = (firstOfMonth.getDay() + 6) % 7;

  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));

  const cells: ({ dayOfMonth: number; iso: string } | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const iso = `${year}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return { dayOfMonth: i + 1, iso };
    }),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-ink-400">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const day = byDate.get(cell.iso);
          const style = day ? STATUS_STYLES[day.status] : "border-hairline bg-paper text-ink-400";
          const fraction = day && day.totalTasks > 0 ? day.completedTasks / day.totalTasks : 0;
          // status (done/today/overdue/upcoming) is otherwise conveyed by
          // border/background color alone — say it in the accessible name too
          const label = day
            ? `${cell.iso}, ${day.status}: ${day.completedTasks}/${day.totalTasks} done${day.theme ? ` — ${day.theme}` : ""}`
            : `${cell.iso}, no roadmap day`;
          return (
            <button
              key={cell.iso}
              disabled={!day}
              onClick={() => day && onSelectDay(cell.iso)}
              title={label}
              aria-label={label}
              className={`group relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border text-sm font-medium transition-all ${style} ${
                day ? "cursor-pointer hover:scale-[1.04] hover:shadow-md" : "cursor-default opacity-40"
              }`}
            >
              {cell.dayOfMonth}
              {day && day.totalTasks > 0 && (
                <span className="h-1 w-5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <span
                    className={`block h-full rounded-full ${STATUS_BAR[day.status]}`}
                    style={{ width: `${Math.round(fraction * 100)}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-400">
        {(["upcoming", "today", "overdue", "done"] as RoadmapDayStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full border ${STATUS_STYLES[s]}`} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

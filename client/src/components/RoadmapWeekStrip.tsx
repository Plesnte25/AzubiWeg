import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoadmapCalendarDay, RoadmapDayStatus } from "../api/types";
import { cn } from "../lib/cn";

/** Cell background/border by status — `today`/`selected` isn't in here since
 * that's conveyed separately via an inset brand ring (see `isHighlighted`
 * below) layered on top of whichever status background applies. */
const STATUS_CELL: Record<Exclude<RoadmapDayStatus, "today">, string> = {
  done: "border-ok-100 bg-ok-50",
  overdue: "border-danger-100 bg-danger-50",
  upcoming: "border-hairline bg-ink-50",
};

/** The small completion-fraction underline bar's color — kept a step apart
 * from the brand-colored highlight ring so the two signals (this day is
 * "today"/selected vs. this day's task-completion state) don't collapse
 * into a single color. */
const STATUS_BAR: Record<RoadmapDayStatus, string> = {
  done: "bg-ok-600",
  overdue: "bg-danger-600",
  today: "bg-warning-500",
  upcoming: "bg-hairline",
};

interface Props {
  /** Monday of the displayed week, YYYY-MM-DD */
  weekStart: string;
  days: RoadmapCalendarDay[];
  /** Currently-selected day (if any) — highlighted in place of "today" when set. */
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onShiftWeek: (deltaWeeks: number) => void;
}

/** Single-week slider (7 cells + arrow nav) — a centered "{Month} {Year}"
 * header between chevrons, then a row of bordered/tinted day cells (two-letter
 * weekday + date number + a thin completion-fraction bar). The day that's
 * either selected or (if none is) today's date gets an inset brand ring
 * instead of its own background tint, so "this is the focused day" reads as
 * a distinct signal from "this day is done/overdue". */
export default function RoadmapWeekStrip({ weekStart, days, selectedDate, onSelectDay, onShiftWeek }: Props) {
  const start = new Date(weekStart + "T00:00:00");
  const byDate = new Map(days.map((d) => [d.date.slice(0, 10), d]));

  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: d, iso, day: byDate.get(iso) };
  });

  const todayIso = cells.find((c) => c.day?.status === "today")?.iso ?? null;
  const highlightIso = selectedDate ?? todayIso;

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const yy = String(start.getFullYear() % 100).padStart(2, "0");
  const rangeLabel =
    start.getMonth() === end.getMonth()
      ? `${start.toLocaleDateString(undefined, { month: "long" })} ${yy}`
      : `${start.toLocaleDateString(undefined, { month: "short" })} | ${end.toLocaleDateString(undefined, { month: "short" })} ${yy}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="grid size-7 place-items-center rounded-full hover:bg-paper" onClick={() => onShiftWeek(-1)} aria-label="Previous week">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="text-base font-bold text-ink-900">{rangeLabel}</p>
        <button className="grid size-7 place-items-center rounded-full hover:bg-paper" onClick={() => onShiftWeek(1)} aria-label="Next week">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map(({ date, iso, day }) => {
          const isHighlighted = iso === highlightIso;
          const label = day
            ? `${iso}, ${day.status}: ${day.completedTasks}/${day.totalTasks} done${day.theme ? ` — ${day.theme}` : ""}`
            : `${iso}, no roadmap day`;
          const baseStatus = day && day.status !== "today" ? day.status : "upcoming";
          const fraction = day && day.totalTasks > 0 ? day.completedTasks / day.totalTasks : 0;
          return (
            <button
              key={iso}
              disabled={!day}
              onClick={() => day && onSelectDay(iso)}
              title={label}
              aria-label={label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-[10px] border px-1 py-2 text-center transition-transform",
                STATUS_CELL[baseStatus],
                isHighlighted && "ring-2 ring-inset ring-brand-600",
                day ? "cursor-pointer hover:scale-[1.03]" : "cursor-default opacity-40",
              )}
            >
              <span className="text-[11px] text-ink-400">{date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</span>
              <span className="text-sm font-bold text-ink-900">{date.getDate()}</span>
              {day && day.totalTasks > 0 && (
                <span className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full">
                  <span className={cn("mx-auto block h-full rounded-full", STATUS_BAR[day.status])} style={{ width: `${Math.round(fraction * 100)}%` }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

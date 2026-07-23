import { useNavigate } from "react-router-dom";
import type { RoadmapDayStripStatus } from "../api/types";

const DOT_STYLE: Record<RoadmapDayStripStatus, string> = {
  done: "bg-ok-600",
  today: "bg-brand-500 ring-2 ring-brand-200",
  overdue: "bg-danger-600",
  upcoming: "bg-hairline",
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const STATUS_TEXT: Record<RoadmapDayStripStatus, string> = {
  done: "done",
  today: "today",
  overdue: "overdue",
  upcoming: "upcoming",
};

function fullLabel(date: string, status: RoadmapDayStripStatus): string {
  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return `${weekday}: ${STATUS_TEXT[status]}`;
}

export default function RoadmapWeekStrip({
  days,
}: {
  days: { date: string; dayOffset: number; status: RoadmapDayStripStatus }[];
}) {
  const navigate = useNavigate();

  if (days.length === 0) return null;

  return (
    <div className="flex justify-between gap-1">
      {days.map((d, i) => (
        <button
          key={d.date}
          aria-label={fullLabel(d.date, d.status)}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 hover:bg-paper"
          onClick={() => navigate(`/learning?group=progress&tab=calendar`)}
        >
          <span aria-hidden="true" className="text-xs text-ink-400">
            {WEEKDAY_LABELS[i]}
          </span>
          <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT_STYLE[d.status]}`} />
        </button>
      ))}
    </div>
  );
}

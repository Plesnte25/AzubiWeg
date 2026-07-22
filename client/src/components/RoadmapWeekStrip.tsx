import { useNavigate } from "react-router-dom";
import type { RoadmapDayStripStatus } from "../api/types";

const DOT_STYLE: Record<RoadmapDayStripStatus, string> = {
  done: "bg-ok-600",
  today: "bg-brand-500 ring-2 ring-brand-200",
  overdue: "bg-danger-600",
  upcoming: "bg-hairline",
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

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
          title={d.date}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 hover:bg-paper"
          onClick={() => navigate(`/learning?group=progress&tab=calendar`)}
        >
          <span className="text-xs text-ink-400">{WEEKDAY_LABELS[i]}</span>
          <span className={`size-2.5 rounded-full ${DOT_STYLE[d.status]}`} />
        </button>
      ))}
    </div>
  );
}

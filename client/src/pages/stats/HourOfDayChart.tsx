/**
 * All-time hour-of-day distribution (Phase 4) — `GET /activity/hourly` was
 * already fully computed (HourlyActiveMinutes' whole reason for existing)
 * but called from no page anywhere in the app until now.
 */
export function HourOfDayChart({ hours }: { hours: { hour: number; minutes: number }[] }) {
  const max = Math.max(1, ...hours.map((h) => h.minutes));
  return (
    <div>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
        What time of day you study
      </div>
      <div className="mt-3 flex h-[54px] items-end gap-[2px]">
        {hours.map((h) => (
          <div
            key={h.hour}
            title={`${h.hour}:00 — ${h.minutes} min total`}
            className="flex-1 rounded-t-[2px]"
            style={{ height: `${Math.max(2, (h.minutes / max) * 100)}%`, background: h.minutes > 0 ? "#796cbf" : "#292b31" }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px]" style={{ color: "rgba(233,233,237,.62)" }}>
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}

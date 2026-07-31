import { deadlineTier } from "./deadline";

const TIER_CLASSES = {
  urgent: "bg-brand-50 text-brand-700",
  soon: "bg-warn-tint-50 text-warn-700",
  fine: "bg-ok-50 text-ok-700",
} as const;

function label(days: number): string {
  if (days < 0) return "expired";
  if (days === 0) return "today";
  return `${days}d`;
}

export default function DeadlineBadge({ days }: { days: number }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TIER_CLASSES[deadlineTier(days)]}`}
    >
      {label(days)}
    </span>
  );
}

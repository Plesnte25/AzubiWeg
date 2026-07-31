import type { ChecklistItem } from "../../api/types";
import { CATEGORY_LABEL } from "./shared";
import { daysUntil } from "./deadline";
import DeadlineBadge from "./DeadlineBadge";

export default function UpNextPanel({
  items,
  onToggleDone,
}: {
  items: ChecklistItem[];
  onToggleDone: (item: ChecklistItem) => void;
}) {
  const upNext = items
    .filter((i) => i.status !== "done" && i.status !== "not_applicable" && i.expiresAt)
    .map((i) => ({ item: i, days: daysUntil(i.expiresAt!) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  if (upNext.length === 0) return null;

  return (
    <div className="rounded-[14px] border border-warn-tint-100 bg-warn-tint-50 px-4 py-3.5">
      <p className="text-[10px] font-bold text-warn-500">UP NEXT · SORTED BY DEADLINE · ACROSS ALL CATEGORIES</p>
      <ul className="mt-2 space-y-2">
        {upNext.map(({ item, days }) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label={`Mark "${item.title}" done`}
              onClick={() => onToggleDone(item)}
              className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-ink-300"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {item.title}
              <span className="ml-1.5 text-[11px] font-normal text-ink-300">{CATEGORY_LABEL[item.category]}</span>
            </span>
            <DeadlineBadge days={days} />
          </li>
        ))}
      </ul>
    </div>
  );
}

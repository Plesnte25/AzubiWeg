import type { ReactNode } from "react";

/** A small circular icon-button, matching this session's established
 * search/info/CTA idiom (Vocabulary.tsx, TodayPage.tsx, StationDetailModal.tsx)
 * — shared by any composer/modal header that needs a compact icon action. */
export function CircleIconButton({
  icon,
  title,
  onClick,
  disabled,
  active,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-8 shrink-0 place-items-center rounded-full border text-ink-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-brand-400 bg-brand-50 text-brand-600" : "border-hairline bg-card hover:border-brand-400"
      }`}
    >
      {icon}
    </button>
  );
}

import type { ApplicationStatus } from "../../api/types";

export const COLUMNS: { key: ApplicationStatus; label: string; colorClass: string }[] = [
  { key: "wishlist", label: "Wishlist", colorClass: "text-ink-400" },
  { key: "applied", label: "Applied", colorClass: "text-ink-400" },
  { key: "interview", label: "Interview", colorClass: "text-warn-500" },
  { key: "offer", label: "Offer", colorClass: "text-ok-600" },
  { key: "rejected", label: "Rejected", colorClass: "text-brand-500" },
];

export const STAGE_BORDER: Record<ApplicationStatus, string> = {
  wishlist: "border-l-ink-400",
  applied: "border-l-ink-400",
  interview: "border-l-warn-500",
  offer: "border-l-ok-600",
  rejected: "border-l-brand-500",
};

// Same semantics as STAGE_BORDER, as CSS color values for the sm/md
// PillTabs stage filter (BoardMobile.tsx) — Tailwind text-color utility
// class names aren't usable as inline style values.
export const STAGE_COLOR: Record<ApplicationStatus, string> = {
  wishlist: "var(--color-ink-400)",
  applied: "var(--color-ink-400)",
  interview: "var(--color-warn-500)",
  offer: "var(--color-ok-600)",
  rejected: "var(--color-brand-500)",
};

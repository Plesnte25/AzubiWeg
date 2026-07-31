import type { ChecklistCategory } from "../../api/types";

export const CATEGORIES: { key: ChecklistCategory; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "education", label: "Education" },
  { key: "visa", label: "Visa" },
  { key: "finances", label: "Finances" },
  { key: "insurance", label: "Insurance" },
  { key: "application", label: "Application" },
  { key: "after_arrival", label: "After arrival" },
  { key: "other", label: "Other" },
];

export const CATEGORY_LABEL: Record<ChecklistCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label]),
) as Record<ChecklistCategory, string>;

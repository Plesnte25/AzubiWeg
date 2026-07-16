import type { CvContent } from "../api/types";

export const BRAND_GOLD = "#d98e00";
export const INK = "#111111";
export const INK_SOFT = "#444444";

/** "2024-09" → "09/2024", "2024" stays, "2024-09-01" → "01.09.2024". */
export function formatCvDate(value?: string): string {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

export function dateRange(from: string, to: string | undefined, current: boolean, nowWord: string): string {
  const start = formatCvDate(from);
  const end = current ? nowWord : formatCvDate(to);
  if (!start && !end) return "";
  return end ? `${start} – ${end}` : start;
}

export function fullName(content: CvContent): string {
  return [content.personal.firstName, content.personal.lastName].filter(Boolean).join(" ");
}

export function contactParts(content: CvContent): string[] {
  const p = content.personal;
  return [p.street, p.postalCodeCity, p.phone, p.email, p.linkedin, p.website].filter(
    (x): x is string => Boolean(x),
  );
}

import type { CSSProperties } from "react";

/** The white question card every runner uses. */
export const questionCard: CSSProperties = {
  background: "var(--plain)",
  color: "var(--plainText)",
  border: "2.5px solid var(--line)",
  borderRadius: 24,
  boxShadow: "5px 5px 0 var(--shadow)",
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

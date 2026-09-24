import type { CSSProperties } from "react";

/** Section label inside a coloured tile or modal (AzubiJobs.dc.html): 12/700, .1em, uppercase. */
export const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };

/** Text field inside a coloured modal: 44h, 2.5px ink outline, radius 12, plain fill. */
export const fieldInput: CSSProperties = {
  height: 44,
  padding: "0 12px",
  border: "2.5px solid var(--line)",
  borderRadius: 12,
  background: "var(--plain)",
  color: "var(--plainText)",
  fontSize: 15,
  fontWeight: 600,
  boxSizing: "border-box",
  minWidth: 0,
};

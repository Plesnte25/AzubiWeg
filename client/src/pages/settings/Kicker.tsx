import type { ReactNode } from "react";

/** Uppercase tile kicker with its Phosphor icon (12px/700, .1em tracking). */
export function Kicker({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center" style={{ gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
      {icon}
      {children}
    </span>
  );
}

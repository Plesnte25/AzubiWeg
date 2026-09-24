import type { ReactNode } from "react";

/** Bento empty state (README §1.6): a dashed 2.5px box with short copy and an optional action. Inherits text colour
 * from its tile. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center"
      style={{
        border: "2.5px dashed currentColor",
        borderRadius: 16,
        padding: "18px 14px",
        fontSize: 14,
        fontWeight: 600,
        opacity: 0.85,
      }}
    >
      <div>{children}</div>
      {action}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** CSS-only hover/focus tooltip — replaces the browser-native `title="..."`
 * attribute (no styling control, ~1s delay, doesn't work on focus) used on
 * icon-only buttons throughout the app. 150ms delay on appear so it doesn't
 * flash on a quick mouse pass-through; instant on focus (keyboard users
 * shouldn't wait). Reason text for a disabled control still needs a real
 * `title`/aria-describedby elsewhere — this is presentation only. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-micro text-white opacity-0 shadow-md",
          "transition-opacity delay-150 duration-150 group-hover:opacity-100 group-hover:delay-150 group-focus-within:opacity-100 group-focus-within:delay-0",
          side === "top" ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2" : "top-full left-1/2 mt-1.5 -translate-x-1/2",
        )}
      >
        {content}
      </span>
    </span>
  );
}

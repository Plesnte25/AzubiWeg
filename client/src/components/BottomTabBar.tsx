import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/cn";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";

// matches FabNav's own long-press threshold, so the gesture reads the same
// whether the hub or the Dashboard tab is what you're pressing
const LONG_PRESS_MS = 500;

/** sm-only: 5 equal-width tabs fixed to the viewport bottom. Long-press the
 * Dashboard tab to open the account sheet — mirrors FabNav's tap-vs-long-
 * press pattern at lg, since neither the tab bar nor the icon rail (md) has
 * room for a 6th destination. */
export default function BottomTabBar({ onOpenAccount }: { onOpenAccount: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onHomePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    clearTimer();
    longPressTimer.current = setTimeout(() => {
      suppressClickRef.current = true;
      onOpenAccount();
    }, LONG_PRESS_MS);
  };

  const onHomeClick = (to: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    navigate(to);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 border-t border-hairline bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {NAV_DESTINATIONS.map((dest) => {
        const active = isActivePath(dest.to, dest.end, location.pathname);
        const Icon = dest.icon;
        const isHome = dest.end === true;
        return (
          <button
            key={dest.to}
            type="button"
            aria-label={dest.label}
            aria-current={active ? "page" : undefined}
            onPointerDown={isHome ? onHomePointerDown : undefined}
            onPointerUp={isHome ? clearTimer : undefined}
            onPointerLeave={isHome ? clearTimer : undefined}
            onPointerCancel={isHome ? clearTimer : undefined}
            onClick={() => (isHome ? onHomeClick(dest.to) : navigate(dest.to))}
            className={cn(
              "flex flex-1 touch-none flex-col items-center justify-center gap-1",
              active ? "text-brand-500" : "text-ink-300",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            <span className="text-[9px] font-medium leading-none">{dest.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

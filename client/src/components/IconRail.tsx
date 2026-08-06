import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/cn";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";

// matches FabNav's own long-press threshold — see BottomTabBar's identical constant
const LONG_PRESS_MS = 500;

/** md-only: the same 5 destinations as lg's FabNav, icon-only in a fixed
 * left rail (no radial menu at md — that's an lg-only affordance). Long-
 * press the Dashboard icon to open the account sheet, same as BottomTabBar. */
export default function IconRail({ onOpenAccount }: { onOpenAccount: () => void }) {
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
      className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center gap-2 border-r border-hairline bg-card py-4 md:flex lg:hidden"
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
              "grid size-11 touch-none place-items-center rounded-xl",
              active ? "bg-brand-50 text-brand-600" : "text-ink-300 hover:bg-paper hover:text-ink-600",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}

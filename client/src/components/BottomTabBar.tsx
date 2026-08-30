import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "../lib/cn";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";
import { useNavStack } from "../lib/navStack";

// Long-press the Today tab to reach Settings/sign-out until Phase 17 builds
// the real Profile sheet the handoff puts behind the avatar on Today.
const LONG_PRESS_MS = 500;

/**
 * The 5-tab bottom bar, rendered at every breakpoint per the plan (desktop/
 * lg nav is deferred to Phase 18) — replaces the old FabNav (lg)/IconRail
 * (md)/BottomTabBar (sm) three-component split with one shared surface.
 * Styling ported exactly from the handoff's tabStyle()/tabBarStyle
 * (German Companion App.dc.html): flex-column icon-over-label, 21px
 * Phosphor icons, 8.5px uppercase-tracked labels, active = accent, inactive
 * = muted text, hairline-soft top border.
 */
export default function BottomTabBar({ onOpenAccount }: { onOpenAccount: () => void }) {
  const location = useLocation();
  const { switchTab } = useNavStack();
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
    switchTab(to);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-hairline-soft bg-paper px-0.5 pt-2.5 pb-[calc(30px+env(safe-area-inset-bottom))]"
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
            onClick={() => (isHome ? onHomeClick(dest.to) : switchTab(dest.to))}
            className={cn(
              "flex flex-1 touch-none flex-col items-center gap-1 border-0 bg-transparent",
              active ? "text-brand-500" : "text-ink-400",
            )}
          >
            <Icon size={21} weight="regular" aria-hidden="true" />
            <span className="text-[8.5px] leading-none font-medium tracking-[.06em] uppercase">{dest.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

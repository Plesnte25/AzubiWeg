import { useLocation } from "react-router-dom";
import { cn } from "../lib/cn";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";
import { useNavStack } from "../lib/navStack";

/**
 * The bottom bar, rendered at every breakpoint below lg (Rail replaces it at
 * lg+) — replaces the old FabNav (lg)/IconRail (md)/BottomTabBar (sm)
 * three-component split with one shared surface. Styling ported exactly
 * from the handoff's tabStyle()/tabBarStyle (German Companion App.dc.html):
 * flex-column icon-over-label, 21px Phosphor icons, 8.5px uppercase-tracked
 * labels, active = accent, inactive = muted text, hairline-soft top border.
 *
 * Now 6 items (Nocturne v2: Notes promoted to a real top-level destination,
 * see navDestinations.ts), not 5 — a deliberate, cited deviation from the
 * ui-ux-pro-max skill's own `bottom-nav-limit` guidance (max 5 items).
 * Re-measured (Playwright, 390px width) after the 6th item landed: each
 * flex-1 button renders 64px wide (comfortably clear of the 44pt minimum)
 * but only 36px tall with 0px gap between buttons — both under the
 * 44x44pt/8px minimums. That's true at 5 items too (height/gap come from
 * padding, not item count), so it isn't a regression from adding Notes,
 * but it's now logged — see docs/KNOWN_ISSUES.md — rather than silently
 * assumed fine.
 */
export default function BottomTabBar() {
  const location = useLocation();
  const { switchTab } = useNavStack();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-hairline-soft bg-paper px-0.5 pt-2.5 pb-[calc(30px+env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      {NAV_DESTINATIONS.map((dest) => {
        const active = isActivePath(dest.to, dest.end, location.pathname);
        const Icon = dest.icon;
        return (
          <button
            key={dest.to}
            type="button"
            aria-label={dest.label}
            aria-current={active ? "page" : undefined}
            onClick={() => switchTab(dest.to)}
            className={cn("flex flex-1 flex-col items-center gap-1 rounded-[10px] border-0 bg-transparent transition-colors hover:bg-white/5", active ? "text-brand-500" : "text-ink-600")}
          >
            <Icon size={21} weight="regular" aria-hidden="true" />
            <span className="text-micro leading-none font-medium tracking-[.06em] uppercase">{dest.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

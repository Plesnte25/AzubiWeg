import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import { NavStackProvider } from "../lib/navStack";
import AccountSheet from "./AccountSheet";
import BottomTabBar from "./BottomTabBar";
import CaptureFab from "./CaptureFab";
import DemoBanner from "./DemoBanner";

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const [accountOpen, setAccountOpen] = useState(false);

  useActivityHeartbeat();

  return (
    <NavStackProvider>
      <div className="min-h-screen">
        {/* the dashboard needs the full content width (and a fixed-height grid
            at lg+) to fit proportionally without scrolling; every other page
            keeps the centered reading-width layout — carried over as-is from
            the pre-Nocturne layout. pb clears the 5-tab bottom bar, which now
            renders at every breakpoint (desktop/lg nav is its own pass,
            Phase 18 — the mobile bar is what every screen gets for now). */}
        <DemoBanner />

        <main
          className={cn(
            "pb-[calc(88px+env(safe-area-inset-bottom))]",
            isDashboard ? "px-4 py-4 lg:h-dvh lg:min-h-[760px] lg:py-3" : "mx-auto max-w-6xl px-4 py-6",
          )}
        >
          <Outlet />
        </main>

        <BottomTabBar onOpenAccount={() => setAccountOpen(true)} />
        <CaptureFab />
        {/* Settings/sign-out have no home in the new 5-tab nav yet — Phase 17
            builds the real Profile sheet (behind Today's avatar, per the
            handoff). Kept reachable in the meantime via the same long-press-
            Today gesture the old nav used, rather than removing access to
            Settings/sign-out entirely for several phases. */}
        <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      </div>
    </NavStackProvider>
  );
}

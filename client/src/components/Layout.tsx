import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import { isTransientPath, NavStackProvider } from "../lib/navStack";
import BottomTabBar from "./BottomTabBar";
import CaptureFab from "./CaptureFab";
import { CommandPalette } from "./CommandPalette";
import DemoBanner from "./DemoBanner";
import { DesktopSidebar } from "./DesktopSidebar";

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  // Transient screens (the review session so far) own the whole viewport
  // distraction-free, same as the handoff — no tab bar/FAB/sidebar to tap
  // away through mid-session, and no reserved padding for chrome that
  // isn't there.
  const isTransient = isTransientPath(location.pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useActivityHeartbeat();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <NavStackProvider>
      <div className="min-h-screen">
        {/* the dashboard needs the full content width (and a fixed-height grid
            at lg+) to fit proportionally without scrolling; every other page
            keeps the centered reading-width layout — carried over as-is from
            the pre-Nocturne layout. pb clears the 5-tab bottom bar (mobile);
            at lg the bottom bar is replaced by DesktopSidebar (fixed, 232px),
            so main gets left padding to clear it instead. */}
        <DemoBanner />

        {!isTransient && <DesktopSidebar onOpenPalette={() => setPaletteOpen(true)} />}

        <main
          className={cn(
            !isTransient && "pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-[232px]",
            isDashboard ? "px-4 py-4 lg:h-dvh lg:min-h-[760px] lg:py-3" : "mx-auto max-w-6xl px-4 py-6",
          )}
        >
          <Outlet />
        </main>

        {!isTransient && (
          <>
            <div className="lg:hidden">
              <BottomTabBar />
            </div>
            <CaptureFab />
          </>
        )}

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </NavStackProvider>
  );
}

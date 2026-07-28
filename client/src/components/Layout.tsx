import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  useActivityHeartbeat();

  // close the mobile sidebar on navigation
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="md:pl-[76px]">
        {/* the sidebar owns theme/notifications/account on desktop; mobile
            still needs a way to open it since it's hidden off-canvas there */}
        <div className="sticky top-0 z-30 flex h-12 items-center border-b border-hairline bg-card/80 px-4 backdrop-blur-md dark:bg-card/70 md:hidden">
          <button
            className="grid size-9 place-items-center rounded-full text-ink-600 hover:bg-paper"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
        {/* the dashboard needs the full content width (and a fixed-height
            grid at lg+) to fit proportionally without scrolling; every other
            page keeps the centered reading-width layout */}
        <main
          className={cn(
            isDashboard ? "px-4 py-4 lg:h-dvh lg:min-h-[760px] lg:py-3" : "mx-auto max-w-6xl px-4 py-6",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import AccountSheet from "./AccountSheet";
import BottomTabBar from "./BottomTabBar";
import FabNav from "./FabNav";
import IconRail from "./IconRail";

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const [accountOpen, setAccountOpen] = useState(false);

  useActivityHeartbeat();

  return (
    <div className="min-h-screen">
      {/* the dashboard needs the full content width (and a fixed-height grid
          at lg+) to fit proportionally without scrolling; every other page
          keeps the centered reading-width layout — both unrelated to the
          sidebar removal, carried over as-is. pb-16 clears BottomTabBar
          (sm); md:pl-[72px] clears IconRail (md); both drop out at lg,
          where FabNav floats over content instead of reserving space. */}
      <main
        className={cn(
          "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[72px] lg:pl-0",
          isDashboard ? "px-4 py-4 lg:h-dvh lg:min-h-[760px] lg:py-3" : "mx-auto max-w-6xl px-4 py-6",
        )}
      >
        <Outlet />
      </main>

      <BottomTabBar onOpenAccount={() => setAccountOpen(true)} />
      <IconRail onOpenAccount={() => setAccountOpen(true)} />
      <div className="hidden lg:block">
        <FabNav />
      </div>
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}

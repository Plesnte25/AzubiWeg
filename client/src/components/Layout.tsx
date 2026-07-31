import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import FabNav from "./FabNav";

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  useActivityHeartbeat();

  return (
    <div className="min-h-screen">
      {/* the dashboard needs the full content width (and a fixed-height grid
          at lg+) to fit proportionally without scrolling; every other page
          keeps the centered reading-width layout — both unrelated to the
          sidebar removal, carried over as-is */}
      <main className={cn(isDashboard ? "px-4 py-4 lg:h-dvh lg:min-h-[760px] lg:py-3" : "mx-auto max-w-6xl px-4 py-6")}>
        <Outlet />
      </main>
      <FabNav />
    </div>
  );
}

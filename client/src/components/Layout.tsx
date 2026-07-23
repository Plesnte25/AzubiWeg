import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import Sidebar from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "azubiweg-sidebar";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useActivityHeartbeat();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  // close the mobile sidebar on navigation
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={collapsed ? "md:pl-[76px]" : "md:pl-60"}>
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
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

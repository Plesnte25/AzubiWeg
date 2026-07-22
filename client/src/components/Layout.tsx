import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, clearSession, getUser } from "../api/client";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";

const tabs = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/vocabulary", label: "Vocabulary" },
  { to: "/review", label: "Review" },
  { to: "/learning", label: "Learning Hub" },
  { to: "/cv", label: "CV" },
  { to: "/applications", label: "Applications" },
  { to: "/checklist", label: "Checklist" },
];

/** Closes the dropdown when clicking anywhere outside of it. */
function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 60_000,
  });
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative grid size-9 place-items-center rounded-full text-ink-600 hover:bg-paper hover:text-ink-900"
        title="Notifications"
        aria-label={`Notifications (${notifications.length})`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.86 17.08a24 24 0 0 0 5.45-1.31A8.97 8.97 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75a8.97 8.97 0 0 1-2.31 6.02c1.73.64 3.56 1.09 5.45 1.31m5.72 0a24.3 24.3 0 0 1-5.72 0m5.72 0a3 3 0 1 1-5.72 0"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-4 text-white">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-hairline bg-card shadow-lg">
          <p className="border-b border-hairline px-4 py-2.5 text-sm font-semibold">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">
              All caught up — nothing needs your attention ✨
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-hairline overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    className="w-full px-4 py-3 text-left hover:bg-paper"
                    onClick={() => {
                      setOpen(false);
                      navigate(n.href);
                    }}
                  >
                    <span className="flex items-start gap-2.5">
                      <span className="mt-0.5">
                        {n.type === "portal" ? "🔗" : n.type === "application" ? "📨" : "📄"}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.title}</span>
                        <span className="block text-xs text-ink-600">{n.detail}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const user = getUser();
  const initial = (user?.name?.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        className="grid size-9 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-brand-400 transition-shadow hover:ring-2 hover:ring-brand-200"
        title={user?.name}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-hairline bg-card shadow-lg">
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
          <button
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            ⚙️ Settings
          </button>
          <button
            className="block w-full border-t border-hairline px-4 py-2.5 text-left text-sm text-danger-600 hover:bg-danger-50"
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useActivityHeartbeat();

  // close the mobile menu on navigation
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-hairline bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-ink-900 text-xs font-bold text-brand-400">
              AW
            </span>
            <span className="hidden sm:inline">AzubiWeg</span>
          </NavLink>

          {/* full nav from md up — compact labels, no horizontal scrolling */}
          <nav className="hidden min-w-0 flex-1 justify-center md:flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper hover:text-ink-900"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <NotificationBell />
            <UserMenu />
            {/* hamburger below md */}
            <button
              className="grid size-9 place-items-center rounded-full text-ink-600 hover:bg-paper md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-hairline bg-card px-4 py-2 md:hidden">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

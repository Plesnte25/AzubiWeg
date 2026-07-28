import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Link2,
  ListChecks,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { api, clearSession, getUser } from "../api/client";
import { cn } from "../lib/cn";
import ThemeToggle from "./ThemeToggle";

const tabs = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { to: "/review", label: "Review", icon: RotateCcw },
  { to: "/learning", label: "Learning Hub", icon: GraduationCap },
  { to: "/cv", label: "CV", icon: FileText },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
];

const NOTIFICATION_ICON = { portal: Link2, application: Send, document: FileText } as const;

/** Small floating label shown on hover, matching the app's existing
 * chart-tooltip visual convention — replaces the old whole-rail hover-expand. */
function HoverTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs font-medium text-ink-900 opacity-0 shadow-md transition-opacity delay-100 group-hover:opacity-100">
      {label}
    </span>
  );
}

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

function NotificationBell({ showExpanded }: { showExpanded: boolean }) {
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
    <div className="group relative" ref={ref}>
      <button
        className={cn(
          "relative grid size-9 place-items-center rounded-full text-ink-600 hover:bg-paper hover:text-ink-900",
          !showExpanded && "mx-auto",
        )}
        aria-label={`Notifications (${notifications.length})`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-5" aria-hidden="true" />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-danger-solid)] px-1 text-[10px] font-bold leading-4 text-white">
            {notifications.length}
          </span>
        )}
      </button>
      {!showExpanded && !open && <HoverTooltip label="Notifications" />}
      {open && (
        <div className="animate-scale-in absolute bottom-0 left-full z-50 ml-2 w-80 origin-bottom-left overflow-hidden rounded-xl border border-hairline bg-card shadow-lg">
          <p className="border-b border-hairline px-4 py-2.5 text-sm font-semibold">Notifications</p>
          {notifications.length === 0 ? (
            <p className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-sm text-ink-400">
              <Sparkles className="size-4" aria-hidden="true" />
              All caught up — nothing needs your attention
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-hairline overflow-y-auto">
              {notifications.map((n) => {
                const Icon = NOTIFICATION_ICON[n.type];
                return (
                  <li key={n.id}>
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-paper"
                      onClick={() => {
                        setOpen(false);
                        navigate(n.href);
                      }}
                    >
                      <span className="flex items-start gap-2.5">
                        <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{n.title}</span>
                          <span className="block text-xs text-ink-600">{n.detail}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu({ showExpanded }: { showExpanded: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const user = getUser();
  const initial = (user?.name?.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="group relative" ref={ref}>
      <button
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left hover:bg-paper",
          showExpanded ? "px-2" : "justify-center px-0",
        )}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white dark:bg-brand-500">
          {initial}
        </span>
        {showExpanded && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user?.name}</span>
            <span className="block truncate text-xs text-ink-400">{user?.email}</span>
          </span>
        )}
      </button>
      {!showExpanded && !open && <HoverTooltip label={user?.name ?? "Account"} />}
      {open && (
        <div className="animate-scale-in absolute bottom-0 left-full z-50 ml-2 w-56 origin-bottom-left overflow-hidden rounded-xl border border-hairline bg-card shadow-lg">
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-paper"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <SettingsIcon className="size-4" aria-hidden="true" />
            Settings
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

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/** Always rail-width on desktop — no collapse/expand toggle, no hover-expand.
 * Hovering a nav item shows a small floating label instead. Mobile still
 * opens as a full off-canvas sidebar via the hamburger menu, unrelated to
 * this desktop behavior. */
export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const showExpanded = mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/40 md:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-hairline bg-card transition-transform duration-200",
          showExpanded ? "w-60" : "w-[76px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
              AW
            </span>
            {showExpanded && <span>AzubiWeg</span>}
          </NavLink>
        </div>

        {/* no overflow-y here (unlike before) — with only 7 tabs it never needs
            to scroll, and clipping either axis would also clip the hover
            tooltips that now render outside each item's own box */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {tabs.map((t) => (
            <div key={t.to} className="group relative">
              <NavLink
                to={t.to}
                end={t.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    !showExpanded && "justify-center px-0",
                    isActive
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                      : "text-ink-600 hover:bg-paper hover:text-ink-900",
                  )
                }
              >
                <t.icon className="size-5 shrink-0" aria-hidden="true" />
                {showExpanded && t.label}
              </NavLink>
              {!showExpanded && <HoverTooltip label={t.label} />}
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 space-y-1 border-t border-hairline p-3", !showExpanded && "flex flex-col items-center")}>
          <div className={cn("flex items-center", showExpanded ? "justify-between" : "flex-col gap-1")}>
            <ThemeToggle />
            <NotificationBell showExpanded={showExpanded} />
          </div>
          <UserMenu showExpanded={showExpanded} />
        </div>
      </aside>
    </>
  );
}

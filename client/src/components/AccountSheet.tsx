import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Settings as SettingsIcon, Sparkles, Sun } from "lucide-react";
import { clearSession } from "../api/client";
import { NOTIFICATION_ICON, useNotifications } from "../hooks/useNotifications";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/cn";

/** Opened by long-pressing the Dashboard tab/icon on sm (BottomTabBar) or md
 * (IconRail) — the sm/md equivalent of FabNav's account arc at lg: theme,
 * notifications, Settings, sign out. Bottom sheet on sm, small popover
 * anchored near the rail on md (same sm=sheet/md=popover split every other
 * modal on this project uses). */
export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";
  const notifications = useNotifications();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-ink-900/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account menu"
        className={cn(
          "animate-slide-up fixed inset-x-0 bottom-0 rounded-t-2xl border-t border-hairline bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-xl",
          "md:inset-x-auto md:bottom-4 md:left-[84px] md:w-72 md:animate-scale-in md:rounded-2xl md:border md:pb-4",
        )}
      >
        <div className="mb-2 h-1 w-10 self-center rounded-full bg-hairline md:hidden" />

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-paper"
        >
          {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </button>

        <button
          type="button"
          onClick={() => go("/settings")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-paper"
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
          Settings
        </button>

        <div className="my-2 border-t border-hairline" />

        <p className="px-2 pb-1.5 text-xs font-semibold text-ink-400">
          Notifications{notifications.length > 0 ? ` (${notifications.length})` : ""}
        </p>
        {notifications.length === 0 ? (
          <p className="flex items-center gap-1.5 px-2 py-2 text-sm text-ink-400">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            All caught up — nothing needs your attention
          </p>
        ) : (
          <ul className="max-h-48 divide-y divide-hairline overflow-y-auto">
            {notifications.map((n) => {
              const Icon = NOTIFICATION_ICON[n.type];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2.5 px-2 py-2 text-left hover:bg-paper"
                    onClick={() => go(n.href)}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-xs text-ink-600">{n.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="my-2 border-t border-hairline" />

        <button
          type="button"
          onClick={() => {
            onClose();
            clearSession();
            navigate("/login");
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm text-danger-600 hover:bg-danger-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>,
    document.body,
  );
}

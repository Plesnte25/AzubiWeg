import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { clearSession } from "../api/client";
import { cn } from "../lib/cn";

/** Opened by long-pressing the Dashboard tab/icon on sm (BottomTabBar) or md
 * (IconRail) — the sm/md equivalent of FabNav's account arc at lg: Settings,
 * sign out. Bottom sheet on sm, small popover anchored near the rail on md
 * (same sm=sheet/md=popover split every other modal on this project uses). */
export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

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
          "animate-slide-up fixed inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-lg",
          "md:inset-x-auto md:bottom-4 md:left-[84px] md:w-72 md:animate-scale-in md:rounded-xl md:border md:pb-4",
        )}
      >
        <div className="mb-2 h-1 w-10 self-center rounded-full bg-hairline md:hidden" />

        <button
          type="button"
          onClick={() => go("/settings")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body hover:bg-paper"
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
          Settings
        </button>

        <div className="my-2 border-t border-hairline" />

        <button
          type="button"
          onClick={() => {
            onClose();
            clearSession();
            navigate("/login");
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body text-danger-600 hover:bg-danger-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>,
    document.body,
  );
}

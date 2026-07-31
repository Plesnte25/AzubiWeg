import { useEffect, useRef, useState } from "react";
import type {
  ComponentType,
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Moon,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  UserCog,
} from "lucide-react";
import { api, clearSession } from "../api/client";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/cn";
import { useClickOutside } from "../lib/useClickOutside";

const NAV_TABS: { to: string; label: string; end?: boolean; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { to: "/learning", label: "Learning Hub", icon: GraduationCap },
  { to: "/job-search", label: "Job Search", icon: Briefcase },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
];

const NOTIFICATION_ICON = { portal: Link2, application: Send, document: FileText } as const;

type PopMode = "closed" | "nav" | "account";

const HUB_SIZE = 60;
const NAV_RADIUS = 116;
const ACCOUNT_RADIUS = 96;
const LONG_PRESS_MS = 500;
const RETRACT_MS = 220;

const GOO_COLOR_DEFAULT = "bg-gradient-to-br from-[var(--color-surface-dark-1)] to-[var(--color-surface-dark-3)]";
const GOO_COLOR_ALERT = "bg-gradient-to-br from-brand-500 to-brand-700";

interface ArcItemDef {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  onSelect: () => void;
}

function isActivePath(to: string, end: boolean | undefined, pathname: string) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Position an item's center point relative to the hub's own open-state
 * center: an N-item arc swept across `sweepDeg`, centered on straight-up. */
function arcPosition(index: number, count: number, radius: number, sweepDeg: number) {
  const startAngle = 90 + sweepDeg / 2;
  const step = count > 1 ? sweepDeg / (count - 1) : 0;
  const angleRad = ((startAngle - step * index) * Math.PI) / 180;
  return {
    left: Math.round(radius * Math.cos(angleRad)),
    bottom: Math.round(HUB_SIZE / 2 + radius * Math.sin(angleRad)),
  };
}

function ArcButton({
  index,
  left,
  bottom,
  visible,
  item,
}: {
  index: number;
  left: number;
  bottom: number;
  visible: boolean;
  item: ArcItemDef;
}) {
  const Icon = item.icon;
  // always carry a baseline transform (never omit it) — relying solely on
  // the animation class to supply `transform` leaves a one-frame gap between
  // the class attaching and the browser actually computing its keyframe
  // value, during which the element has NO transform and collapses away
  // from its self-centered position; that gap is what caused a spurious
  // mouseleave on the hub in testing (see the identical fix on the hub below)
  const style: CSSProperties = {
    left,
    bottom,
    transform: visible ? "translate(-50%, 50%) scale(1)" : "translate(-50%, 50%) scale(0.4)",
    opacity: visible ? 1 : 0,
    ...(visible ? { animationDelay: `${180 + index * 28}ms` } : {}),
  };
  return (
    <button
      type="button"
      aria-label={item.label}
      title={item.label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={item.onSelect}
      className={cn(
        "absolute grid size-11 place-items-center rounded-full border border-hairline shadow-md",
        item.active ? "bg-brand-600 text-white" : "bg-card text-ink-600 hover:bg-paper hover:text-ink-900",
        visible ? "animate-fab-item-in" : "pointer-events-none",
      )}
      style={style}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Decorative-only goo shape: no content, no pointer events — the content
 * layer's real button sits on top of it at the same coordinates. */
function GooShape({
  left,
  bottom,
  dx,
  dy,
  visible,
  colorClass,
}: {
  left: number;
  bottom: number;
  dx: number;
  dy: number;
  visible: boolean;
  colorClass: string;
}) {
  const style = {
    left,
    bottom,
    "--dx": `${dx}px`,
    "--dy": `${dy}px`,
    transform: visible
      ? "translate(-50%, 50%) translate(0, 0) scale(1)"
      : `translate(-50%, 50%) translate(${dx}px, ${dy}px) scale(0.4)`,
    opacity: visible ? 1 : 0,
  } as CSSProperties;
  return (
    <div
      className={cn("absolute size-11 rounded-full", colorClass, visible ? "animate-fab-goo-emerge" : "")}
      style={style}
    />
  );
}

export default function FabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";

  const [mode, setMode] = useState<PopMode>("closed");
  const [closing, setClosing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const openedViaKeyboardRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerTypeRef = useRef<string>("mouse");
  // a tap also focuses the button (focus fires before click, per spec order
  // pointerdown -> focus -> pointerup -> click) — without this, the focus
  // handler's "open on keyboard focus" logic and the click handler's "touch
  // taps toggle" logic fight each other on every tap. True only between a
  // pointerdown and its following click.
  const pointerInteractionRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 60_000,
  });
  const notifications = data?.notifications ?? [];
  const badgeCount = notifications.length;
  const hasNotifications = badgeCount > 0;
  const gooColor = hasNotifications ? GOO_COLOR_ALERT : GOO_COLOR_DEFAULT;

  const isOpen = mode !== "closed";
  const isNav = mode === "nav";
  const isAccount = mode === "account";

  const close = () => {
    if (mode === "closed") return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setMode("closed");
      setClosing(false);
      setNotifOpen(false);
      openedViaKeyboardRef.current = false;
    }, RETRACT_MS);
  };

  const openNav = () => {
    if (mode === "closed") setMode("nav");
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // close on route change — covers item-select navigation (already closed
  // explicitly) as well as browser back/forward while the menu is open
  useEffect(() => {
    setMode("closed");
    setClosing(false);
    setNotifOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const clusterRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) close();
  });

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onHubPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    lastPointerTypeRef.current = e.pointerType;
    pointerInteractionRef.current = true;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      suppressClickRef.current = true;
      setNotifOpen(false);
      setMode((m) => (m === "account" ? "nav" : "account"));
    }, LONG_PRESS_MS);
  };

  const onHubPointerUp = () => {
    clearLongPressTimer();
  };

  const onHubPointerLeaveOrCancel = () => {
    clearLongPressTimer();
  };

  // cluster-level hover: mouseenter/leave fire on DOM containment, not
  // visual bounding box, so moving from the hub toward an item (both
  // descendants of the same cluster wrapper) never trips a leave — only
  // truly exiting the whole cluster does
  const onClusterMouseEnter = () => openNav();
  const onClusterMouseLeave = () => {
    if (isOpen) close();
  };

  const onHubFocus = () => {
    // a tap or mouse click also focuses the button — that's not a keyboard
    // Tab, so it shouldn't trigger the keyboard-open behavior (the click
    // handler already decides what a pointer-driven activation does)
    if (pointerInteractionRef.current) return;
    if (mode === "closed") {
      openedViaKeyboardRef.current = true;
      setMode("nav");
    }
  };

  // parallels the mouseleave fix above, for keyboard users tabbing through
  // the arc: only close once focus lands outside the whole cluster
  const onClusterBlurCapture = (e: ReactFocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !clusterRef.current?.contains(next)) {
      if (isOpen) close();
    }
  };

  const onHubClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    pointerInteractionRef.current = false;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (e.detail === 0) {
      // keyboard Enter/Space
      navigate("/");
      return;
    }
    if (lastPointerTypeRef.current === "touch") {
      // touch has no hover phase — tapping the hub is how touch users open
      // the arc at all, so it can't double as a "go home" shortcut
      if (mode === "closed") setMode("nav");
      else close();
      return;
    }
    navigate("/");
  };

  const selectRoute = (to: string) => {
    close();
    navigate(to);
  };

  const navItems: ArcItemDef[] = [
    ...NAV_TABS.map((t) => ({
      key: t.to,
      label: t.label,
      icon: t.icon,
      active: isActivePath(t.to, t.end, location.pathname),
      onSelect: () => selectRoute(t.to),
    })),
    {
      key: "notifications",
      label: `Notifications${badgeCount > 0 ? ` (${badgeCount})` : ""}`,
      icon: Bell,
      active: notifOpen,
      onSelect: () => setNotifOpen((v) => !v),
    },
    ...(openedViaKeyboardRef.current
      ? [
          {
            key: "account",
            label: "Account menu",
            icon: UserCog,
            onSelect: () => setMode("account"),
          },
        ]
      : []),
  ];

  const accountItems: ArcItemDef[] = [
    {
      key: "theme",
      label: isDark ? "Switch to light mode" : "Switch to dark mode",
      icon: isDark ? Sun : Moon,
      onSelect: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      key: "settings",
      label: "Settings",
      icon: SettingsIcon,
      onSelect: () => selectRoute("/settings"),
    },
    {
      key: "signout",
      label: "Sign out",
      icon: LogOut,
      onSelect: () => {
        close();
        clearSession();
        navigate("/login");
      },
    },
  ];

  const activeItems = isAccount ? accountItems : navItems;
  const radius = isAccount ? ACCOUNT_RADIUS : NAV_RADIUS;
  const sweep = isAccount ? 100 : 180;
  const itemsVisible = isOpen && !closing;

  // always carry a baseline transform matching whichever pose we're
  // nominally in (never omit it) — see the identical comment on ArcButton
  // above; without this, the one-frame gap between the animation class
  // attaching and the browser computing its keyframe value let the hub's
  // box collapse away from its self-centered position, which was firing a
  // spurious mouseleave the instant the arc opened
  const hubStyle: CSSProperties = {
    left: 0,
    bottom: 0,
    transform: mode === "closed" && !closing ? "translate(-50%, 50%) scale(1)" : "translate(-50%, 0%) scale(1)",
  };
  const hubAnimClass = closing ? "animate-fab-retract" : isOpen ? "animate-fab-pop" : "animate-fab-wobble";

  // must reach all the way down to the cluster's own baseline (bottom: 0,
  // matching the hub) and be wide/tall enough to cover every straight-line
  // path from the hub to an item — any gap here is a real dead zone where
  // neither this panel nor a button covers the cursor, which spuriously
  // closes the arc via the hover-region handlers above (verified in testing)
  const backdropWidth = radius * 2 + 90;
  const backdropHeight = HUB_SIZE / 2 + radius + 40;

  return (
    <div
      ref={clusterRef}
      onMouseEnter={onClusterMouseEnter}
      onMouseLeave={onClusterMouseLeave}
      onBlurCapture={onClusterBlurCapture}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-0"
    >
      {/* localized blur behind the arc — also doubles as the hover-continuity
          surface between the hub and items (see the cluster-level handlers
          above), so it stays pointer-events-auto rather than purely
          decorative */}
      <div
        className={cn(
          "pointer-events-auto absolute rounded-t-full border border-hairline/40 bg-card/40 backdrop-blur-md transition-opacity duration-200 dark:bg-card/30",
          itemsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          left: "50%",
          bottom: 0,
          width: backdropWidth,
          height: backdropHeight,
          transform: "translateX(-50%)",
        }}
      />

      {/* goo layer: filtered, decorative-only shapes that sell the melt-
          together/pinch-apart metaball look. Must contain ONLY these shapes
          — `filter` on an ancestor becomes a containing block for `position:
          fixed` descendants, which would break the notifications popover's
          fixed centering below if it were nested in here instead. */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2"
        style={{ filter: "url(#fabnav-goo)" }}
      >
        {activeItems.map((item, index) => {
          const { left, bottom } = arcPosition(index, activeItems.length, radius, sweep);
          return (
            <GooShape
              key={item.key}
              left={left}
              bottom={bottom}
              dx={-left}
              dy={bottom - HUB_SIZE / 2}
              visible={itemsVisible}
              colorClass={gooColor}
            />
          );
        })}
        <div className={cn("absolute size-[60px]", gooColor, hubAnimClass)} style={hubStyle} />
      </div>

      {/* content layer: real interactive buttons, unfiltered so icon glyphs
          and the AW mark stay crisp */}
      <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2">
        {activeItems.map((item, index) => {
          const { left, bottom } = arcPosition(index, activeItems.length, radius, sweep);
          return (
            <div key={item.key} className="pointer-events-auto">
              <ArcButton index={index} left={left} bottom={bottom} visible={itemsVisible} item={item} />
            </div>
          );
        })}

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onPointerDown={onHubPointerDown}
          onPointerUp={onHubPointerUp}
          onPointerLeave={onHubPointerLeaveOrCancel}
          onPointerCancel={onHubPointerLeaveOrCancel}
          onClick={onHubClick}
          onFocus={onHubFocus}
          className="pointer-events-auto absolute grid size-[60px] touch-none place-items-center rounded-full"
          style={hubStyle}
        >
          <span
            className={cn(
              "text-sm font-bold tracking-tight text-white transition-opacity duration-150",
              isOpen ? "opacity-100 delay-150" : "opacity-0",
            )}
          >
            AW
          </span>
        </button>
      </div>

      {notifOpen && isNav && (
        <div className="animate-scale-in pointer-events-auto fixed inset-x-0 bottom-[220px] z-50 mx-auto w-80 origin-bottom overflow-hidden rounded-xl border border-hairline bg-card shadow-lg">
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
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-paper"
                      onClick={() => {
                        close();
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

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="fabnav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

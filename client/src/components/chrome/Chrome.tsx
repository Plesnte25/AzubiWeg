import { useState, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/cn";
import { isActivePath, NAV_DESTINATIONS } from "../../lib/navDestinations";
import { useNavStack } from "../../lib/navStack";
import { ProfileSheet } from "../ProfileSheet";
import { ThemeToggle } from "./ThemeToggle";
import { useProfileSummary } from "./useProfileSummary";

/*
 * Bento app chrome (handoff README §1.5), rendered once by Layout.tsx rather than as row 1 of every page grid the
 * way the prototypes do it — same pixels, one implementation. lg/md: the floating TopNav pill. sm: a sticky
 * SmTopBar plus a sticky SmBottomNav, with page content scrolling between them.
 */

const PILL = {
  background: "var(--plain)",
  color: "var(--plainText)",
  border: "2.5px solid var(--line)",
  borderRadius: 999,
  boxSizing: "border-box",
} as const;

/** "Az" logo tile: 40px radius 12 + 3px shadow on md+, 34px radius 10 without shadow on sm; both rotated −8°. */
function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" style={{ gap: small ? 8 : 10 }}>
      <div
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{
          width: small ? 34 : 40,
          height: small ? 34 : 40,
          borderRadius: small ? 10 : 12,
          background: "var(--lemon)",
          color: "var(--onTile)",
          border: "2.5px solid var(--line)",
          boxShadow: small ? "none" : "3px 3px 0 var(--shadow)",
          transform: "rotate(-8deg)",
          fontWeight: 700,
          fontSize: small ? 14 : 17,
          letterSpacing: small ? undefined : "-.04em",
          boxSizing: "border-box",
        }}
      >
        Az
      </div>
      <span style={{ fontWeight: 700, fontSize: small ? 18 : 21, letterSpacing: "-.03em" }}>AzubiWeg</span>
    </div>
  );
}

/** Pink initials avatar that opens ProfileSheet (Settings / Logout). */
function AvatarButton({ small = false, withName = false }: { small?: boolean; withName?: boolean }) {
  const profile = useProfileSummary();
  const [open, setOpen] = useState(false);
  const size = small ? 36 : 38;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Profile — ${profile.name ?? "you"}`}
        className="flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
        style={{ color: "inherit" }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--pink)",
            color: "var(--onTile)",
            border: "2.5px solid var(--line)",
            fontWeight: 700,
            fontSize: small ? 13 : 14,
            boxSizing: "border-box",
          }}
        >
          {profile.initials}
        </span>
        {withName && (
          <span className="hidden flex-col blg:flex" style={{ lineHeight: 1.15 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{profile.shortName}</span>
            <span style={{ fontSize: 12, color: "var(--plainMuted)" }}>
              {profile.activeLevel.toUpperCase()}
              {profile.dayNumber !== null ? ` · Day ${profile.dayNumber}` : ""}
            </span>
          </span>
        )}
      </button>
      <ProfileSheet
        open={open}
        onClose={() => setOpen(false)}
        name={profile.name}
        email={profile.email}
        level={profile.activeLevel}
        dayNumber={profile.dayNumber}
        streak={profile.streak}
      />
    </>
  );
}

/** The six nav items. lg shows every label; md and sm (`sm`) show the label on the active item only. */
function NavItems({ sm = false }: { sm?: boolean }) {
  const { pathname } = useLocation();
  const { switchTab } = useNavStack();

  const onClick = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    // Plain left-click goes through the nav stack (tabs reset it); modified clicks keep native link behaviour.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    switchTab(to);
  };

  return (
    <div className={cn("flex flex-1 items-center", sm ? "justify-between" : "justify-center gap-1 blg:gap-1.5")}>
      {NAV_DESTINATIONS.map((dest) => {
        const active = isActivePath(dest.to, dest.end, pathname);
        const Icon = dest.icon;
        return (
          <a
            key={dest.to}
            href={dest.to}
            onClick={(e) => onClick(e, dest.to)}
            aria-label={dest.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 no-underline",
              active ? "px-[15px]" : sm ? "px-[11px]" : "px-[11px] blg:px-[15px]",
            )}
            style={{
              height: 44,
              borderRadius: 999,
              border: "2.5px solid",
              borderColor: active ? "var(--line)" : "transparent",
              background: active ? "var(--navActive)" : "transparent",
              color: active ? "var(--navActiveText)" : "var(--plainText)",
              boxShadow: active ? "3px 3px 0 var(--shadow)" : "none",
              transform: active ? "rotate(-1.5deg)" : "none",
              fontWeight: 700,
              fontSize: 15,
              boxSizing: "border-box",
              transition: "background .15s",
            }}
          >
            <Icon size={20} weight="fill" className="shrink-0" aria-hidden="true" />
            <span className={active ? "inline" : sm ? "hidden" : "hidden blg:inline"}>{dest.label}</span>
          </a>
        );
      })}
    </div>
  );
}

/** lg/md floating nav pill: 72 high, 5px shadow; logo left, items centre, theme toggle + avatar right. */
export function TopNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="relative z-[5] hidden h-[72px] shrink-0 items-center gap-3 pr-3 pl-3.5 md:flex blg:pr-3.5 blg:pl-4"
      style={{ ...PILL, boxShadow: "5px 5px 0 var(--shadow)" }}
    >
      <Logo />
      <NavItems />
      <div className="flex shrink-0 items-center gap-2.5">
        <ThemeToggle />
        {/* README: the dashboard at lg adds the name / "A2 · Day N" next to the avatar (hidden below lg). */}
        <AvatarButton withName={pathname === "/"} />
      </div>
    </nav>
  );
}

/** sm sticky top bar: `top:10px`, 58 high, 4px shadow. */
export function SmTopBar() {
  return (
    <header
      className="sticky top-[10px] z-20 flex h-[58px] shrink-0 items-center justify-between gap-2.5 pr-2 pl-2.5 md:hidden"
      style={{ ...PILL, boxShadow: "4px 4px 0 var(--shadow)" }}
    >
      <Logo small />
      <div className="flex items-center gap-2">
        <ThemeToggle small />
        <AvatarButton small />
      </div>
    </header>
  );
}

/** sm sticky bottom nav: `bottom:12px` (+ safe area), 62 high, rotated −0.6°, icon-only except the active item. */
export function SmBottomNav() {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 flex h-[62px] shrink-0 items-center px-2 md:hidden"
      style={{ ...PILL, boxShadow: "5px 5px 0 var(--shadow)", transform: "rotate(-0.6deg)" }}
    >
      <NavItems sm />
    </nav>
  );
}

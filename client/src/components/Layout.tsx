import { useEffect, useLayoutEffect, useState } from "react";
import { cn } from "../lib/cn";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { isTransientPath, NavStackProvider, useNavStack } from "../lib/navStack";
import { QUICK_LINKS } from "../lib/navDestinations";
import { SmBottomNav, SmTopBar, TopNav } from "./chrome/Chrome";
import { CommandPalette } from "./CommandPalette";
import DemoBanner from "./DemoBanner";

/**
 * Gmail/Superhuman-style "G then a letter" quick-nav, active app-wide
 * whenever the command palette is closed and focus isn't in a text field
 * (checked on every keypress, not just the first — typing into a field
 * that gains focus mid-chord must still cancel it). Targets QUICK_LINKS,
 * the same registry the palette's own "Jump to" section and its "G <letter>"
 * hint legend read from, so the two can't drift apart. Needs to live inside
 * NavStackProvider (for useNavStack) — Layout() itself renders that
 * provider, so this can't be inlined there directly.
 */
function GlobalShortcuts({ armed }: { armed: boolean }) {
  const { switchTab } = useNavStack();

  useEffect(() => {
    if (!armed) return;
    let waitingForLetter = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const disarm = () => {
      waitingForLetter = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      const tag = el?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el?.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) {
        disarm();
        return;
      }
      const key = e.key.toLowerCase();
      if (!waitingForLetter) {
        if (key === "g") {
          waitingForLetter = true;
          timer = setTimeout(disarm, 900);
        }
        return;
      }
      const dest = QUICK_LINKS.find((l) => l.shortcut === key);
      disarm();
      if (dest) {
        e.preventDefault();
        switchTab(dest.to);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      disarm();
    };
  }, [armed, switchTab]);

  return null;
}

/**
 * The Bento shell (handoff README §1.1, §1.5). Page padding lg 24 / md 22 / sm 14, with the chrome and the page
 * stacked in a column:
 * - lg (>= 1200px) and tall enough (>= 820px, the `lgfill` variant): the shell is exactly the viewport and nothing
 *   page-scrolls. <main> gets the remaining height, so a page's grid fills it with `flex-1 min-h-0` (or `h-full`)
 *   and only inner lists scroll.
 * - Shorter lg viewports, md and sm: the document scrolls. Pages give their rows explicit heights/min-heights.
 * - sm: SmTopBar and SmBottomNav are sticky, and content scrolls between them.
 * Transient screens (the review session) own the whole viewport with no chrome, for a distraction-free session.
 * Each page sets its own `--k` display scale on its root (index.css has the fallback).
 */
export default function Layout() {
  const location = useLocation();
  const isTransient = isTransientPath(location.pathname);
  // the review session never page-scrolls (Review handoff §2): it gets exactly the viewport, minus the demo banner
  const noScroll = location.pathname === "/review";
  const [paletteOpen, setPaletteOpen] = useState(false);

  useActivityHeartbeat();

  // A new page starts at the top, not at the previous page's scroll offset. Keyed on the pathname only, so query or
  // hash changes within a page don't jump.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <NavStackProvider>
      {/* Outer column so the demo banner shares the viewport height with the shell instead of adding to it. */}
      <div className={cn("flex min-h-dvh flex-col lgfill:h-dvh", noScroll && "h-dvh overflow-hidden")}>
        <DemoBanner />
        {isTransient ? (
          <main className={cn("flex-1", noScroll && "flex min-h-0 flex-col")}>
            <Outlet />
          </main>
        ) : (
          <div className="flex flex-1 flex-col gap-4 p-3.5 md:gap-5 md:p-[22px] blg:gap-[22px] blg:p-6 lgfill:min-h-0 lgfill:overflow-hidden">
            <SmTopBar />
            <TopNav />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </main>
            {/* A direct child of the shell on purpose: sticky only works within its parent's full height. */}
            <SmBottomNav />
          </div>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <GlobalShortcuts armed={!paletteOpen} />
    </NavStackProvider>
  );
}

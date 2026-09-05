import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityHeartbeat } from "../hooks/useActivityHeartbeat";
import { cn } from "../lib/cn";
import { isTransientPath, NavStackProvider, useNavStack } from "../lib/navStack";
import { QUICK_LINKS } from "../lib/navDestinations";
import BottomTabBar from "./BottomTabBar";
import CaptureFab from "./CaptureFab";
import { CommandPalette } from "./CommandPalette";
import DemoBanner from "./DemoBanner";
import { Rail } from "./Rail";

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

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isWords = location.pathname === "/words";
  const isNotes = location.pathname === "/plan/notes";
  // Words and Notes both have a desktop 3-column layout with one column
  // meant to scroll internally (word list / note list) — that only works
  // if some ancestor actually bounds main's height, same as Dashboard's own
  // lg:h-dvh below.
  const needsBoundedHeight = isDashboard || isWords || isNotes;
  // Words' and Notes' master-detail layouts read as power pages like
  // Dashboard — they want the same edge-to-edge treatment (list column
  // flush against the Rail), not the centered max-w-6xl reading-width box
  // every other route gets. (Notes.tsx has its own lg:mx-auto max-w-[1040px]
  // wrapper too — that has to come off in the same change, or the page
  // stays double-boxed even with this flag flipped.)
  const isEdgeToEdge = isDashboard || isWords || isNotes;
  // Transient screens (the review session so far) own the whole viewport
  // distraction-free, same as the handoff — no tab bar/FAB/rail to tap
  // away through mid-session, and no reserved padding for chrome that
  // isn't there. Every other route gets the same unified Rail (see
  // Rail.tsx) — no more per-route chrome decision.
  const isTransient = isTransientPath(location.pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useActivityHeartbeat();

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
      <div className="min-h-screen">
        {/* the dashboard needs the full content width (and a fixed-height grid
            at lg+) to fit proportionally without scrolling; every other page
            keeps the centered reading-width layout — carried over as-is from
            the pre-Nocturne layout. pb clears the 5-tab bottom bar (mobile);
            at lg the bottom bar is replaced by Rail (fixed, 84px), so main
            gets left padding to clear it instead. */}
        <DemoBanner />

        {!isTransient && <Rail onOpenPalette={() => setPaletteOpen(true)} />}

        <main
          className={cn(
            !isTransient && "lg:pl-[84px]",
            // Dashboard owns its own edge-to-edge padding and bottom
            // clearance (see Dashboard.tsx) instead of main reserving it,
            // so the two don't fight over the same padding box — every
            // other route still gets its clearance from here.
            !isTransient && !isDashboard && "pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0",
            // Transient screens (see the comment above) own the whole
            // viewport themselves, full-bleed — they must not also be
            // capped at max-w-6xl here, or a real full-width desktop
            // layout (e.g. ReviewSession's lg: 4-pane layout) can never
            // use more than main's own capped width.
            // lg:pr-4 (not lg:px-4) — px would reset the padding-left that
            // lg:pl-[84px] above already set for rail clearance, since
            // tailwind-merge treats them as the same conflicting group and
            // keeps whichever is later in this list.
            !isTransient && (isEdgeToEdge ? "lg:h-dvh lg:min-h-[760px] lg:pr-4 lg:py-3" : "mx-auto max-w-6xl px-4 py-6"),
            !isTransient && !isEdgeToEdge && needsBoundedHeight && "lg:h-dvh lg:min-h-[760px]",
          )}
        >
          <Outlet />
        </main>

        {!isTransient && (
          <>
            <div className="lg:hidden">
              <BottomTabBar />
            </div>
            <CaptureFab />
          </>
        )}

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <GlobalShortcuts armed={!paletteOpen} />
      </div>
    </NavStackProvider>
  );
}

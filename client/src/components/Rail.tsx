import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { BookOpen, Exam, FlagPennant, MagnifyingGlass, NotePencil } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { api, getUser } from "../api/client";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";
import { levelStates } from "../lib/levels";
import { useNavStack } from "../lib/navStack";
import { ProfileSheet } from "./ProfileSheet";

// Desktop's unified rail carries a 6th destination (Notes) mobile's bottom
// tab bar deliberately doesn't — see navDestinations.ts's own doc comment
// on why the mobile 5-tab set is fixed. Kept local to this file rather than
// exported from navDestinations.ts so it can't accidentally leak onto the
// mobile tab bar.
const RAIL_NAV_DESTINATIONS = [...NAV_DESTINATIONS, { to: "/plan/notes", label: "Notes", icon: NotePencil }];

const LIBRARY_ITEMS: { to: string; label: string; icon: Icon }[] = [
  { to: "/plan/sources", label: "Sources", icon: BookOpen },
  { to: "/plan/syllabus", label: "Syllabus", icon: FlagPennant },
  { to: "/plan/self-tests", label: "Self-tests", icon: Exam },
];

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]!.slice(0, 2).toUpperCase() : (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * The unified md/lg nav rail (German Companion Desktop.dc.html, turn 3a) —
 * fixed 84px, used identically on every desktop/tablet screen. Replaces
 * the earlier two-chrome split (a 232px labelled DesktopSidebar on hub
 * screens, a 68px bare IconRail elsewhere) with one shell, so there's no
 * more per-route chrome decision (see lib/chrome.ts's removal) and no more
 * "which chrome does this screen get" inconsistency between screens.
 */
export function Rail({ onOpenPalette }: { onOpenPalette: () => void }) {
  const location = useLocation();
  const { switchTab, push } = useNavStack();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const [profileOpen, setProfileOpen] = useState(false);
  const user = getUser();

  const states = data ? levelStates(data.learning.levels) : [];
  const activeLevel = data ? (data.learning.levels[Math.max(0, states.indexOf("active"))]?.level ?? "a1") : "a1";
  const todayEntry = data?.roadmapWeekStrip.find((d) => d.status === "today");
  const dayNumber = todayEntry ? todayEntry.dayOffset + 1 : null;
  // "live" dot on Words — independent of active-route state, per the spec.
  // Reads as "there's due review activity right now", not a static total-
  // word count (which would almost always be non-zero and so never read as
  // "live").
  const hasDueWords = (data?.dueToday ?? 0) > 0;

  const examDate = data?.examTargetDate ? new Date(`${data.examTargetDate}T00:00:00`) : null;
  const examDaysRaw = examDate ? Math.round((examDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null;
  const examTitle =
    examDaysRaw === null
      ? "No exam scheduled"
      : `${activeLevel.toUpperCase()} exam · ${examDaysRaw} day${examDaysRaw === 1 ? "" : "s"} · ${examDate!.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <div
      className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center gap-[5px] border-r py-5 lg:flex"
      style={{ borderColor: "rgba(233,233,237,.08)", background: "linear-gradient(180deg,#1a1c2b,#161826)", color: "#e9e9ed" }}
    >
      <div
        title="AzubiWeg"
        className="mb-3 grid size-[30px] place-items-center rounded-[9px] text-[14px] font-medium"
        style={{ background: "rgba(145,132,217,.16)", boxShadow: "0 0 0 1px rgba(181,171,252,.4)", color: "#d2cefd" }}
      >
        W
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        title="Search or jump — ⌘K"
        className="mb-1 flex w-[40px] flex-col items-center gap-1 rounded-[10px] py-2"
        style={{ background: "#20222f", color: "rgba(233,233,237,.55)" }}
      >
        <MagnifyingGlass size={15} weight="regular" aria-hidden="true" />
        
      </button>

      <div className="my-1 h-px w-[44px]" style={{ background: "rgba(233,233,237,.08)" }} />

      <div className="flex flex-col items-center gap-1">
        {RAIL_NAV_DESTINATIONS.map((dest) => {
          const active = isActivePath(dest.to, dest.end, location.pathname);
          const Icon = dest.icon;
          const isWords = dest.to === "/words";
          return (
            <button
              key={dest.to}
              type="button"
              onClick={() => switchTab(dest.to)}
              title={dest.label}
              className="relative flex w-[60px] flex-col items-center gap-1 rounded-[10px] py-2"
              style={{ background: active ? "rgba(145,132,217,.16)" : "transparent", color: active ? "#d2cefd" : "rgba(233,233,237,.55)" }}
            >
              <span className="relative">
                <Icon size={18} weight="regular" aria-hidden="true" />
                {isWords && hasDueWords && (
                  <i
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 block size-[6px] rounded-full"
                    style={{ background: "#9184d9" }}
                  />
                )}
              </span>
              <span className="text-[8.5px] tracking-[.02em] uppercase">{dest.label}</span>
            </button>
          );
        })}
      </div>

      <div className="my-2 h-px w-[44px]" style={{ background: "rgba(233,233,237,.08)" }} />

      <div className="flex flex-col items-center gap-2.5">
        {LIBRARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => push(item.to)}
              title={item.label}
              className="grid size-[30px] place-items-center rounded-[9px]"
              style={{ color: "rgba(233,233,237,.4)" }}
            >
              <Icon size={18} weight="regular" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        {examDaysRaw !== null && (
          <button
            type="button"
            onClick={() => push("/settings")}
            title={examTitle}
            className="grid size-14 place-items-center gap-px rounded-2xl text-center"
            style={{ background: "rgba(145,132,217,.09)", boxShadow: "0 0 0 1px rgba(145,132,217,.3)" }}
          >
            <FlagPennant size={11} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
            <div className="text-[15px] leading-none font-medium" style={{ color: "#d2cefd" }}>
              {examDaysRaw >= 0 ? examDaysRaw : Math.abs(examDaysRaw)}
            </div>
            <div className="text-[7px] tracking-[.08em]" style={{ color: "rgba(233,233,237,.5)" }}>
              DAYS
            </div>
          </button>
        )}
        <button type="button" onClick={() => setProfileOpen(true)} title={user?.name ?? "Profile"}>
          <div
            className="grid size-8 shrink-0 place-items-center rounded-full text-[12.5px] font-medium"
            style={{ letterSpacing: "-.01em", color: "#d2cefd", background: "linear-gradient(150deg,#3a3560,#272a45)", border: "1px solid rgba(181,171,252,.4)" }}
          >
            {initials(user?.name)}
          </div>
        </button>
      </div>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={user?.name}
        email={user?.email}
        level={activeLevel}
        dayNumber={dayNumber}
        streak={data?.streak ?? 0}
      />
    </div>
  );
}

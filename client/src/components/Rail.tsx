import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { BookOpen, Exam, FlagPennant, MagnifyingGlass, Moon, Sun } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { api, getUser } from "../api/client";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";
import { levelStates } from "../lib/levels";
import { useNavStack } from "../lib/navStack";
import { useTheme } from "../lib/theme";
import { ProfileSheet } from "./ProfileSheet";

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
  const { theme, toggleTheme } = useTheme();

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
      style={{
        borderColor: "var(--color-hairline-soft)",
        background: "linear-gradient(180deg,var(--color-ink-50),var(--color-paper))",
        color: "var(--color-ink-900)",
      }}
    >
      <div
        title="AzubiWeg"
        className="mb-3 grid size-[30px] place-items-center rounded-[9px] text-[14px] font-medium"
        style={{
          background: "var(--color-brand-100)",
          boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-brand-700) 40%, transparent)",
          color: "var(--color-brand-800)",
        }}
      >
        W
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        title="Search or jump — ⌘K"
        className="mb-1 flex w-[40px] flex-col items-center gap-1 rounded-[10px] py-2 transition-[filter] duration-150 hover:brightness-110"
        style={{ background: "var(--color-ink-50)", color: "var(--color-ink-600)" }}
      >
        <MagnifyingGlass size={15} weight="regular" aria-hidden="true" />

      </button>

      <button
        type="button"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="mb-1 flex w-[40px] flex-col items-center gap-1 rounded-[10px] py-2 transition-[filter] duration-150 hover:brightness-110"
        style={{ background: "var(--color-ink-50)", color: "var(--color-ink-600)" }}
      >
        {theme === "dark" ? <Sun size={15} weight="regular" aria-hidden="true" /> : <Moon size={15} weight="regular" aria-hidden="true" />}
      </button>

      <div className="my-1 h-px w-[44px]" style={{ background: "var(--color-hairline-soft)" }} />

      <div className="flex flex-col items-center gap-1">
        {NAV_DESTINATIONS.map((dest) => {
          const active = isActivePath(dest.to, dest.end, location.pathname);
          const Icon = dest.icon;
          const isWords = dest.to === "/words";
          return (
            <button
              key={dest.to}
              type="button"
              onClick={() => switchTab(dest.to)}
              title={dest.label}
              className="relative flex w-[60px] flex-col items-center gap-1 rounded-[10px] py-2 transition-colors duration-150 hover:bg-white/5"
              style={{ background: active ? "var(--color-brand-100)" : undefined, color: active ? "var(--color-brand-800)" : "var(--color-ink-600)" }}
            >
              <span className="relative">
                <Icon size={18} weight="regular" aria-hidden="true" />
                {isWords && hasDueWords && (
                  <i
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 block size-[6px] rounded-full"
                    style={{ background: "var(--color-brand-500)" }}
                  />
                )}
              </span>
              <span className="text-micro tracking-[.02em] uppercase">{dest.label}</span>
            </button>
          );
        })}
      </div>

      <div className="my-2 h-px w-[44px]" style={{ background: "var(--color-hairline-soft)" }} />

      <div className="flex flex-col items-center gap-2.5">
        {LIBRARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => push(item.to)}
              title={item.label}
              className="grid size-[30px] place-items-center rounded-[9px] transition-colors duration-150 hover:bg-white/5"
              style={{ color: "var(--color-ink-400)" }}
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
            className="grid size-14 place-items-center gap-px rounded-2xl text-center transition-[filter] duration-150 hover:brightness-110"
            style={{ background: "var(--color-brand-50)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-brand-500) 30%, transparent)" }}
          >
            <FlagPennant size={11} weight="regular" style={{ color: "var(--color-brand-500)" }} aria-hidden="true" />
            <div className="text-[15px] leading-none font-medium" style={{ color: "var(--color-brand-800)" }}>
              {examDaysRaw >= 0 ? examDaysRaw : Math.abs(examDaysRaw)}
            </div>
            <div className="text-micro tracking-[.08em]" style={{ color: "var(--color-ink-600)" }}>
              DAYS
            </div>
          </button>
        )}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title={user?.name ?? "Profile"}
          className="rounded-full transition-colors duration-150 hover:bg-white/5"
        >
          <div
            className="grid size-8 shrink-0 place-items-center rounded-full text-[12.5px] font-medium"
            style={{
              letterSpacing: "-.01em",
              color: "var(--color-brand-800)",
              background: "linear-gradient(150deg,var(--color-brand-100),var(--color-ink-50))",
              border: "1px solid color-mix(in srgb, var(--color-brand-700) 40%, transparent)",
            }}
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

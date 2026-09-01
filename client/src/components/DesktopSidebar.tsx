import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { BookOpen, Exam, FlagPennant, MagnifyingGlass, Path } from "@phosphor-icons/react";
import { api, getUser } from "../api/client";
import { isActivePath, NAV_DESTINATIONS } from "../lib/navDestinations";
import { levelStates } from "../lib/levels";
import { useNavStack } from "../lib/navStack";
import { ProfileSheet } from "./ProfileSheet";
import { useState } from "react";

const LIBRARY_ITEMS = [
  { to: "/plan/sources", label: "Sources", icon: BookOpen },
  { to: "/plan/syllabus", label: "Syllabus", icon: Path },
  { to: "/plan/self-tests", label: "Self-tests", icon: Exam },
];

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]!.slice(0, 2).toUpperCase() : (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * The lg+ labelled sidebar (German Companion Desktop.dc.html, id="1a") —
 * the desktop nav shell every screen sits inside of, replacing the mobile
 * bottom tab bar at that width. Badge counts and the exam card reuse the
 * same ["dashboard"] query Dashboard.tsx itself fetches (cached/deduped by
 * TanStack Query, not a second real request once either page has loaded
 * it this session).
 */
export function DesktopSidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const location = useLocation();
  const { switchTab, push } = useNavStack();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const [profileOpen, setProfileOpen] = useState(false);
  const user = getUser();

  const states = data ? levelStates(data.learning.levels) : [];
  const activeLevel = data ? (data.learning.levels[Math.max(0, states.indexOf("active"))]?.level ?? "a1") : "a1";
  const openApplications = data ? data.applications.wishlist + data.applications.applied + data.applications.interview : 0;
  const todayEntry = data?.roadmapWeekStrip.find((d) => d.status === "today");
  const dayNumber = todayEntry ? todayEntry.dayOffset + 1 : null;
  const examDays = data?.examTargetDate
    ? Math.round((new Date(`${data.examTargetDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
    : null;

  const badgeFor: Record<string, string | null> = {
    "/words": data ? String(data.totalWords) : null,
    "/plan": data?.roadmapToday ? `${data.roadmapToday.tasksDone}/${data.roadmapToday.tasksTotal}` : null,
    "/jobs": data ? String(openApplications) : null,
  };

  return (
    <div
      className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r px-3.5 py-5 lg:flex"
      style={{ borderColor: "rgba(233,233,237,.08)", background: "linear-gradient(180deg,#1a1c2b,#161826)", color: "#e9e9ed" }}
    >
      <div className="flex items-center gap-[9px] px-1.5">
        <div className="grid size-7 place-items-center rounded-[9px]" style={{ background: "rgba(145,132,217,.16)", boxShadow: "0 0 0 1px rgba(181,171,252,.4)" }}>
          <span className="text-[14px] font-medium" style={{ color: "#d2cefd" }}>
            A
          </span>
        </div>
        <div className="text-[15px] font-medium" style={{ letterSpacing: "-.01em" }}>
          AzubiWeg
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="mt-4 flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[12.5px]"
        style={{ border: "1px solid rgba(233,233,237,.12)", background: "#20222f", color: "rgba(233,233,237,.5)" }}
      >
        <MagnifyingGlass size={14} weight="regular" aria-hidden="true" />
        Search or jump
        <span className="ml-auto rounded px-[5px] py-[2px] font-mono text-[10px] font-semibold" style={{ background: "rgba(233,233,237,.08)" }}>
          ⌘K
        </span>
      </button>

      <div className="mt-[18px] flex flex-col gap-0.5">
        {NAV_DESTINATIONS.map((dest) => {
          const active = isActivePath(dest.to, dest.end, location.pathname);
          const Icon = dest.icon;
          const badge = badgeFor[dest.to];
          return (
            <button
              key={dest.to}
              type="button"
              onClick={() => switchTab(dest.to)}
              className="flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-left"
              style={{
                background: active ? "rgba(145,132,217,.14)" : "transparent",
                boxShadow: active ? "inset 2px 0 0 #9184d9" : "none",
                color: active ? "#d2cefd" : "rgba(233,233,237,.62)",
              }}
            >
              <Icon size={17} weight="regular" aria-hidden="true" />
              <span className="flex-1 text-[13.5px]" style={{ fontWeight: active ? 500 : 400 }}>
                {dest.label}
              </span>
              {badge && (
                <span className="text-[11px]" style={{ color: active ? "#b5abfc" : "rgba(233,233,237,.4)" }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-1.5 my-[18px] h-px" style={{ background: "rgba(233,233,237,.08)" }} />
      <div className="px-[11px] text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.35)" }}>
        Library
      </div>
      <div className="mt-[7px] flex flex-col gap-0.5">
        {LIBRARY_ITEMS.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => push(item.to)}
              className="flex items-center gap-[11px] rounded-[9px] px-[11px] py-2 text-left"
              style={{ color: active ? "#d2cefd" : "rgba(233,233,237,.55)", background: active ? "rgba(145,132,217,.1)" : "transparent" }}
            >
              <Icon size={16} weight="regular" aria-hidden="true" />
              <span className="text-[13px]">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-[11px]">
        {examDays !== null && examDays >= 0 && (
          <button
            type="button"
            onClick={() => push("/settings")}
            className="rounded-[11px] p-[11px_12px] text-left"
            style={{ background: "rgba(145,132,217,.09)", boxShadow: "0 0 0 1px rgba(145,132,217,.3)" }}
          >
            <div className="flex items-center gap-[7px] text-[9.5px] tracking-[.1em] uppercase" style={{ color: "#9184d9" }}>
              <FlagPennant size={12} weight="regular" aria-hidden="true" />
              {activeLevel.toUpperCase()} exam
            </div>
            <div className="mt-[5px] flex items-baseline gap-[5px]">
              <span className="text-[19px] font-medium" style={{ color: "#d2cefd" }}>
                {examDays}
              </span>
              <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                days ·{" "}
                {new Date(`${data!.examTargetDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
            </div>
          </button>
        )}
        <button type="button" onClick={() => setProfileOpen(true)} className="flex items-center gap-[10px] rounded-[9px] p-1.5">
          <div
            className="grid size-8 shrink-0 place-items-center rounded-full text-[12.5px] font-medium"
            style={{ letterSpacing: "-.01em", color: "#d2cefd", background: "linear-gradient(150deg,#3a3560,#272a45)", border: "1px solid rgba(181,171,252,.4)" }}
          >
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12.5px] font-medium">{user?.name || "You"}</div>
            <div className="text-[10.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {activeLevel.toUpperCase()}
              {dayNumber !== null ? ` · day ${dayNumber}` : ""}
            </div>
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

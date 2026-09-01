import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CaretRight, LockSimple, NotePencil, SlidersHorizontal } from "@phosphor-icons/react";
import { api, clearSession } from "../api/client";
import { useNavStack } from "../lib/navStack";
import { BottomSheet } from "./ui/BottomSheet";

const LEVEL_LABELS: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1" };

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]!.slice(0, 2).toUpperCase() : (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * The handoff's profile bottom sheet (behind Today's avatar) — replaces
 * the retired AccountSheet.tsx/long-press-the-tab-bar stopgap. Only ever
 * opened from Dashboard, which already has name/level/day/streak loaded —
 * passed in as props rather than refetched. Word count and notes count are
 * real, cheap, cache-shared with Words/Notes via the same query keys those
 * pages already use.
 */
export function ProfileSheet({
  open,
  onClose,
  name,
  email,
  level,
  dayNumber,
  streak,
}: {
  open: boolean;
  onClose: () => void;
  name: string | undefined;
  email: string | undefined;
  level: string;
  dayNumber: number | null;
  streak: number;
}) {
  const navigate = useNavigate();
  const { push } = useNavStack();
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words, enabled: open });
  const { data: notesData } = useQuery({ queryKey: ["notes"], queryFn: () => api.notesFeed(), enabled: open });

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center gap-[13px]">
        <div
          className="grid size-[52px] shrink-0 place-items-center rounded-full text-[19px] font-medium"
          style={{
            letterSpacing: "-.01em",
            color: "#d2cefd",
            background: "linear-gradient(150deg,#3a3560,#272a45)",
            border: "1px solid rgba(181,171,252,.4)",
          }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-medium">{name || "You"}</div>
          <div className="mt-0.5 truncate text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
            {email} · {LEVEL_LABELS[level] ?? level.toUpperCase()}
            {dayNumber !== null ? ` · day ${dayNumber}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[18px] font-medium">{wordsData?.words.length ?? "—"}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            words
          </div>
        </div>
        <div className="flex-1 rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[18px] font-medium" style={{ color: "#b5abfc" }}>
            {streak}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            day streak
          </div>
        </div>
        <div className="flex-1 rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[18px] font-medium">{notesData?.notes.length ?? "—"}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            notes
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-[7px]">
        <button
          type="button"
          onClick={() => {
            onClose();
            push("/settings");
          }}
          className="flex items-center gap-3 rounded-xl p-[13px] text-left text-[14.5px]"
          style={{ background: "#20222f", color: "#e9e9ed" }}
        >
          <SlidersHorizontal size={18} weight="regular" style={{ color: "rgba(233,233,237,.6)" }} aria-hidden="true" />
          <span className="flex-1">Settings</span>
          <CaretRight size={14} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            push("/plan/notes");
          }}
          className="flex items-center gap-3 rounded-xl p-[13px] text-left text-[14.5px]"
          style={{ background: "#20222f", color: "#e9e9ed" }}
        >
          <NotePencil size={18} weight="regular" style={{ color: "rgba(233,233,237,.6)" }} aria-hidden="true" />
          <span className="flex-1">All notes</span>
          <CaretRight size={14} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            clearSession();
            navigate("/login");
          }}
          className="flex items-center gap-3 rounded-xl p-[13px] text-left text-[14.5px]"
          style={{ background: "transparent", color: "#e4c4b6" }}
        >
          <LockSimple size={18} weight="regular" aria-hidden="true" />
          <span className="flex-1">Log out</span>
        </button>
      </div>
    </BottomSheet>
  );
}

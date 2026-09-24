import type { ReactNode } from "react";
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
 * Profile sheet behind the chrome's avatar (undesigned in Bento; Sticker style): avatar, three stat stickers, and
 * Settings / All notes / Log out. Name/level/day/streak come in as props; word and note counts share Words' and the
 * Notes wall's query caches.
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
  const { data: notesData } = useQuery({ queryKey: ["notes", "wall"], queryFn: api.notesWall, enabled: open });

  const stat = (n: number | string, l: string, bg: string, tilt: number) => (
    <div
      className="flex flex-1 flex-col"
      style={{ padding: "10px 12px", border: "2.5px solid var(--line)", borderRadius: 16, background: bg, color: "var(--onTile)", boxShadow: "3px 3px 0 var(--shadow)", transform: `rotate(${tilt}deg)` }}
    >
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{n}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{l}</span>
    </div>
  );
  const row = (icon: ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center text-left"
      style={{
        gap: 12,
        height: 50,
        padding: "0 14px",
        border: `2.5px ${danger ? "dashed" : "solid"} var(--line)`,
        borderRadius: 999,
        background: danger ? "transparent" : "var(--plain)",
        color: danger ? "inherit" : "var(--plainText)",
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {!danger && <CaretRight size={14} weight="bold" aria-hidden="true" />}
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center" style={{ gap: 13 }}>
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--pink)", color: "var(--onTile)", border: "2.5px solid var(--line)", boxShadow: "3px 3px 0 var(--shadow)", fontWeight: 700, fontSize: 19, boxSizing: "border-box" }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>
            {name || "You"}
          </div>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
            {email} · {LEVEL_LABELS[level] ?? level.toUpperCase()}
            {dayNumber !== null ? ` · day ${dayNumber}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 flex" style={{ gap: 10 }}>
        {stat(wordsData?.words.length ?? "–", "words", "var(--lemon)", -1)}
        {stat(streak, "day streak", "var(--tomato)", 0.8)}
        {stat(notesData?.notes.length ?? "–", "notes", "var(--lilac)", -0.6)}
      </div>

      <div className="mt-4 flex flex-col" style={{ gap: 8 }}>
        {row(<SlidersHorizontal size={18} weight="fill" aria-hidden="true" />, "Settings", () => {
          onClose();
          push("/settings");
        })}
        {row(<NotePencil size={18} weight="fill" aria-hidden="true" />, "All notes", () => {
          onClose();
          push("/notes");
        })}
        {row(
          <LockSimple size={18} weight="fill" aria-hidden="true" />,
          "Log out",
          () => {
            onClose();
            clearSession();
            navigate("/login");
          },
          true,
        )}
      </div>
    </BottomSheet>
  );
}

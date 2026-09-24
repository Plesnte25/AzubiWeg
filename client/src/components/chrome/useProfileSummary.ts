import { useQuery } from "@tanstack/react-query";
import { api, getUser } from "../../api/client";
import { levelStates } from "../../lib/levels";

export function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]!.slice(0, 2).toUpperCase() : (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Short display name for the lg nav ("Lena M."): first name plus last initial. */
function shortName(name: string | undefined): string {
  if (!name) return "You";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0]! : `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

/**
 * Who's signed in plus their active level, roadmap day and streak — what the chrome's avatar, the lg
 * "Lena M. / A2 · Day 83" block and ProfileSheet show. Reads the shared ["dashboard"] query (the same cache entry
 * Today uses), so it costs nothing extra on most pages.
 */
export function useProfileSummary() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const user = getUser();

  const states = data ? levelStates(data.learning.levels) : [];
  const activeLevel = data ? (data.learning.levels[Math.max(0, states.indexOf("active"))]?.level ?? "a1") : "a1";
  const todayEntry = data?.roadmapWeekStrip.find((d) => d.status === "today");

  return {
    name: user?.name,
    email: user?.email,
    initials: initials(user?.name),
    shortName: shortName(user?.name),
    activeLevel,
    dayNumber: todayEntry ? todayEntry.dayOffset + 1 : null,
    streak: data?.streak ?? 0,
  };
}

import type { QueryClient } from "@tanstack/react-query";

/** Every mutation in the hub touches roadmap/syllabus/dashboard-derived
 * numbers somewhere else on the page (rail badges, stat strips, streaks) —
 * broad invalidation is deliberate, not a shortcut. */
export function invalidateHub(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["roadmap"] });
  queryClient.invalidateQueries({ queryKey: ["learning"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["words"] });
}

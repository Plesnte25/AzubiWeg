import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { toast } from "../../../components/ui/Toast";
import { liveSeconds } from "../../../lib/tasks";

/**
 * The one app-wide task timer (server enforces one running at a time: starting a task banks whichever other task
 * was running). Shared by the Plan journey's Now tile, the ticket's running dot and the Task modal.
 */
export function useTaskTimerActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["learning", "roadmap"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return useMutation({
    mutationFn: (v: { id: string; action?: "start" | "pause" | "reset"; setSeconds?: number }) =>
      api.updateRoadmapTask(v.id, { ...(v.action ? { timerAction: v.action } : {}), ...(v.setSeconds !== undefined ? { setSeconds: v.setSeconds } : {}) }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Timer update failed"),
  });
}

/** Seconds on a task's stopwatch, ticking once a second only while it runs. */
export function useLiveSeconds(task: { timerSeconds: number; timerRunningSince: string | null } | null): number {
  const [now, setNow] = useState(() => Date.now());
  const running = !!task?.timerRunningSince;
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [running]);
  return task ? liveSeconds(task, now) : 0;
}

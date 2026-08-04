import { useQuery } from "@tanstack/react-query";
import { FileText, Link2, Send } from "lucide-react";
import { api } from "../api/client";

export const NOTIFICATION_ICON = { portal: Link2, application: Send, document: FileText } as const;

/** Shared by FabNav (lg) and AccountSheet (sm/md) so both nav shells show the same list. */
export function useNotifications() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 60_000,
  });
  return data?.notifications ?? [];
}

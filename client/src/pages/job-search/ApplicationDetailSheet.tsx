import { useQuery } from "@tanstack/react-query";
import { CaretLeft, DotsThree } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { ApplicationDetailContent } from "./ApplicationDetailContent";

/** sm/md — a full-page view (not a modal), replacing the lg centered
 * ApplicationDetailModal below lg per spec. z-50 (matching Modal.tsx) so it
 * visually covers BottomTabBar (z-40) without needing to plumb a "hide nav"
 * flag up through Layout.tsx — same trick this app's other full-bleed-
 * below-lg overlays already rely on (SearchModal, ReviewModal). Own back
 * control, per spec. */
export default function ApplicationDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => api.application(id) });
  const app = data?.application;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper lg:hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-card px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-body text-ink-400 hover:text-ink-900">
          <CaretLeft size={16} weight="regular" aria-hidden="true" /> Back
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-body font-semibold">
          {app ? `${app.company} — ${app.role}` : "Application"}
        </p>
        <DotsThree size={16} weight="bold" className="shrink-0 text-ink-300" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 px-4 py-4">
        <ApplicationDetailContent id={id} onClose={onClose} />
      </div>
    </div>
  );
}

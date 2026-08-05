import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { ApplicationDetailContent } from "./ApplicationDetailContent";

/** lg only — below lg, ApplicationDetailSheet (a full-page view, not a
 * modal) takes over via Modal's desktopOnly prop, per spec. */
export default function ApplicationDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => api.application(id) });
  const app = data?.application;

  return (
    <Modal title={app ? `${app.company} — ${app.role}` : "Application"} onClose={onClose} size="lg" desktopOnly>
      <ApplicationDetailContent id={id} onClose={onClose} />
    </Modal>
  );
}

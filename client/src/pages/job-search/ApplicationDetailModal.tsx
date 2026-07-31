import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react";
import { api, downloadFile } from "../../api/client";
import type { ApplicationDetail, ApplicationStatus } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../lib/cn";
import { DebouncedInput, Field, inputCls } from "./shared";

const STEPS: { key: ApplicationStatus; label: string }[] = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
];

const EVENT_LABELS: Record<ApplicationDetail["events"][number]["type"], string> = {
  created: "Created",
  status_change: "Status changed",
  note: "Note",
  interview: "Interview",
  follow_up: "Follow-up",
};

export default function ApplicationDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => api.application(id) });
  const { data: cvsData } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"note" | "interview" | "follow_up">("note");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["applications", "stats"] });
  };
  const update = useMutation({
    mutationFn: (d: Parameters<typeof api.updateApplication>[1]) => api.updateApplication(id, d),
    onSuccess: invalidate,
  });
  const addEvent = useMutation({
    mutationFn: () => api.addApplicationEvent(id, { type: noteType, note: note.trim() || undefined }),
    onSuccess: () => {
      setNote("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteApplication(id),
    onSuccess: () => {
      // drop (not invalidate) the deleted application's own detail query —
      // invalidating it would refetch a now-404ing id in the instant before
      // the modal unmounts
      queryClient.removeQueries({ queryKey: ["applications", id], exact: true });
      queryClient.invalidateQueries({ queryKey: ["applications"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["applications", "stats"] });
      onClose();
    },
  });

  const app = data?.application;
  if (!app) return null;

  const stepIndex = STEPS.findIndex((s) => s.key === app.status);

  return (
    <Modal title={`${app.company} — ${app.role}`} onClose={onClose} size="lg">
      {app.location && <p className="-mt-3 mb-4 text-sm text-ink-400">{app.location}</p>}

      {app.status === "rejected" ? (
        <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          Rejected
        </span>
      ) : (
        <div className="mb-4 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid size-7 place-items-center rounded-full border text-xs font-semibold",
                    i < stepIndex && "border-ink-900 bg-ink-900 text-white",
                    i === stepIndex && "border-ink-900 bg-ink-900 text-white",
                    i > stepIndex && "border-hairline text-ink-300",
                  )}
                >
                  {i < stepIndex ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                </div>
                <span className={cn("text-[10.5px]", i <= stepIndex ? "text-ink-900" : "text-ink-300")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-1 h-px flex-1", i < stepIndex ? "bg-ink-900" : "bg-hairline")} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[14px] border border-hairline px-4 py-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Company">
            <DebouncedInput value={app.company} onCommit={(v) => update.mutate({ company: v })} />
          </DetailField>
          <DetailField label="Job profile">
            <DebouncedInput value={app.jobProfile ?? ""} onCommit={(v) => update.mutate({ jobProfile: v || null })} />
          </DetailField>
          <DetailField label="Role">
            <DebouncedInput value={app.role} onCommit={(v) => update.mutate({ role: v })} />
          </DetailField>
          <DetailField label="Location">
            <DebouncedInput value={app.location ?? ""} onCommit={(v) => update.mutate({ location: v || null })} />
          </DetailField>
          <DetailField label="Portal">
            <DebouncedInput value={app.portal ?? ""} onCommit={(v) => update.mutate({ portal: v || null })} />
          </DetailField>
          <DetailField label="Stage">
            <select
              className={inputCls}
              value={app.status}
              onChange={(e) => update.mutate({ status: e.target.value as ApplicationStatus })}
            >
              {[...STEPS, { key: "rejected" as const, label: "Rejected" }].map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </DetailField>
        </div>
        <div className="mt-3 border-t border-hairline-soft pt-3">
          <p className="mb-1 text-[10px] text-ink-300">Description</p>
          <DebouncedInput
            textarea
            value={app.description ?? ""}
            onCommit={(v) => update.mutate({ description: v || null })}
            placeholder="The full job posting text"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {app.url && (
          <a className="text-sm text-brand-700 hover:underline" href={app.url} target="_blank" rel="noreferrer">
            Job posting ↗
          </a>
        )}
        <Field label="CV used">
          <select
            className={inputCls}
            value={app.cvId ?? ""}
            onChange={(e) => update.mutate({ cvId: e.target.value || null })}
          >
            <option value="">—</option>
            {(cvsData?.cvs ?? []).map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.title}
              </option>
            ))}
          </select>
        </Field>
        {app.cv && (
          <button
            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            onClick={() => downloadFile(app.cv!.file.id, app.cv!.file.originalName)}
          >
            📄 {app.cv.title}
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <p className="mb-2 text-sm font-semibold">Timeline</p>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addEvent.mutate();
          }}
        >
          <select
            className="rounded border border-hairline bg-paper px-2 py-1 text-xs"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as typeof noteType)}
          >
            <option value="note">Note</option>
            <option value="interview">Interview</option>
            <option value="follow_up">Follow-up</option>
          </select>
          <input
            className="flex-1 rounded border border-hairline bg-card px-2 py-1 text-sm"
            placeholder="What happened?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" loading={addEvent.isPending}>
            Log
          </Button>
        </form>
        <ul className="space-y-2">
          {app.events.map((ev) => (
            <li key={ev.id} className="flex gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
              <div>
                <span className="font-medium">{EVENT_LABELS[ev.type]}</span>
                {ev.type === "status_change" && ev.toStatus && (
                  <span className="text-ink-600">
                    {" "}
                    {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                    {ev.toStatus}
                  </span>
                )}
                {ev.note && <span className="text-ink-600"> — {ev.note}</span>}
                <span className="ml-1 text-xs text-ink-300">{new Date(ev.occurredAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex justify-between border-t border-hairline pt-3">
        <Button
          variant="outline"
          className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
          leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
          onClick={() => {
            if (confirm(`Delete the application at ${app.company}?`)) remove.mutate();
          }}
        >
          Delete
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-ink-300">{label}</span>
      {children}
    </label>
  );
}

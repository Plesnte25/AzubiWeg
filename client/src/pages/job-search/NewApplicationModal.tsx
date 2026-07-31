import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "../../api/client";
import type { ApplicationStatus } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { DebouncedInput, Field, inputCls } from "./shared";

const STAGES: { key: ApplicationStatus; label: string }[] = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
];

export default function NewApplicationModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: cvsData } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });

  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [portal, setPortal] = useState("");
  const [jobProfile, setJobProfile] = useState("");
  const [description, setDescription] = useState("");
  const [cvId, setCvId] = useState("");
  const [stage, setStage] = useState<ApplicationStatus>("wishlist");
  const [fetchedFrom, setFetchedFrom] = useState<string | null>(null);

  const cvs = cvsData?.cvs ?? [];

  const fetchPreview = useMutation({
    mutationFn: () => api.fetchJobPreview(url.trim()),
    onSuccess: ({ fetched, data }) => {
      if (!fetched || !data) {
        setFetchedFrom(null);
        return;
      }
      setFetchedFrom(data.portal ?? "the posting");
      if (data.company) setCompany(data.company);
      if (data.role) setRole(data.role);
      if (data.location) setLocation(data.location);
      if (data.portal) setPortal(data.portal);
    },
  });

  const add = useMutation({
    mutationFn: () =>
      api.addApplication({
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || null,
        url: url.trim() || null,
        portal: portal.trim() || null,
        jobProfile: jobProfile.trim() || null,
        description: description.trim() || null,
        cvId: cvId || null,
        status: stage,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "stats"] });
      onClose();
    },
  });

  return (
    <Modal title="New application" onClose={onClose} size="md">
      <p className="-mt-3 mb-4 text-sm text-ink-400">Paste the job posting link and we'll try to fill in the rest</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (company.trim() && role.trim()) add.mutate();
        }}
      >
        <div className="flex gap-2">
          <input
            autoFocus
            className={inputCls}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
          <button
            type="button"
            disabled={!url.trim() || fetchPreview.isPending}
            onClick={() => fetchPreview.mutate()}
            className="h-9 shrink-0 rounded-md bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fetchPreview.isPending ? "Fetching…" : "Fetch"}
          </button>
        </div>

        {fetchedFrom && (
          <div className="rounded-[14px] border border-ok-100 bg-ok-50 px-4 py-3.5">
            <p className="flex items-center gap-1 text-sm font-medium text-ok-700">
              <Check className="size-3.5" aria-hidden="true" /> Fetched from {fetchedFrom}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <MiniField label="Company" value={company} />
              <MiniField label="Role" value={role} />
              <MiniField label="Location" value={location} />
              <MiniField label="Portal" value={portal} />
            </div>
            <p className="mt-2 text-[11px] text-ink-400">These fields stay editable below.</p>
          </div>
        )}
        {fetchPreview.isSuccess && !fetchedFrom && (
          <p className="text-xs text-ink-400">
            Couldn't auto-fill from that link — no problem, just fill in the fields below.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company *">
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Role *">
            <input
              className={inputCls}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Ausbildung Fachinformatiker"
            />
          </Field>
          <Field label="Job profile">
            <input
              className={inputCls}
              value={jobProfile}
              onChange={(e) => setJobProfile(e.target.value)}
              placeholder="e.g. Fachinformatiker Systemintegration"
            />
          </Field>
          <Field label="Location">
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <DebouncedInput textarea value={description} onCommit={setDescription} placeholder="Paste the job posting text (optional)" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CV to use">
            <select className={inputCls} value={cvId} onChange={(e) => setCvId(e.target.value)}>
              <option value="">—</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stage">
            <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as ApplicationStatus)}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-[11px] text-ink-300">Fetch is best-effort — never required to add an application.</p>

        {add.isError && <p className="text-sm text-danger-600">{(add.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending} disabled={!company.trim() || !role.trim()}>
            Add application
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-ink-300">{label}</p>
      <p className="text-[13px] font-semibold">{value || "—"}</p>
    </div>
  );
}

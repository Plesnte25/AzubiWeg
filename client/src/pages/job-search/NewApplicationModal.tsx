import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Application, GermanLevel } from "../../api/types";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { Pickers } from "./DetailModal";
import { STAGE_LABEL, type BoardStage } from "./model";
import { eyebrow, fieldInput } from "../../components/ui/fields";

/*
 * New application (AzubiJobs.dc.html, lemon). Fetch is best-effort (server fetchPreview): it fills whatever it can
 * read, including the German level it detects, and every field stays editable. The level chips are the prototype's
 * A2/B1/B2 plus "Not stated", and a detected level outside those (A1, C1, C2) gets its own chip. CV chips are your
 * real CVs (managed in Settings).
 */

const BASE_LEVELS: GermanLevel[] = ["a2", "b1", "b2"];
const NEW_STAGES: BoardStage[] = ["wishlist", "applied", "interview"];

export default function NewApplicationModal({ onClose, onAdded }: { onClose: () => void; onAdded: (app: Application) => void }) {
  const queryClient = useQueryClient();
  const { data: cvs } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [url, setUrl] = useState("");
  const [f, setF] = useState({ company: "", role: "", location: "" });
  const [portal, setPortal] = useState<string | null>(null);
  const [level, setLevel] = useState<GermanLevel | null>(null);
  // Settings → CV shelf: CVs only, the default preselected (until the user picks something else)
  const [pickedCv, setCvId] = useState<string | null | undefined>(undefined);
  const shelfCvs = (cvs?.cvs ?? []).filter((c) => c.kind === "cv");
  const cvId = pickedCv === undefined ? (shelfCvs.find((c) => c.isDefault)?.id ?? null) : pickedCv;
  const [stage, setStage] = useState<BoardStage>("wishlist");
  const [fetched, setFetched] = useState(false);
  const valid = !!(f.company.trim() && f.role.trim());

  const fetchPreview = useMutation({
    mutationFn: () => api.fetchJobPreview(url.trim()),
    onSuccess: ({ fetched: ok, data }) => {
      if (!ok || !data) {
        toast.info("Couldn't read that page · type the fields");
        return;
      }
      setF((x) => ({ company: data.company ?? x.company, role: data.role ?? x.role, location: data.location ?? x.location }));
      if (data.portal) setPortal(data.portal);
      if (data.germanLevel) setLevel(data.germanLevel);
      setFetched(true);
      toast.success("Filled from the posting · check it");
    },
    onError: () => toast.error("Couldn't fetch that link"),
  });

  const add = useMutation({
    mutationFn: () =>
      api.addApplication({
        company: f.company.trim(),
        role: f.role.trim(),
        location: f.location.trim() || null,
        url: url.trim() || null,
        portal,
        germanLevel: level,
        cvId,
        status: stage,
      }),
    onSuccess: ({ application }) => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${application.company} added · ${STAGE_LABEL[stage]}`);
      onAdded(application);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add it"),
  });

  const levels = level && !BASE_LEVELS.includes(level) ? [...BASE_LEVELS, level] : BASE_LEVELS;
  const field = (label: string, key: keyof typeof f, ph: string) => (
    <label className="flex min-w-0 flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <input value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} placeholder={ph} style={fieldInput} />
    </label>
  );

  return (
    <Modal
      tag="Jobs · new"
      title="New application"
      subtitle="Company and role are enough to start."
      bg="var(--lemon)"
      width={580}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton className="flex-1" disabled={!valid || add.isPending} onClick={() => add.mutate()}>
            Add application
          </PillButton>
        </>
      }
    >
      <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
        <span style={eyebrow}>Job posting link</span>
        <form
          className="flex"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!url.trim()) toast.info("Paste a link first");
            else fetchPreview.mutate();
          }}
        >
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setFetched(false);
            }}
            placeholder="Paste the link, we'll try to fill the rest"
            aria-label="Job posting link"
            style={{ ...fieldInput, flex: 1, fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={fetchPreview.isPending}
            className="shrink-0 cursor-pointer"
            style={{ height: 44, padding: "0 16px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14 }}
          >
            {fetchPreview.isPending ? "Fetching…" : fetched ? "Fetched ✓" : "Fetch"}
          </button>
        </form>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>Fetching is best-effort. You can always type the fields.</span>
      </div>
      <div className="grid shrink-0 grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
        {field("Company *", "company", "e.g. Porsche")}
        {field("Role *", "role", "e.g. Azubi Kfz-Mechatroniker/in")}
        {field("Location", "location", "e.g. Leipzig")}
      </div>
      <Pickers
        label="German asked for"
        options={[...levels.map((l) => [l, l.toUpperCase()] as const), [null, "Not stated"] as const]}
        value={level}
        onPick={setLevel}
      />
      <Pickers
        label="CV to use"
        options={[...shelfCvs.map((c) => [c.id, c.isDefault ? `${c.title} ★` : c.title] as const), [null, "None"] as const]}
        value={cvId}
        onPick={setCvId}
      />
      <Pickers label="Stage" options={NEW_STAGES.map((s) => [s, STAGE_LABEL[s]] as const)} value={stage} onPick={setStage} />
    </Modal>
  );
}

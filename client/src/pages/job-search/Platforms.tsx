import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowSquareOut, Plus, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { Chip } from "../../components/ui/Chip";
import { eyebrow, fieldInput } from "../../components/ui/fields";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { Eyebrow, Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";

/*
 * Jobs → Platforms: the job boards you check (server routes/portals.ts, table ExternalAccount). Links only — these
 * sites have no public API, so nothing is synced. Opening one stamps lastCheckedAt, and a platform you haven't opened
 * for a week shows how long it's been. Brought back from the pre-Bento portal chips (cut in 34aeb39) at the user's
 * request, restyled as a Sticker strip under the Jobs header.
 */

const STALE_DAYS = 7;
const DAY_MS = 86_400_000;

/** One-tap suggestions in the Add platform modal; anything else goes in by name + link. */
export const PLATFORM_PRESETS: { label: string; url: string }[] = [
  { label: "Make it in Germany", url: "https://www.make-it-in-germany.com/en/working-in-germany/job-listings" },
  { label: "Bundesagentur Jobbörse", url: "https://www.arbeitsagentur.de/jobsuche/" },
  { label: "ausbildung.de", url: "https://www.ausbildung.de/" },
  { label: "AZUBIYO", url: "https://www.azubiyo.de/" },
  { label: "Goethe-Institut", url: "https://www.goethe.de/en/spr/prf.html" },
  { label: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/" },
  { label: "StepStone", url: "https://www.stepstone.de/" },
  { label: "Indeed", url: "https://de.indeed.com/" },
];

export function PlatformsTile({ span }: { span?: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["portals"], queryFn: api.portals });
  const [adding, setAdding] = useState(false);
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["portals"] });
  const checked = useMutation({ mutationFn: api.markPortalChecked, onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: api.deletePortal,
    onSuccess: () => (invalidate(), toast.success("Platform removed")),
    onError: () => toast.error("Couldn't remove it"),
  });
  const portals = data?.portals ?? [];
  const now = Date.now();

  return (
    <Tile bg="var(--sky)" tilt={0.3} className="flex flex-col" style={{ gridColumn: span, padding: "12px 16px", gap: 8 }}>
      <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
        <Eyebrow style={{ marginRight: 4 }}>Platforms</Eyebrow>
        {portals.length === 0 && <span style={{ fontSize: 13, fontWeight: 600 }}>Save the job boards you check — one tap opens them.</span>}
        {portals.map((p) => {
          const days = Math.floor((now - new Date(p.lastCheckedAt ?? p.createdAt).getTime()) / DAY_MS);
          const stale = days >= STALE_DAYS;
          return (
            <span
              key={p.id}
              className="inline-flex items-center"
              style={{ border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontSize: 13, fontWeight: 700, overflow: "hidden" }}
            >
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => checked.mutate(p.id)}
                className="inline-flex items-center"
                style={{ gap: 6, padding: "4px 8px 4px 10px", color: "inherit", textDecoration: "none" }}
                title={stale ? `Not opened for ${days} days` : "Open"}
              >
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid var(--line)", background: stale ? "var(--tomato)" : "var(--mint)" }} />
                {p.label}
                {stale && <span style={{ fontWeight: 600, color: "var(--plainMuted)" }}>· {days}d</span>}
                <ArrowSquareOut size={12} weight="bold" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => remove.mutate(p.id)}
                aria-label={`Remove ${p.label}`}
                className="flex cursor-pointer items-center self-stretch"
                style={{ padding: "0 8px", border: 0, borderLeft: "2px solid var(--line)", background: "var(--plain2)", color: "inherit" }}
              >
                <X size={11} weight="bold" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex cursor-pointer items-center"
          style={{ height: 30, gap: 4, padding: "0 12px", border: "2px dashed var(--line)", borderRadius: 999, background: "transparent", color: "inherit", fontWeight: 700, fontSize: 13 }}
        >
          <Plus size={12} weight="bold" aria-hidden="true" />
          Add platform
        </button>
      </div>
      {adding && <AddPlatformModal saved={portals.map((p) => p.label.toLowerCase())} onClose={() => setAdding(false)} />}
    </Tile>
  );
}

function AddPlatformModal({ saved, onClose }: { saved: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const add = useMutation({
    mutationFn: (p: { label: string; url: string }) => api.addPortal(p),
    onSuccess: ({ portal }) => {
      void queryClient.invalidateQueries({ queryKey: ["portals"] });
      toast.success(`${portal.label} saved`);
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save it"),
  });
  const withScheme = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);
  const valid = label.trim().length > 0 && /\.[a-z]{2,}/i.test(url);
  const presets = PLATFORM_PRESETS.filter((p) => !saved.includes(p.label.toLowerCase()));

  return (
    <Modal
      tag="Jobs · platforms"
      title="Add a platform"
      subtitle="A job board you want one tap away."
      bg="var(--sky)"
      width={560}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton className="flex-1" disabled={!valid || add.isPending} onClick={() => add.mutate({ label: label.trim(), url: withScheme(url) })}>
            Save platform
          </PillButton>
        </>
      }
    >
      {presets.length > 0 && (
        <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
          <span style={eyebrow}>Suggestions · one tap saves</span>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {presets.map((p) => (
              <Chip key={p.label} style={{ border: "2px solid var(--line)", fontSize: 13 }} onClick={() => !add.isPending && add.mutate(p)}>
                + {p.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="grid shrink-0 grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
        <label className="flex min-w-0 flex-col" style={{ gap: 6 }}>
          <span style={eyebrow}>Name</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Azubi.de" maxLength={100} style={fieldInput} />
        </label>
        <label className="flex min-w-0 flex-col" style={{ gap: 6 }}>
          <span style={eyebrow}>Link</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g. azubi.de/jobs" inputMode="url" style={fieldInput} />
        </label>
      </div>
    </Modal>
  );
}

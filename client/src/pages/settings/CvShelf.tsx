import { useState, type ChangeEvent, type CSSProperties, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, Briefcase, DownloadSimple, Plus, PlusCircle, Star, Trash } from "@phosphor-icons/react";
import { api, downloadFile, uploadFile } from "../../api/client";
import type { Cv, CvKind } from "../../api/types";
import { Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { Kicker } from "./Kicker";
import { k, relativeDay } from "./ui";

/*
 * CV shelf (handoff §1.7): the documents stand on a plank; clicking one lifts it and shows the action bar. Uploads
 * guess the kind from the file name. Every document is real (server/src/routes/cvs.ts): "New version" uploads a
 * replacement file and the old ones are kept, and the default CV is the one Jobs preselects.
 */

const KIND_LABEL: Record<CvKind, string> = { cv: "CV", letter: "Letter", certificates: "Certificates" };
const KIND_BG: Record<CvKind, string> = { cv: "var(--lemon)", letter: "var(--pink)", certificates: "var(--sky)" };
const ROT = [-3, 2, -1.5, 3, -2.5, 1.5];
const ACCEPT = ".pdf,.doc,.docx";

const guessKind = (name: string): CvKind => (/zeugnis|cert/i.test(name) ? "certificates" : /anschreiben|letter/i.test(name) ? "letter" : "cv");
const baseName = (file: File) => file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Untitled document";
const pickedFile = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] ?? null;
  e.target.value = "";
  return file;
};

const actionBtn = {
  height: 34,
  padding: "0 12px",
  border: "2px solid var(--line)",
  borderRadius: 999,
  background: "var(--plain)",
  color: "var(--plainText)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 5,
  boxSizing: "border-box",
} as const;
const roundBtn = { ...actionBtn, width: 34, padding: 0, justifyContent: "center", borderRadius: "50%" } as const;

export function CvShelf({ bp, style }: { bp: Breakpoint; style: CSSProperties }) {
  const queryClient = useQueryClient();
  const { fill } = useBreakpoint();
  const { data } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const docs = data?.cvs ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cur = docs.find((d) => d.id === sel) ?? null;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["cvs"] });
  const select = (id: string | null) => {
    setSel(id);
    setConfirmRemove(false);
  };

  const add = useMutation({
    mutationFn: async (file: File) => {
      const meta = await uploadFile(file, { kind: "document" });
      return api.addCv({ title: baseName(file), kind: guessKind(file.name), fileId: meta.id });
    },
    onSuccess: ({ cv }) => {
      refresh();
      select(cv.id);
      toast.success(`On the shelf · ${cv.title.slice(0, 28)}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't upload that"),
  });
  const bump = useMutation({
    mutationFn: async ({ doc, file }: { doc: Cv; file: File }) => {
      const meta = await uploadFile(file, { kind: "document" });
      return api.addCvVersion(doc.id, meta.id);
    },
    onSuccess: ({ cv }) => {
      refresh();
      toast.success(`Saved as v${cv.version}. Old versions are kept.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't upload that"),
  });
  const makeDefault = useMutation({
    mutationFn: (doc: Cv) => api.makeDefaultCv(doc.id),
    onSuccess: ({ cv }) => {
      refresh();
      toast.success(`${cv.title} is the default CV`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't change it"),
  });
  const remove = useMutation({
    mutationFn: (doc: Cv) => api.deleteCv(doc.id),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      select(null);
      toast.info("Removed from the shelf");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't remove it"),
  });

  const onRemove = () => {
    if (!cur) return;
    if (cur.isDefault && docs.some((d) => d.kind === "cv" && d.id !== cur.id)) return toast.info("Pick another default CV first");
    if (!confirmRemove) return setConfirmRemove(true);
    remove.mutate(cur);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) add.mutate(file);
  };

  // lgfill: the grid row is fixed, so the documents shrink (up to their design height) to leave room for the action bar
  const lg = bp === "lg" && fill;
  const dw = bp === "sm" ? 128 : bp === "lg" ? 146 : 150;
  const dh = bp === "sm" ? 170 : bp === "lg" ? 188 : 196;
  const busy = add.isPending || bump.isPending;

  return (
    <Tile bg="var(--mint)" tilt={-0.4} className="flex flex-col" style={{ padding: bp === "sm" ? 16 : 20, gap: bp === "lg" ? 12 : 14, ...style }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: 10 }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <Kicker icon={<Briefcase size={16} weight="fill" aria-hidden="true" />}>CV shelf</Kicker>
          <span style={{ fontSize: k(24), fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05 }}>
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Jobs picks from this shelf when you add an application.</span>
        </div>
        <label
          className="flex cursor-pointer items-center"
          style={{ height: 40, padding: "0 15px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14, gap: 6, boxShadow: "3px 3px 0 var(--shadow)", boxSizing: "border-box", opacity: busy ? 0.6 : 1 }}
        >
          <Plus size={14} weight="bold" aria-hidden="true" />
          {add.isPending ? "Uploading…" : "Upload PDF"}
          <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => { const f = pickedFile(e); if (f) add.mutate(f); }} />
        </label>
      </div>

      <div className="flex min-h-0 flex-col justify-end overflow-hidden" style={{ flex: bp === "lg" ? 1 : "none", margin: "0 -4px", padding: "0 4px" }}>
        <div className={lg ? "flex min-h-0 flex-1 items-end overflow-x-auto" : "flex shrink-0 items-end overflow-x-auto"} style={{ gap: bp === "sm" ? 14 : 20, scrollbarWidth: "none", padding: "22px 14px 0", margin: "0 -4px" }}>
          {docs.map((d, i) => {
            const on = sel === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => select(on ? null : d.id)}
                aria-pressed={on}
                aria-label={`${d.title}, ${KIND_LABEL[d.kind]}, version ${d.version}${d.isDefault ? ", default CV" : ""}`}
                className="relative flex shrink-0 cursor-pointer flex-col text-left"
                style={{
                  width: dw,
                  height: lg ? "100%" : dh,
                  maxHeight: dh,
                  gap: 6,
                  padding: "16px 12px 12px",
                  background: "var(--plain)",
                  color: "var(--plainText)",
                  border: "2.5px solid var(--line)",
                  borderRadius: "4px 18px 4px 4px",
                  boxShadow: on ? "7px 7px 0 var(--shadow)" : "3px 3px 0 var(--shadow)",
                  transform: `translateY(${on ? -10 : 0}px) rotate(${on ? 0 : ROT[i % ROT.length]}deg)`,
                  transition: "transform .18s, box-shadow .18s",
                  boxSizing: "border-box",
                  transformOrigin: "bottom center",
                  font: "inherit",
                }}
              >
                <span aria-hidden="true" className="absolute" style={{ top: -9, left: "50%", marginLeft: -26, width: 52, height: 18, background: "var(--tape)", transform: "rotate(-5deg)", borderRadius: 3 }} />
                <span style={{ alignSelf: "flex-start", padding: "2px 8px", border: "2px solid var(--line)", borderRadius: 999, background: KIND_BG[d.kind], color: "var(--onTile)", fontSize: 11, fontWeight: 700 }}>{KIND_LABEL[d.kind]}</span>
                <span className="line-clamp-3 shrink-0 break-words" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.15 }}>
                  {d.title}
                </span>
                <span aria-hidden="true" className="flex flex-col" style={{ gap: 5, marginTop: 4 }}>
                  {[90, 70, 80].map((w) => (
                    <span key={w} style={{ height: 4, borderRadius: 2, background: "var(--rule)", width: `${w}%` }} />
                  ))}
                </span>
                <span style={{ marginTop: "auto", fontSize: 11, fontWeight: 700, color: "var(--plainMuted)" }}>
                  v{d.version} · {relativeDay(d.updatedAt)}
                </span>
                {d.isDefault && (
                  <span
                    className="absolute flex items-center"
                    style={{ right: -10, bottom: 34, gap: 4, padding: "4px 9px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--lemon)", color: "var(--onTile)", fontSize: 11, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(-8deg)" }}
                  >
                    <Star size={11} weight="fill" aria-hidden="true" />
                    Default
                  </span>
                )}
              </button>
            );
          })}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="flex shrink-0 cursor-pointer flex-col items-center justify-center"
            style={{
              width: dw,
              height: lg ? "100%" : dh,
              maxHeight: dh,
              gap: 6,
              border: "2.5px dashed var(--line)",
              borderRadius: "4px 18px 4px 4px",
              color: "var(--onTile)",
              background: dragging ? "var(--plain)" : "transparent",
              fontSize: 13,
              fontWeight: 700,
              boxSizing: "border-box",
              transform: "rotate(1.5deg)",
            }}
          >
            <PlusCircle size={22} weight="fill" aria-hidden="true" />
            <span>Drop a PDF</span>
            <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => { const f = pickedFile(e); if (f) add.mutate(f); }} />
          </label>
        </div>
        <div aria-hidden="true" className="shrink-0" style={{ height: 14, margin: "0 -6px", border: "2.5px solid var(--line)", borderRadius: 6, background: "var(--orange)", boxShadow: "3px 3px 0 var(--shadow)" }} />
      </div>

      {cur && (
        <div className="flex flex-wrap items-center" style={{ gap: 8, padding: "10px 12px", border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)" }}>
          <span style={{ flex: 1, minWidth: 160, fontSize: 13, fontWeight: 700 }}>
            {cur.title} · v{cur.version} · used in {cur.usedIn} application{cur.usedIn === 1 ? "" : "s"}
          </span>
          {cur.kind === "cv" && !cur.isDefault && (
            <button type="button" disabled={makeDefault.isPending} onClick={() => makeDefault.mutate(cur)} style={{ ...actionBtn, background: "var(--lemon)", color: "var(--onTile)" }}>
              <Star size={12} weight="fill" aria-hidden="true" />
              Make default
            </button>
          )}
          <label style={{ ...actionBtn, opacity: busy ? 0.6 : 1 }}>
            <ArrowCounterClockwise size={12} weight="bold" aria-hidden="true" />
            {bump.isPending ? "Uploading…" : "New version"}
            <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => { const f = pickedFile(e); if (f) bump.mutate({ doc: cur, file: f }); }} />
          </label>
          {cur.file && (
            <button type="button" aria-label={`Download ${cur.title}`} title="Download" onClick={() => downloadFile(cur.file!.id, cur.file!.originalName)} style={roundBtn}>
              <DownloadSimple size={13} weight="bold" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label={confirmRemove ? `Really remove ${cur.title}` : "Remove"}
            disabled={remove.isPending}
            onClick={onRemove}
            style={confirmRemove ? { ...actionBtn, background: "var(--tomato)", color: "var(--onTile)" } : roundBtn}
          >
            <Trash size={13} weight="fill" aria-hidden="true" />
            {confirmRemove && "Remove?"}
          </button>
        </div>
      )}
    </Tile>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { api, downloadFile } from "../../api/client";
import type { Cv } from "../../api/types";
import AddCvModal from "./AddCvModal";

const CATEGORY_LABELS: Record<Cv["category"], string> = {
  lebenslauf: "Lebenslauf",
  ats: "ATS",
};

/** Compact horizontal CV chip row — not in the handoff's 22 screens, kept
 * (real, already-working) alongside the reskinned Applications list rather
 * than dropped. Shared by both the mobile and desktop Applications layouts. */
export default function CvShelf() {
  const { data } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [adding, setAdding] = useState(false);
  const cvs = data?.cvs ?? [];

  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
        My CVs <span style={{ color: "rgba(233,233,237,.3)" }}>{cvs.length}</span>
      </p>
      <div className="flex touch-pan-x gap-2 overflow-x-auto [scrollbar-width:none]">
        {cvs.map((cv) => (
          <button
            key={cv.id}
            className="shrink-0 rounded-[11px] px-2.5 py-2 text-left"
            style={{
              background: cv.usedIn === 0 ? "#1c1f2c" : "rgba(145,132,217,.14)",
              boxShadow: cv.usedIn === 0 ? "none" : "0 0 0 1px rgba(145,132,217,.35)",
              opacity: cv.usedIn === 0 ? 0.7 : 1,
            }}
            title={`Download ${cv.file.originalName}`}
            onClick={() => downloadFile(cv.file.id, cv.file.originalName)}
          >
            <span className="block max-w-28 truncate text-[11.5px] font-medium" style={{ color: cv.usedIn === 0 ? "#e9e9ed" : "#d2cefd" }}>
              {cv.title}
            </span>
            <span className="block text-[10px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {CATEGORY_LABELS[cv.category]}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="grid shrink-0 place-items-center rounded-[11px] px-3"
          style={{ border: "1px dashed rgba(233,233,237,.18)", color: "rgba(233,233,237,.4)" }}
          title="Add a CV"
          onClick={() => setAdding(true)}
        >
          <Plus size={15} weight="regular" aria-hidden="true" />
        </button>
      </div>
      {adding && <AddCvModal onClose={() => setAdding(false)} />}
    </div>
  );
}

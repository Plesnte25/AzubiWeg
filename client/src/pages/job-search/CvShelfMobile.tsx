import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, downloadFile } from "../../api/client";
import type { Cv } from "../../api/types";
import AddCvModal from "./AddCvModal";

const CATEGORY_LABELS: Record<Cv["category"], string> = {
  lebenslauf: "Lebenslauf",
  ats: "ATS",
};

/** sm/md replacement for the lg CvShelf sidebar — demoted to a compact
 * horizontal chip row (still always visible, just smaller), per spec. */
export default function CvShelfMobile() {
  const { data } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [adding, setAdding] = useState(false);
  const cvs = data?.cvs ?? [];

  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-2 text-[11px] font-bold text-ink-600">
        MY CVs <span className="font-normal text-ink-300">{cvs.length}</span>
      </p>
      <div className="flex touch-pan-x gap-2 overflow-x-auto [scrollbar-width:none]">
        {cvs.map((cv) => (
          <button
            key={cv.id}
            className={`shrink-0 rounded-lg border px-2.5 py-2 text-left ${
              cv.usedIn === 0 ? "border-hairline bg-card opacity-60" : "border-brand-100 bg-brand-50"
            }`}
            title={`Download ${cv.file.originalName}`}
            onClick={() => downloadFile(cv.file.id, cv.file.originalName)}
          >
            <span className="block max-w-28 truncate text-[11px] font-semibold">{cv.title}</span>
            <span className="block text-[9.5px] text-ink-400">{CATEGORY_LABELS[cv.category]}</span>
          </button>
        ))}
        <button
          type="button"
          className="grid shrink-0 place-items-center rounded-lg border border-dashed border-hairline px-3 text-ink-300 hover:border-brand-400 hover:text-brand-700"
          title="Add a CV"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      {adding && <AddCvModal onClose={() => setAdding(false)} />}
    </div>
  );
}

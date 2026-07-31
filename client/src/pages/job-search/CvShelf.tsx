import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, downloadFile } from "../../api/client";
import type { Cv } from "../../api/types";
import AddCvModal from "./AddCvModal";

const CATEGORY_LABELS: Record<Cv["category"], string> = {
  lebenslauf: "Lebenslauf",
  ats: "ATS",
};

function metaLine(cv: Cv): string {
  if (cv.usedIn === 0) return `unused · ${relativeAge(cv.updatedAt)}`;
  return `used in ${cv.usedIn} · edited ${relativeAge(cv.updatedAt)}`;
}

function relativeAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CvShelf() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [adding, setAdding] = useState(false);

  const remove = useMutation({
    mutationFn: api.deleteCv,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cvs"] }),
  });

  const cvs = data?.cvs ?? [];

  return (
    <div className="w-[200px] shrink-0">
      <p className="mb-2 flex items-baseline gap-2 text-[11px] font-bold text-ink-600">
        MY CVs <span className="font-normal text-ink-300">{cvs.length}</span>
      </p>
      <div className="rounded-xl border border-hairline">
        {cvs.map((cv, i) => (
          <div
            key={cv.id}
            className={`group flex items-start justify-between gap-1.5 px-2.5 py-2.5 ${
              i < cvs.length - 1 ? "border-b border-hairline-soft" : ""
            }`}
          >
            <button
              className={`min-w-0 flex-1 text-left ${cv.usedIn === 0 ? "text-ink-300" : ""}`}
              title={`Download ${cv.file.originalName}`}
              onClick={() => downloadFile(cv.file.id, cv.file.originalName)}
            >
              <span className="block truncate text-xs font-semibold hover:text-brand-700">{cv.title}</span>
              <span className="mt-0.5 block text-[10.5px] text-ink-300">
                {CATEGORY_LABELS[cv.category]} · {metaLine(cv)}
              </span>
            </button>
            <button
              className="hidden shrink-0 text-[10px] text-ink-300 hover:text-danger-600 group-hover:inline"
              title="Delete CV"
              onClick={() => {
                if (confirm(`Delete "${cv.title}"?`)) remove.mutate(cv.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 w-full rounded-xl border border-dashed border-hairline px-2.5 py-2 text-center text-xs text-ink-400 hover:border-brand-400 hover:text-brand-700"
        onClick={() => setAdding(true)}
      >
        <Plus className="mr-1 inline size-3" aria-hidden="true" /> New CV
      </button>
      {adding && <AddCvModal onClose={() => setAdding(false)} />}
    </div>
  );
}

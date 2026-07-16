import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { CvTemplate } from "../api/types";

const TEMPLATE_LABELS: Record<CvTemplate, string> = {
  lebenslauf: "Lebenslauf (DE)",
  ats: "ATS (EN)",
};

export default function CvList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<CvTemplate>("lebenslauf");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cvs"] });
  const add = useMutation({
    mutationFn: () => api.addCv({ title: title.trim(), template }),
    onSuccess: ({ cv }) => {
      invalidate();
      navigate(`/cv/${cv.id}`);
    },
  });
  const duplicate = useMutation({ mutationFn: api.duplicateCv, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteCv, onSuccess: invalidate });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  const cvs = data?.cvs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">CVs</h1>
        <p className="text-sm text-ink-600">
          Tailor a Lebenslauf per Betrieb — and keep an ATS-friendly English version alongside.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate();
        }}
      >
        <input
          className="min-w-56 flex-1 rounded border border-hairline bg-card px-3 py-1.5 text-sm placeholder:text-ink-400"
          placeholder='New CV title, e.g. "Lebenslauf — Pflege"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="rounded border border-hairline bg-card px-2 py-1.5 text-sm"
          value={template}
          onChange={(e) => setTemplate(e.target.value as CvTemplate)}
        >
          {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={!title.trim() || add.isPending}
        >
          Create
        </button>
      </form>

      {cvs.length === 0 && (
        <p className="rounded-xl border border-hairline bg-card p-6 text-center text-sm text-ink-400">
          No CVs yet — create your first Lebenslauf above.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cvs.map((cv) => (
          <div key={cv.id} className="rounded-xl border border-hairline bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/cv/${cv.id}`} className="font-medium hover:text-brand-600">
                {cv.title}
              </Link>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                {TEMPLATE_LABELS[cv.template]}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">
              updated {new Date(cv.updatedAt).toLocaleDateString()}
            </p>
            <div className="mt-3 flex gap-2">
              <Link to={`/cv/${cv.id}`} className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper">
                Edit
              </Link>
              <button
                className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
                onClick={() => duplicate.mutate(cv.id)}
              >
                Duplicate
              </button>
              <button
                className="rounded border border-hairline px-2 py-1 text-xs text-ink-400 hover:text-danger-600"
                onClick={() => {
                  if (confirm(`Delete "${cv.title}"?`)) remove.mutate(cv.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

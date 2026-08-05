import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { api, uploadFile } from "../../api/client";
import type { CvCategory } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../lib/cn";
import { Field, inputCls } from "./shared";

const CATEGORIES: { value: CvCategory; label: string; description: string }[] = [
  { value: "lebenslauf", label: "Lebenslauf (DE)", description: "German-format CV" },
  { value: "ats", label: "ATS (EN)", description: "ATS-friendly English CV" },
];

export default function AddCvModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CvCategory>("lebenslauf");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first");
      const uploaded = await uploadFile(file, { kind: "document" });
      return api.addCv({
        title: title.trim() || `Untitled — ${category === "lebenslauf" ? "Lebenslauf" : "ATS"}`,
        category,
        fileId: uploaded.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <Modal title="Add a CV" onClose={onClose} size="md" sheetOnSm>
      <p className="-mt-3 mb-4 text-sm text-ink-400">
        Upload a file you already have — nothing is built or edited here
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (file) save.mutate();
        }}
      >
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "flex-1 rounded-xl p-3 text-center",
                category === c.value ? "border-2 border-ink-900 bg-paper" : "border border-hairline bg-card",
              )}
            >
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="mt-0.5 text-xs text-ink-400">{c.description}</p>
            </button>
          ))}
        </div>

        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Ausbildung Elektroniker"'
          />
        </Field>

        <label
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed px-4 py-7 text-center text-sm",
            dragOver ? "border-brand-400 bg-brand-50" : "border-hairline bg-paper",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) {
              setError(null);
              setFile(f);
            }
          }}
        >
          <UploadCloud className="size-5 text-ink-400" aria-hidden="true" />
          {file ? (
            <span className="font-medium text-ink-900">{file.name}</span>
          ) : (
            <span className="text-ink-400">Drop a PDF or Word file, or browse.</span>
          )}
          <input
            type="file"
            hidden
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>

        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!file}>
            Save CV
          </Button>
        </div>
      </form>
    </Modal>
  );
}

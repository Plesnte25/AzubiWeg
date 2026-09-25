import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudArrowUp } from "@phosphor-icons/react";
import { api, uploadFile } from "../../api/client";
import type { CvKind } from "../../api/types";
import { Chip } from "../../components/ui/Chip";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { eyebrow, fieldInput } from "../../components/ui/fields";

/** Add a CV (Settings → CVs): upload a file you already have; nothing is built or edited here. */

const CATEGORIES: { value: CvKind; label: string }[] = [
  { value: "cv", label: "CV" },
  { value: "letter", label: "Letter" },
  { value: "certificates", label: "Certificates" },
];

export default function AddCvModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CvKind>("cv");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const uploaded = await uploadFile(file!, { kind: "document" });
      return api.addCv({
        title: title.trim() || `Untitled · ${CATEGORIES.find((c) => c.value === category)!.label}`,
        kind: category,
        fileId: uploaded.id,
      });
    },
    onSuccess: ({ cv }) => {
      void queryClient.invalidateQueries({ queryKey: ["cvs"] });
      toast.success(`${cv.title} added`);
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the CV"),
  });

  return (
    <Modal
      tag="Settings · CVs"
      title="Add a CV"
      subtitle="Upload a file you already have. Applications can then point at it."
      bg="var(--mint)"
      width={520}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton className="flex-1" disabled={!file || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Uploading…" : "Save CV"}
          </PillButton>
        </>
      }
    >
      <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
        <span style={eyebrow}>Kind</span>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} selected={category === c.value} selectedTilt={-1.5} style={{ border: "2px solid var(--line)", fontSize: 13 }} onClick={() => setCategory(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <label className="flex shrink-0 flex-col" style={{ gap: 6 }}>
        <span style={eyebrow}>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ausbildung Elektroniker · v3" style={fieldInput} />
      </label>
      <label
        className="flex shrink-0 cursor-pointer flex-col items-center text-center"
        style={{
          gap: 6,
          padding: "26px 16px",
          border: "2.5px dashed var(--line)",
          borderRadius: 16,
          background: dragOver ? "var(--plain)" : "transparent",
          color: dragOver ? "var(--plainText)" : "inherit",
          fontSize: 14,
          fontWeight: 700,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
      >
        <CloudArrowUp size={22} weight="fill" aria-hidden="true" />
        {file ? file.name : "Drop a PDF or Word file, or browse."}
        <input type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
    </Modal>
  );
}

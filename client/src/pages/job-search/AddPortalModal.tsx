import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, inputCls } from "./shared";

export default function AddPortalModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const add = useMutation({
    mutationFn: () => api.addPortal({ label: label.trim(), url: url.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portals"] });
      onClose();
    },
  });

  return (
    <Modal title="Add a portal" onClose={onClose} size="sm" sheetOnSm>
      <p className="-mt-3 mb-4 text-sm text-ink-400">Save a job board you check regularly</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim() && url.trim()) add.mutate();
        }}
      >
        <Field label="Portal name">
          <input
            autoFocus
            className={inputCls}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. "Ausbildung.de"'
          />
        </Field>
        <Field label="Portal URL">
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        {add.isError && <p className="text-sm text-danger-600">{(add.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending} disabled={!label.trim() || !url.trim()}>
            Save portal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

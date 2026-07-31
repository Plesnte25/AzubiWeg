import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { ChecklistCategory } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { CATEGORY_LABEL } from "./shared";

const inputCls = "w-full rounded border border-hairline bg-card px-2.5 py-1.5 text-sm placeholder:text-ink-300";

export default function AddItemModal({
  category,
  onClose,
}: {
  category: ChecklistCategory;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const add = useMutation({
    mutationFn: () => api.addChecklistItem({ title: title.trim(), description: description.trim() || undefined, category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
      onClose();
    },
  });

  return (
    <Modal title="Add checklist item" onClose={onClose} size="sm">
      <p className="-mt-3 mb-4 text-sm text-ink-400">Added to {CATEGORY_LABEL[category]}</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-ink-600">Title</span>
          <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-600">Description</span>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {add.isError && <p className="text-sm text-danger-600">{(add.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending} disabled={!title.trim()}>
            Add item
          </Button>
        </div>
      </form>
    </Modal>
  );
}

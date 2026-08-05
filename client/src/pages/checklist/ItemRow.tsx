import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { api, downloadFile, uploadFile } from "../../api/client";
import type { ChecklistItem, ChecklistStatus } from "../../api/types";
import { cn } from "../../lib/cn";
import { daysUntil } from "./deadline";
import DeadlineBadge from "./DeadlineBadge";

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  not_applicable: "N/A",
};

export default function ItemRow({ item, first }: { item: ChecklistItem; first: boolean }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["checklist"] });
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.updateChecklistItem>[1]) => api.updateChecklistItem(item.id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: () => api.deleteChecklistItem(item.id), onSuccess: invalidate });
  const removeFile = useMutation({ mutationFn: api.deleteFile, onSuccess: invalidate });

  const isDone = item.status === "done";
  const isNa = item.status === "not_applicable";

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await uploadFile(file, { kind: "document", checklistItemId: item.id });
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-3.5 py-2.5 md:flex-row md:items-center md:gap-2.5",
        !first && "border-t border-hairline-soft",
        isNa && "opacity-55",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5 md:flex-1 md:items-center">
        <button
          type="button"
          aria-label={isDone ? "Mark as to do" : "Mark as done"}
          onClick={() => update.mutate({ status: isDone ? "todo" : "done" })}
          className={cn(
            "mt-0.5 size-4 shrink-0 rounded-[5px] md:mt-0",
            isDone ? "bg-ink-900" : "border-[1.5px] border-ink-300",
          )}
        />

        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] font-medium", isDone && "text-ink-300 line-through")}>{item.title}</p>
          {item.description && <p className="mt-0.5 text-[11px] text-ink-300">{item.description}</p>}
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
          {item.files.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.files.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-full bg-hairline-soft px-2 py-0.5 text-[10px] text-ink-600"
                >
                  <button
                    className="max-w-40 truncate hover:text-brand-700 hover:underline"
                    title={`Download ${f.originalName}`}
                    onClick={() => downloadFile(f.id, f.originalName)}
                  >
                    📎 {f.originalName}
                  </button>
                  <button
                    className="text-ink-300 hover:text-danger-600"
                    title="Remove file"
                    onClick={() => removeFile.mutate(f.id)}
                  >
                    <X className="size-2.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* pl-[26px] on sm/md aligns this row under the title (checkbox
          size-4 + gap-2.5) since it wraps onto its own line below md */}
      <div className="flex shrink-0 items-center gap-2 pl-[26px] md:pl-0">
        {item.expiresAt && <DeadlineBadge days={daysUntil(item.expiresAt)} />}

        <select
          className="h-[26px] w-[104px] shrink-0 rounded-[6px] border border-hairline bg-paper px-1.5 text-xs"
          value={item.status}
          onChange={(e) => update.mutate({ status: e.target.value as ChecklistStatus })}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          title="Attach a file"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="shrink-0 text-ink-300 hover:text-brand-700"
        >
          <Paperclip className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={() => {
            if (confirm(`Delete "${item.title}"${item.files.length ? " and its files" : ""}?`)) remove.mutate();
          }}
          className="shrink-0 text-ink-300 hover:text-danger-600"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

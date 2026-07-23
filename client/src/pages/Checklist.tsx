import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Paperclip, Trash2, X } from "lucide-react";
import { api, downloadFile, uploadFile } from "../api/client";
import type { ChecklistCategory, ChecklistItem, ChecklistStatus, ExpiryStatus } from "../api/types";
import FillBar from "../components/FillBar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";

const CATEGORIES: { key: ChecklistCategory; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "education", label: "Education & language" },
  { key: "application", label: "Application" },
  { key: "visa", label: "Visa" },
  { key: "finances", label: "Finances" },
  { key: "insurance", label: "Insurance" },
  { key: "after_arrival", label: "After arrival" },
  { key: "other", label: "Other" },
];

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  not_applicable: "N/A",
};

const EXPIRY_VARIANT: Record<ExpiryStatus, "success" | "warning" | "danger"> = {
  ok: "success",
  warn: "warning",
  urgent: "danger",
  expired: "danger",
};

const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
  ok: "valid",
  warn: "expiring soon",
  urgent: "expires very soon",
  expired: "expired",
};

export default function Checklist() {
  const { data, isLoading } = useQuery({ queryKey: ["checklist"], queryFn: api.checklist });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-2 w-full rounded-full" />
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
      </div>
    );
  }
  const items = data?.items ?? [];

  const relevant = items.filter((i) => i.status !== "not_applicable");
  const done = relevant.filter((i) => i.status === "done").length;
  const pct = relevant.length ? Math.round((done / relevant.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Document checklist</h1>
          <p className="text-sm text-ink-600">
            Everything you need for the Ausbildung visa and your first weeks in Germany.
          </p>
        </div>
        <div className="text-sm text-ink-600">
          {done} of {relevant.length} done
        </div>
      </div>

      <FillBar percent={pct} />

      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key);
        return (
          <section key={cat.key} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{cat.label}</h2>
            {catItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            <AddItemForm category={cat.key} />
          </section>
        );
      })}
    </div>
  );
}

function ItemRow({ item }: { item: ChecklistItem }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["checklist"] });
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.updateChecklistItem>[1]) =>
      api.updateChecklistItem(item.id, data),
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
    <Card className={isNa ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={`flex items-center font-medium ${isDone ? "text-ink-400 line-through" : ""}`}>
            {isDone && <Check className="mr-1 size-4 shrink-0 text-brand-500" aria-hidden="true" />}
            {item.title}
          </p>
          {item.description && <p className="mt-0.5 text-sm text-ink-600">{item.description}</p>}
          {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
          {item.files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.files.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-paper px-2 py-0.5 text-xs"
                >
                  <button
                    className="max-w-48 truncate hover:text-brand-700 hover:underline"
                    title={`Download ${f.originalName}`}
                    onClick={() => downloadFile(f.id, f.originalName)}
                  >
                    {f.originalName}
                  </button>
                  <button
                    className="text-ink-400 hover:text-danger-600"
                    title="Remove file"
                    onClick={() => removeFile.mutate(f.id)}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {item.expiry && <Badge variant={EXPIRY_VARIANT[item.expiry]}>{EXPIRY_LABELS[item.expiry]}</Badge>}
          <input
            type="date"
            className="rounded border border-hairline bg-paper px-2 py-1 text-xs"
            title="Expiry / due date"
            value={item.expiresAt ? item.expiresAt.slice(0, 10) : ""}
            onChange={(e) => update.mutate({ expiresAt: e.target.value || null })}
          />
          <select
            className="rounded border border-hairline bg-paper px-2 py-1 text-xs"
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
          <Button
            variant="outline"
            size="sm"
            loading={uploading}
            leftIcon={<Paperclip className="size-3.5" aria-hidden="true" />}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? "Uploading…" : "Attach"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
            leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
            onClick={() => {
              if (confirm(`Delete "${item.title}"${item.files.length ? " and its files" : ""}?`)) {
                remove.mutate();
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AddItemForm({ category }: { category: ChecklistCategory }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const add = useMutation({
    mutationFn: () => api.addChecklistItem({ title: title.trim(), category }),
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
    },
  });

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) add.mutate();
      }}
    >
      <Input className="flex-1" placeholder="Add an item…" value={title} onChange={(e) => setTitle(e.target.value)} />
      {title.trim() && (
        <Button size="sm" loading={add.isPending}>
          Add
        </Button>
      )}
    </form>
  );
}

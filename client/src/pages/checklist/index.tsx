import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Search } from "lucide-react";
import { api } from "../../api/client";
import type { ChecklistCategory, ChecklistItem } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import AddItemModal from "./AddItemModal";
import CategoryGrid from "./CategoryGrid";
import ItemRow from "./ItemRow";
import { CATEGORY_LABEL } from "./shared";
import UpNextPanel from "./UpNextPanel";

const FALLBACK_CATEGORY: ChecklistCategory = "other";

export default function Checklist() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["checklist"], queryFn: api.checklist });
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ChecklistCategory | null>(null);
  const [adding, setAdding] = useState(false);

  const toggleDone = useMutation({
    mutationFn: (item: ChecklistItem) =>
      api.updateChecklistItem(item.id, { status: item.status === "done" ? "todo" : "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-56" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-20" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const applicable = items.filter((i) => i.status !== "not_applicable");
  const done = applicable.filter((i) => i.status === "done").length;
  const needsAttention = applicable.filter((i) => {
    if (i.status === "done" || !i.expiresAt) return false;
    const days = Math.round((new Date(i.expiresAt).getTime() - Date.now()) / 86_400_000);
    return days <= 7;
  }).length;

  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => {
    if (activeCategory && i.category !== activeCategory) return false;
    if (!q) return true;
    return i.title.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-[1020px] space-y-4 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.015em]">Checklist</h1>
          <p className="text-[13px] text-ink-400">
            {done} of {applicable.length} done
            {needsAttention > 0 && ` · ${needsAttention} item${needsAttention === 1 ? "" : "s"} need attention this week`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              className="h-9 w-48 rounded-[9px] border border-hairline bg-card pl-8 pr-2.5 text-sm placeholder:text-ink-300"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
            onClick={() => setAdding(true)}
          >
            Add item
          </Button>
        </div>
      </div>

      <UpNextPanel items={items} onToggleDone={(item) => toggleDone.mutate(item)} />

      <CategoryGrid items={items} activeCategory={activeCategory} onToggle={(key) => setActiveCategory((c) => (c === key ? null : key))} />

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[11px] font-bold text-ink-400">
            ALL ITEMS{activeCategory ? ` · FILTERED BY ${CATEGORY_LABEL[activeCategory].toUpperCase()}` : ""}
          </p>
          {activeCategory && (
            <button
              type="button"
              className="text-[11px] font-semibold text-brand-600 hover:underline"
              onClick={() => setActiveCategory(null)}
            >
              Clear filter ✕
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No matching items" description="Try a different search or category." />
        ) : (
          <div className="rounded-[14px] border border-hairline bg-card">
            {visible.map((item, i) => (
              <ItemRow key={item.id} item={item} first={i === 0} />
            ))}
          </div>
        )}

        {activeCategory && (
          <button
            type="button"
            className="mt-2 w-full rounded-[14px] border border-dashed border-hairline py-2 text-center text-sm text-ink-400 hover:border-brand-400 hover:text-brand-700"
            onClick={() => setAdding(true)}
          >
            + Add item to {CATEGORY_LABEL[activeCategory]}
          </button>
        )}
      </div>

      {adding && <AddItemModal category={activeCategory ?? FALLBACK_CATEGORY} onClose={() => setAdding(false)} />}
    </div>
  );
}

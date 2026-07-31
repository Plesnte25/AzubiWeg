import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { api } from "../../api/client";
import type { Application, ApplicationStatus } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { cn } from "../../lib/cn";

const COLUMNS: { key: ApplicationStatus; label: string; colorClass: string }[] = [
  { key: "wishlist", label: "Wishlist", colorClass: "text-ink-400" },
  { key: "applied", label: "Applied", colorClass: "text-ink-400" },
  { key: "interview", label: "Interview", colorClass: "text-warn-500" },
  { key: "offer", label: "Offer", colorClass: "text-ok-600" },
  { key: "rejected", label: "Rejected", colorClass: "text-brand-500" },
];

const STAGE_BORDER: Record<ApplicationStatus, string> = {
  wishlist: "border-l-ink-400",
  applied: "border-l-ink-400",
  interview: "border-l-warn-500",
  offer: "border-l-ok-600",
  rejected: "border-l-brand-500",
};

export default function Board({ onOpen }: { onOpen: (id: string) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const [dragged, setDragged] = useState<Application | null>(null);

  const sensors = useSensors(
    // distance keeps plain clicks (open detail) from starting a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const move = useMutation({
    mutationFn: ({ id, status, index }: { id: string; status: ApplicationStatus; index: number }) =>
      api.moveApplication(id, status, index),
    onMutate: async ({ id, status, index }) => {
      await queryClient.cancelQueries({ queryKey: ["applications"], exact: true });
      const previous = queryClient.getQueryData<{ applications: Application[] }>(["applications"]);
      if (previous) {
        const rest = previous.applications.filter((a) => a.id !== id);
        const moved = previous.applications.find((a) => a.id === id);
        if (moved) {
          const target = rest.filter((a) => a.status === status);
          const before = target[Math.min(index, target.length - 1)];
          const updated = { ...moved, status };
          const list: Application[] = [];
          for (const a of rest) {
            if (a === before && index < target.length) list.push(updated);
            list.push(a);
          }
          if (!before || index >= target.length) list.push(updated);
          queryClient.setQueryData(["applications"], { applications: list });
        }
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["applications"], ctx.previous);
    },
    onSuccess: (fresh) => queryClient.setQueryData(["applications"], fresh),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  if (isLoading) return <p className="text-ink-300">Loading…</p>;
  const applications = data?.applications ?? [];

  function onDragEnd(e: DragEndEvent) {
    setDragged(null);
    const { active, over } = e;
    if (!over) return;
    const app = applications.find((a) => a.id === active.id);
    if (!app) return;

    let status: ApplicationStatus;
    let index: number;
    if (COLUMNS.some((c) => c.key === over.id)) {
      status = over.id as ApplicationStatus;
      index = applications.filter((a) => a.status === status && a.id !== app.id).length;
    } else {
      const target = applications.find((a) => a.id === over.id);
      if (!target) return;
      status = target.status;
      index = applications.filter((a) => a.status === status).findIndex((a) => a.id === target.id);
    }
    if (status === app.status && applications.filter((a) => a.status === status)[index]?.id === app.id) return;
    move.mutate({ id: app.id, status, index });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setDragged(applications.find((a) => a.id === e.active.id) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      <div className="flex min-w-0 flex-1 gap-[9px] overflow-hidden">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            column={col}
            items={applications.filter((a) => a.status === col.key)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>{dragged && <AppCard app={dragged} overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  items,
  onOpen,
}: {
  column: (typeof COLUMNS)[number];
  items: Application[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div className={cn("min-w-0 flex-1", column.key === "rejected" && "opacity-65")}>
      <p className={cn("mb-1.5 flex items-baseline gap-1.5 text-[11px] font-bold", column.colorClass)}>
        {column.label.toUpperCase()} <span className="font-normal text-ink-300">· {items.length}</span>
      </p>
      <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-32 rounded-xl border p-1.5 transition-colors",
            isOver ? "border-brand-400 bg-brand-50" : "border-transparent",
          )}
        >
          {items.length === 0 ? (
            <EmptyState icon={Briefcase} title="Empty" className="border-0 bg-transparent p-3 shadow-none" />
          ) : (
            items.map((app) => <SortableCard key={app.id} app={app} onOpen={onOpen} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ app, onOpen }: { app: Application; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("mb-[7px]", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(app.id)}
    >
      <AppCard app={app} />
    </div>
  );
}

function AppCard({ app, overlay = false }: { app: Application; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-[10px] border border-hairline bg-card px-2.5 py-2.5",
        "border-l-[3px]",
        STAGE_BORDER[app.status],
        overlay && "shadow-lg",
      )}
    >
      <p className="text-[12.5px] font-bold">{app.company}</p>
      <p className="text-[11px] text-ink-400">
        {app.role}
        {app.location ? ` · ${app.location}` : ""}
      </p>
      {app.cv && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
          📄 {app.cv.title}
        </span>
      )}
    </div>
  );
}

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
import { api } from "../api/client";
import type { Application, ApplicationEvent, ApplicationStatus } from "../api/types";
import ActivityChart from "../components/ActivityChart";

const COLUMNS: { key: ApplicationStatus; label: string }[] = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
];

const EVENT_LABELS: Record<ApplicationEvent["type"], string> = {
  created: "Created",
  status_change: "Status changed",
  note: "Note",
  interview: "Interview",
  follow_up: "Follow-up",
};

export default function Applications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const { data: statsData } = useQuery({
    queryKey: ["applications", "stats"],
    queryFn: api.applicationStats,
  });
  const [dragged, setDragged] = useState<Application | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    // distance keeps plain clicks (open detail, buttons) from starting a drag
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  const applications = data?.applications ?? [];
  const stats = statsData?.stats;

  function onDragEnd(e: DragEndEvent) {
    setDragged(null);
    const { active, over } = e;
    if (!over) return;
    const app = applications.find((a) => a.id === active.id);
    if (!app) return;

    let status: ApplicationStatus;
    let index: number;
    if (COLUMNS.some((c) => c.key === over.id)) {
      // dropped on the column body (possibly empty) → append
      status = over.id as ApplicationStatus;
      index = applications.filter((a) => a.status === status && a.id !== app.id).length;
    } else {
      const target = applications.find((a) => a.id === over.id);
      if (!target) return;
      status = target.status;
      index = applications.filter((a) => a.status === status).findIndex((a) => a.id === target.id);
    }
    if (status === app.status && applications.filter((a) => a.status === status)[index]?.id === app.id) {
      return; // dropped on itself
    }
    move.mutate({ id: app.id, status, index });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="text-sm text-ink-600">Track every Ausbildung application from wishlist to offer.</p>
        </div>
        <button className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white" onClick={() => setAdding(true)}>
          New application
        </button>
      </div>

      <PortalsRow />

      {stats && stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Active" value={stats.active} />
          <Tile
            label="Response rate"
            value={stats.responseRate === null ? "—" : `${Math.round(stats.responseRate * 100)}%`}
          />
          <Tile
            label="Interview rate"
            value={stats.interviewRate === null ? "—" : `${Math.round(stats.interviewRate * 100)}%`}
          />
          <Tile
            label="Avg. days to response"
            value={stats.avgDaysToResponse === null ? "—" : stats.avgDaysToResponse}
          />
        </div>
      )}

      {stats && stats.weeklyActivity.some((w) => w.applied > 0) && (
        <div className="rounded-xl border border-hairline bg-card p-4">
          <p className="mb-2 text-sm font-medium text-ink-600">Applications per week</p>
          <ActivityChart
            data={stats.weeklyActivity.map((w) => ({ date: w.weekStart, count: w.applied }))}
            unit="applications"
            ariaLabel="Applications per week, last 8 weeks"
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) =>
          setDragged(applications.find((a) => a.id === e.active.id) ?? null)
        }
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragged(null)}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-3">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                column={col}
                items={applications.filter((a) => a.status === col.key)}
                onOpen={setOpenId}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{dragged && <Card app={dragged} overlay />}</DragOverlay>
      </DndContext>

      {adding && <AddDialog onClose={() => setAdding(false)} />}
      {openId && <DetailPanel id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/**
 * Quick links to the portals where applications actually live (GoAusbildung
 * etc.). Links only — none of these platforms offer a public API, so there is
 * no account sync yet.
 */
function PortalsRow() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["portals"], queryFn: api.portals });
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portals"] });
  const markChecked = useMutation({
    mutationFn: api.markPortalChecked,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const add = useMutation({
    mutationFn: () => api.addPortal({ label: label.trim(), url: url.trim() }),
    onSuccess: () => {
      setLabel("");
      setUrl("");
      setAdding(false);
      setError(null);
      invalidate();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });
  const remove = useMutation({ mutationFn: api.deletePortal, onSuccess: invalidate });

  const portals = data?.portals ?? [];

  return (
    <div className="rounded-xl border border-hairline bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink-600">Portals</span>
        {portals.length === 0 && !adding && (
          <span className="text-sm text-ink-400">
            Add the portals you apply through — GoAusbildung, Ausbildung.de… (quick links, not
            synced accounts: no official APIs yet)
          </span>
        )}
        {portals.map((p) => (
          <span
            key={p.id}
            className="group inline-flex items-center gap-1 rounded-full border border-hairline bg-paper px-3 py-1 text-sm hover:border-brand-400"
          >
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-600"
              onClick={() => markChecked.mutate(p.id)}
            >
              {p.label} ↗
            </a>
            <button
              className="hidden text-ink-400 hover:text-danger-600 group-hover:inline"
              title="Remove portal"
              onClick={() => remove.mutate(p.id)}
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (label.trim() && url.trim()) add.mutate();
            }}
          >
            <input
              autoFocus
              className="w-32 rounded border border-hairline bg-paper px-2 py-1 text-sm"
              placeholder="GoAusbildung"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className="w-56 rounded border border-hairline bg-paper px-2 py-1 text-sm"
              placeholder="https://goausbildung.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="rounded bg-ink-900 px-2.5 py-1 text-sm text-white" disabled={add.isPending}>
              Add
            </button>
            <button type="button" className="text-sm text-ink-400" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="rounded-full border border-hairline px-2.5 py-0.5 text-sm text-ink-600 hover:bg-paper"
            onClick={() => setAdding(true)}
          >
            + portal
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-hairline bg-card p-4">
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Column({
  column,
  items,
  onOpen,
}: {
  column: { key: ApplicationStatus; label: string };
  items: Application[];
  onOpen: (id: string) => void;
}) {
  // column-level droppable so drops into an empty column register
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div className="w-64 shrink-0">
      <p className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
        {column.label}
        <span className="font-normal text-ink-400">{items.length}</span>
      </p>
      <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-32 space-y-2 rounded-xl border p-2 transition-colors ${
            isOver ? "border-brand-400 bg-brand-50" : "border-hairline bg-paper"
          }`}
        >
          {items.map((app) => (
            <SortableCard key={app.id} app={app} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ app, onOpen }: { app: Application; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(app.id)}
    >
      <Card app={app} />
    </div>
  );
}

function Card({ app, overlay = false }: { app: Application; overlay?: boolean }) {
  return (
    <div
      className={`cursor-grab rounded-lg border border-hairline bg-card p-3 text-sm ${
        overlay ? "shadow-lg" : "hover:border-brand-400"
      }`}
    >
      <p className="font-medium">{app.company}</p>
      <p className="text-ink-600">{app.position}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-400">
        {app.location && <span>{app.location}</span>}
        {app.appliedAt && <span>applied {app.appliedAt.slice(0, 10)}</span>}
        {app.platform && (
          <span className="rounded-full border border-hairline bg-paper px-1.5">{app.platform}</span>
        )}
        {app.cv && <span className="rounded-full bg-brand-50 px-1.5 text-brand-600">{app.cv.title}</span>}
      </div>
    </div>
  );
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: portalsData } = useQuery({ queryKey: ["portals"], queryFn: api.portals });
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("wishlist");

  const add = useMutation({
    mutationFn: () =>
      api.addApplication({
        company: company.trim(),
        position: position.trim(),
        location: location.trim() || null,
        url: url.trim() || null,
        platform: platform.trim() || null,
        platformUrl: platformUrl.trim() || null,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
  });

  return (
    <Modal title="New application" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (company.trim() && position.trim()) add.mutate();
        }}
      >
        <Field label="Company *">
          <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} autoFocus />
        </Field>
        <Field label="Position *">
          <input
            className={inputCls}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Ausbildung Fachinformatiker"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="Column">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Job posting URL">
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Portal">
            <input
              className={inputCls}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="GoAusbildung"
              list="portal-labels"
            />
            <datalist id="portal-labels">
              {(portalsData?.portals ?? []).map((p) => (
                <option key={p.id} value={p.label} />
              ))}
            </datalist>
          </Field>
          <Field label="Link on that portal">
            <input
              className={inputCls}
              value={platformUrl}
              onChange={(e) => setPlatformUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
        {add.isError && <p className="text-sm text-danger-600">{(add.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="rounded border border-hairline px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded bg-ink-900 px-3 py-1.5 text-sm text-white" disabled={add.isPending}>
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => api.application(id) });
  const { data: cvData } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"note" | "interview" | "follow_up">("note");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  };
  const update = useMutation({
    mutationFn: (d: Parameters<typeof api.updateApplication>[1]) => api.updateApplication(id, d),
    onSuccess: invalidate,
  });
  const addEvent = useMutation({
    mutationFn: () => api.addApplicationEvent(id, { type: noteType, note: note.trim() || undefined }),
    onSuccess: () => {
      setNote("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteApplication(id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const app = data?.application;
  if (!app) return null;

  return (
    <Modal title={`${app.company} — ${app.position}`} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <select
            className={inputCls}
            value={app.status}
            onChange={(e) => update.mutate({ status: e.target.value as ApplicationStatus })}
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Applied on">
          <input
            type="date"
            className={inputCls}
            value={app.appliedAt ? app.appliedAt.slice(0, 10) : ""}
            onChange={(e) => update.mutate({ appliedAt: e.target.value || null })}
          />
        </Field>
        <Field label="CV used">
          <select
            className={inputCls}
            value={app.cvId ?? ""}
            onChange={(e) => update.mutate({ cvId: e.target.value || null })}
          >
            <option value="">—</option>
            {(cvData?.cvs ?? []).map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact email">
          <DebouncedInput
            value={app.contactEmail ?? ""}
            onCommit={(v) => update.mutate({ contactEmail: v || null })}
          />
        </Field>
        <Field label="Portal">
          <DebouncedInput
            value={app.platform ?? ""}
            onCommit={(v) => update.mutate({ platform: v || null })}
          />
        </Field>
        <Field label="Link on that portal">
          <DebouncedInput
            value={app.platformUrl ?? ""}
            onCommit={(v) => update.mutate({ platformUrl: v || null })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <DebouncedInput
              textarea
              value={app.notes ?? ""}
              onCommit={(v) => update.mutate({ notes: v || null })}
            />
          </Field>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        {app.url && (
          <a className="text-sm text-brand-600 hover:underline" href={app.url} target="_blank" rel="noreferrer">
            Job posting ↗
          </a>
        )}
        {app.platformUrl && (
          <a
            className="text-sm text-brand-600 hover:underline"
            href={app.platformUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open on {app.platform || "portal"} ↗
          </a>
        )}
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <p className="mb-2 text-sm font-semibold">Timeline</p>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addEvent.mutate();
          }}
        >
          <select
            className="rounded border border-hairline bg-paper px-2 py-1 text-xs"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as typeof noteType)}
          >
            <option value="note">Note</option>
            <option value="interview">Interview</option>
            <option value="follow_up">Follow-up</option>
          </select>
          <input
            className="flex-1 rounded border border-hairline bg-card px-2 py-1 text-sm"
            placeholder="What happened?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="rounded bg-ink-900 px-3 py-1 text-xs text-white" disabled={addEvent.isPending}>
            Log
          </button>
        </form>
        <ul className="space-y-2">
          {app.events.map((ev) => (
            <li key={ev.id} className="flex gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
              <div>
                <span className="font-medium">{EVENT_LABELS[ev.type]}</span>
                {ev.type === "status_change" && ev.toStatus && (
                  <span className="text-ink-600">
                    {" "}
                    {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                    {ev.toStatus}
                  </span>
                )}
                {ev.note && <span className="text-ink-600"> — {ev.note}</span>}
                <span className="ml-1 text-xs text-ink-400">
                  {new Date(ev.occurredAt).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex justify-end border-t border-hairline pt-3">
        <button
          className="rounded border border-hairline px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50"
          onClick={() => {
            if (confirm(`Delete the application at ${app.company}?`)) remove.mutate();
          }}
        >
          Delete application
        </button>
      </div>
    </Modal>
  );
}

function DebouncedInput({
  value,
  onCommit,
  textarea = false,
}: {
  value: string;
  onCommit: (v: string) => void;
  textarea?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const props = {
    className: inputCls,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
  };
  return textarea ? <textarea rows={3} {...props} /> : <input {...props} />;
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full rounded-xl border border-hairline bg-card p-5 shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-ink-400 hover:text-ink-900" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-hairline bg-card px-2.5 py-1.5 text-sm placeholder:text-ink-400";

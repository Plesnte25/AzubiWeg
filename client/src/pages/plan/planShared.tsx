import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { toast } from "../../components/ui/Toast";
import { invalidateHub } from "../learning-hub/queryHelpers";

// Extracted out of Plan.tsx so Dashboard.tsx can reuse them without a
// static import of the whole Plan module — Plan.tsx is route-lazy-loaded
// from main.tsx, and Dashboard statically importing it defeated that
// code-splitting (bundled Plan's entire module, WeekOverview included,
// into Dashboard's chunk). Keep this file to small, dependency-light,
// genuinely cross-page pieces only.

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TASK_PRESETS = ["Review 10 flashcards", "Read one page in German", "Write 3 sentences"];

export function AddTaskComposer({ date, onDone }: { date: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const add = useMutation({
    mutationFn: () => api.addRoadmapTask({ date, title: title.trim() }),
    onSuccess: () => {
      invalidateHub(queryClient);
      setTitle("");
      setOpen(false);
      onDone();
    },
    onError: () => toast.error("Couldn't add that task — try again."),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl p-[13px] text-left text-[14px]"
        style={{ border: "1px dashed rgba(145,132,217,.4)", color: "#b5abfc" }}
      >
        <Plus size={17} weight="regular" aria-hidden="true" />
        Add a task to today
      </button>
    );
  }

  return (
    <div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) add.mutate();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="e.g. Read one page of a German book"
        className="box-border w-full rounded-[11px] px-[13px] text-[14px] outline-none"
        style={{ minHeight: 44, color: "#e9e9ed", background: "#20222f", border: "1px solid #9184d9" }}
      />
      <div className="mt-2 flex flex-wrap gap-[7px]">
        {TASK_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTitle(p)}
            className="rounded-full px-[11px] py-[5px] text-[11.5px] whitespace-nowrap"
            style={{ border: "1px solid rgba(233,233,237,.14)", color: "rgba(233,233,237,.65)" }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px] font-medium"
          style={{ background: "#20222f" }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!title.trim() || add.isPending}
          onClick={() => add.mutate()}
          className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px] font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          Add task
        </button>
      </div>
    </div>
  );
}

/** Right-column "chapter progress" card (Plan.tsx's + Dashboard.tsx's
 * desktop layouts) — the station whose theme best matches this week's
 * theme, per the same word-overlap matcher WeekOverview already uses to
 * link the week card back to the syllabus. */
export function ChapterProgressCard({ station, onOpen }: { station: { theme: string; items: { completedAt: string | null }[] } | null; onOpen: () => void }) {
  if (!station) return null;
  const done = station.items.filter((i) => i.completedAt !== null).length;
  return (
    <div className="rounded-xl p-[15px]" style={{ background: "#1c1f2c" }}>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
        Chapter progress
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[15px] font-medium">{station.theme}</span>
        <span className="tabular text-[13px]" style={{ color: "rgba(233,233,237,.5)" }}>
          {done}/{station.items.length}
        </span>
      </div>
      <div className="mt-2.5 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
        <div
          className="h-full rounded-[3px]"
          style={{ width: `${station.items.length === 0 ? 0 : Math.round((done / station.items.length) * 100)}%`, background: "linear-gradient(90deg,#5d5294,#b5abfc)" }}
        />
      </div>
      <button type="button" onClick={onOpen} className="mt-3 min-h-[38px] w-full rounded-[10px] text-[13px] font-medium text-white" style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}>
        Continue chapter
      </button>
    </div>
  );
}

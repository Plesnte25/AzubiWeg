import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FlagPennant, Sparkle } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { toast } from "../../components/ui/Toast";

const PRESET_DAYS = [182, 200, 240];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days between two local YYYY-MM-DD strings, computed via local
 * date-part math (getFullYear/getMonth/getDate), never toISOString() after
 * a mutation -- the handoff's own explicit timezone gotcha (its Test Done/
 * Exam Schedule notes call this out by name): toISOString() converts to
 * UTC and silently shifts the date by one for anyone east of UTC. */
function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(fromStr: string, n: number): string {
  const d = new Date(`${fromStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/**
 * Reusable bottom sheet for setting/editing the exam target date (Phase
 * 12) -- mounted wherever it's triggered (Dashboard's exam day-strip tile,
 * Exam Gate) with local open/close state, same pattern as WordFamilySheet/
 * AddWordsDialog, not a route of its own. Live pacing feedback reuses the
 * syllabus route's already-fetched routePace.projectedFinishDate (itself
 * independent of the exam target) instead of a new request per keystroke.
 */
export function ExamSchedule({
  open,
  onClose,
  forcePreset,
}: {
  open: boolean;
  onClose: () => void;
  /** Ignore any existing exam target and pre-fill this many days from
   * today instead — for callers where the old target is now stale (e.g.
   * Settings' Reset plan flow, right after the roadmap itself was just
   * recalculated from today). */
  forcePreset?: number;
}) {
  const queryClient = useQueryClient();
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus, enabled: open });
  const today = localDateStr(new Date());
  const [picked, setPicked] = useState(forcePreset ? addDays(today, forcePreset) : (syllabus?.routePace.examTargetDate ?? ""));

  useEffect(() => {
    if (open) setPicked(forcePreset ? addDays(today, forcePreset) : (syllabus?.routePace.examTargetDate ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMutation({
    mutationFn: () => api.setExamTarget(picked || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning", "syllabus"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Exam set for ${new Date(`${picked}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · plan re-paced`);
      onClose();
    },
    onError: () => toast.error("Couldn't save that date — try again."),
  });

  const pickedDays = picked ? daysBetween(today, picked) : 0;
  const isFresh = !syllabus?.routePace.examTargetDate;

  // real pace check: does the current syllabus velocity project a finish
  // before or after the picked date?
  const projected = syllabus?.routePace.projectedFinishDate;
  const projectedDays = projected ? daysBetween(today, projected) : null;
  const comfortable = projectedDays === null || pickedDays >= projectedDays;

  const note =
    !picked || pickedDays < 1
      ? "Pick a date after today."
      : projectedDays === null
        ? `${pickedDays} days out. Log a few completions to see a pace projection.`
        : comfortable
          ? `${pickedDays} days out — at your current pace you'd finish in ~${projectedDays}. Comfortable.`
          : `${pickedDays} days out — your current pace projects finishing in ~${projectedDays}. That's tighter than your rate so far.`;

  const activeLevel = syllabus?.levels.find((l) => l.percent < 100)?.level ?? syllabus?.levels[syllabus.levels.length - 1]?.level;
  const remainingItems = syllabus ? syllabus.items.filter((i) => i.level === activeLevel && i.completedAt === null).length : 0;
  const weeksLeft = pickedDays > 0 ? pickedDays / 7 : 0;
  const neededPerWeek = weeksLeft > 0 ? Math.round((remainingItems / weeksLeft) * 10) / 10 : 0;

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center gap-[9px]">
        <div className="grid size-9 shrink-0 place-items-center rounded-[11px]" style={{ background: "rgba(145,132,217,.18)" }}>
          <FlagPennant size={18} weight="regular" style={{ color: "#d2cefd" }} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="text-[17px] font-medium">Schedule your exam</div>
          <div className="mt-0.5 text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
            {isFresh ? "No exam target set yet" : `Currently ${new Date(`${syllabus!.routePace.examTargetDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-[7px] text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
          Exam date
        </div>
        <input
          type="date"
          value={picked}
          min={addDays(today, 1)}
          onChange={(e) => setPicked(e.target.value)}
          className="box-border w-full rounded-[11px] px-[13px] text-[15px] outline-none"
          style={{ minHeight: 46, background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
        />
        <div className="mt-[9px] flex items-start gap-[7px] text-[11.5px] leading-[1.45]" style={{ color: comfortable ? "#b5abfc" : "#e4c4b6" }}>
          <Sparkle size={13} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {note}
        </div>
      </div>

      <div className="mt-3.5 flex gap-[7px]">
        {PRESET_DAYS.map((n) => {
          const iso = addDays(today, n);
          const on = picked === iso;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setPicked(iso)}
              className="flex-1 rounded-[10px] py-2 text-[12.5px]"
              style={{ border: `1px solid ${on ? "#9184d9" : "rgba(233,233,237,.14)"}`, background: on ? "rgba(145,132,217,.16)" : "transparent", color: on ? "#d2cefd" : "rgba(233,233,237,.62)" }}
            >
              {n} d
            </button>
          );
        })}
      </div>

      {picked && pickedDays >= 1 && (
        <div className="mt-4 rounded-xl p-3" style={{ background: "#20222f" }}>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
            What this sets
          </div>
          <div className="mt-2 flex items-center gap-2 text-[12.5px]" style={{ color: "rgba(233,233,237,.65)" }}>
            {neededPerWeek > 0 ? `~${neededPerWeek} syllabus items a week to stay on pace` : "Pace recalculates once you have items left to plan"}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-[9px] pb-1">
        <button type="button" onClick={onClose} className="min-h-[46px] flex-1 rounded-[11px] text-[14px] font-medium" style={{ background: "#20222f" }}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!picked || pickedDays < 1 || save.isPending}
          onClick={() => save.mutate()}
          className="min-h-[46px] flex-[1.5] rounded-[11px] text-[15px] font-medium text-white disabled:opacity-40"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          {isFresh ? "Confirm date" : "Update date"}
        </button>
      </div>
    </BottomSheet>
  );
}

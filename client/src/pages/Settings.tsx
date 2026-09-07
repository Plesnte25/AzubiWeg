import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowCounterClockwise,
  CaretLeft,
  FlagPennant,
  LinkSimple,
  PencilSimple,
  Tag,
} from "@phosphor-icons/react";
import { api } from "../api/client";
import { toast } from "../components/ui/Toast";
import { useNavStack } from "../lib/navStack";
import { ExamSchedule } from "./plan/ExamSchedule";
import { invalidateHub } from "./learning-hub/queryHelpers";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? "#9184d9" : "#292b31" }}
    >
      <span
        className="absolute top-[3px] size-[20px] rounded-full bg-white transition-[left] duration-200"
        style={{ left: on ? 21 : 3 }}
      />
    </button>
  );
}

/**
 * Reskin of the handoff's sSettings — its "Vocabulary tagging" card
 * (4 pickable filing modes + an "auto-tag on save" toggle) has no real
 * backend behind either concept: words are always auto-classified at
 * add-time already (server/src/services/vocab/classify.ts), and there's
 * no per-user "mode" to pick — so that card keeps only the one real action
 * (reclassifyWords, for words added before auto-classification existed)
 * instead of building UI over settings that don't exist. The Obsidian
 * card's real link/unlink flow is presented through the same toggle
 * metaphor as the handoff, since it reads the same either-or at a glance.
 */
export default function Settings() {
  const { goBack, backLabel } = useNavStack();
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const [path, setPath] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [examScheduleOpen, setExamScheduleOpen] = useState(false);
  const [examForcePreset, setExamForcePreset] = useState<number | undefined>(undefined);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    queryClient.invalidateQueries({ queryKey: ["words"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const link = useMutation({
    mutationFn: () => api.vaultLink(path.trim()),
    onSuccess: (data) => {
      invalidateAll();
      toast.success(`Linked — imported ${data.wordCount} words`);
      setPath("");
    },
    onError: (e) => toast.error(String(e)),
  });
  const unlink = useMutation({ mutationFn: api.vaultUnlink, onSuccess: invalidateAll });
  const sync = useMutation({
    mutationFn: api.vaultSyncNow,
    onSuccess: invalidateAll,
    onError: () => toast.error("Couldn't sync — try again."),
  });
  const reclassify = useMutation({
    mutationFn: api.reclassifyWords,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      toast.success(
        data.updated === 0 ? `Checked ${data.total} words — nothing was missing.` : `Classified ${data.updated} of ${data.total} words.`,
      );
    },
  });
  const resetRoadmap = useMutation({
    mutationFn: api.resetRoadmap,
    onSuccess: () => {
      setConfirmingReset(false);
      invalidateHub(queryClient);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setExamForcePreset(200);
      setExamScheduleOpen(true);
    },
    onError: () => toast.error("Couldn't reset the plan — try again."),
  });

  const linked = status?.vaultPath !== null && status?.vaultPath !== undefined;
  const examTarget = syllabus?.routePace.examTargetDate ?? null;

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+40px)] lg:mx-auto lg:my-8 lg:min-h-0 lg:max-w-[640px] lg:rounded-[20px] lg:border lg:border-white/5 lg:pb-8"
      style={{ background: "radial-gradient(110% 34% at 30% 2%, #22253a, #161826 56%)" }}
    >
      <button type="button" onClick={goBack} className="flex items-center gap-[3px] self-start text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
        <CaretLeft size={14} weight="regular" aria-hidden="true" />
        {backLabel}
      </button>
      <div className="mt-2.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
        Settings
      </div>

      {/* Obsidian vault sync */}
      <div className="mt-[18px] rounded-xl p-[15px]" style={{ background: "#1c1f2c" }}>
        <div className="flex items-center gap-[11px]">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px]" style={{ background: "rgba(145,132,217,.18)", color: "#d2cefd" }}>
            <LinkSimple size={17} weight="regular" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">Obsidian vault sync</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              {linked ? `${status!.wordCount} words · ${status!.watching ? "watching for changes" : "watcher stopped"}` : "Not linked"}
            </div>
          </div>
          <Toggle
            on={linked}
            onClick={() => {
              if (linked) {
                if (confirm("Unlink the vault? Your vault files stay untouched; the app keeps its copy.")) unlink.mutate();
              }
              // turning it "on" happens via the path form below, not the switch —
              // linking needs a real filesystem path first
            }}
          />
        </div>

        {linked ? (
          <>
            <div className="mt-3 h-px" style={{ background: "rgba(233,233,237,.08)" }} />
            <div className="mt-3 flex items-center justify-between text-[12.5px]">
              <span style={{ color: "rgba(233,233,237,.5)" }}>Vault folder</span>
              <span className="max-w-[65%] truncate text-[11.5px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#d2cefd" }}>
                {status!.vaultPath}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12.5px]">
              <span style={{ color: "rgba(233,233,237,.5)" }}>Last sync</span>
              <span style={{ color: "rgba(233,233,237,.75)" }}>{status!.lastSyncAt ? new Date(status!.lastSyncAt).toLocaleTimeString() : "never"}</span>
            </div>
            <button
              type="button"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
              className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-[7px] rounded-[10px] text-[13px]"
              style={{ background: "#20222f", color: "#e9e9ed" }}
            >
              <ArrowCounterClockwise size={14} weight="regular" aria-hidden="true" />
              {sync.isPending ? "Syncing…" : "Sync now"}
            </button>
          </>
        ) : (
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (path.trim()) link.mutate();
            }}
          >
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/home/you/Documents/Ausbildung 27/German"
              className="box-border w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
              style={{ background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
            />
            <button
              type="submit"
              disabled={!path.trim() || link.isPending}
              className="min-h-[38px] rounded-[10px] text-[13px] font-medium text-white disabled:opacity-45"
              style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
            >
              {link.isPending ? "Importing…" : "Link vault"}
            </button>
          </form>
        )}
      </div>

      {/* Vocabulary tagging */}
      <div className="mt-[11px] rounded-xl p-[15px]" style={{ background: "#1c1f2c" }}>
        <div className="flex items-center gap-[11px]">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px]" style={{ background: "#292b31", color: "rgba(233,233,237,.7)" }}>
            <Tag size={17} weight="regular" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">Vocabulary tagging</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              Level and theme are filed in automatically when a word's added
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.5)" }}>
          Words added before that existed, or through the mobile capture before it was wired up, may still be missing one — this fills in whatever's
          missing without touching anything you've set or edited manually.
        </p>
        <button
          type="button"
          disabled={reclassify.isPending}
          onClick={() => reclassify.mutate()}
          className="mt-3 min-h-[38px] rounded-[10px] px-3 text-[13px]"
          style={{ background: "#20222f", color: "#e9e9ed" }}
        >
          {reclassify.isPending ? "Classifying…" : "Fill in missing tags"}
        </button>
      </div>

      {/* Reset plan */}
      <div className="mt-[11px] mb-[26px] rounded-xl p-[15px]" style={{ background: "#1c1f2c" }}>
        <div className="flex items-center gap-[11px]">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px]" style={{ background: "rgba(209,155,134,.14)", color: "#e4c4b6" }}>
            <ArrowCounterClockwise size={17} weight="regular" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">Reset plan</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
              Start a fresh 182-day plan from today
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.5)" }}>
          Clears due dates and daily tasks, then lays out 182 days from today. Your words, notes, syllabus progress and self-test history stay untouched.
        </p>

        <div className="mt-3 flex items-center gap-[10px] rounded-[11px] p-[10px_12px]" style={{ background: "#20222f" }}>
          <FlagPennant size={15} weight="regular" style={{ color: "rgba(233,233,237,.5)", flexShrink: 0 }} aria-hidden="true" />
          <span className="flex-1 text-[12px]" style={{ color: "rgba(233,233,237,.6)" }}>
            Exam booked for
          </span>
          <button
            type="button"
            onClick={() => {
              setExamForcePreset(undefined);
              setExamScheduleOpen(true);
            }}
            className="flex items-center gap-[5px] text-[12.5px] font-medium"
            style={{ color: "#b5abfc" }}
          >
            {examTarget ? new Date(`${examTarget}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set"}
            <PencilSimple size={12} weight="regular" aria-hidden="true" />
          </button>
        </div>

        {resetRoadmap.isError && (
          <p className="mt-2 text-[12px]" style={{ color: "#e4c4b6" }}>
            Couldn't reset the plan — try again.
          </p>
        )}

        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="mt-3 min-h-[42px] w-full rounded-[10px] text-[13.5px]"
            style={{ border: "1px solid rgba(209,155,134,.5)", color: "#e4c4b6", background: "transparent" }}
          >
            Reset plan
          </button>
        ) : (
          <div className="mt-3">
            <p className="mb-2.5 text-[12.5px]" style={{ color: "#e4c4b6" }}>
              Sure? Your daily scheduling gets recalculated from today.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px]"
                style={{ background: "#20222f", color: "#e9e9ed" }}
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={resetRoadmap.isPending}
                onClick={() => resetRoadmap.mutate()}
                className="min-h-[42px] flex-1 rounded-[10px] text-[13.5px]"
                style={{ border: "1px solid rgba(209,155,134,.7)", background: "rgba(209,155,134,.14)", color: "#e4c4b6" }}
              >
                {resetRoadmap.isPending ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ExamSchedule
        open={examScheduleOpen}
        onClose={() => setExamScheduleOpen(false)}
        forcePreset={examForcePreset}
      />
    </div>
  );
}

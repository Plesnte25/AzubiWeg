import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkle, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { Skeleton } from "../../components/ui/Skeleton";
import { useNavStack } from "../../lib/navStack";
import ApplicationDetailModal from "./ApplicationDetailModal";
import ApplicationDetailSheet from "./ApplicationDetailSheet";
import { BoardDesktop } from "./BoardDesktop";
import BoardMobile from "./BoardMobile";
import CvShelfMobile from "./CvShelfMobile";
import NewApplicationModal from "./NewApplicationModal";
import AddPortalModal from "./AddPortalModal";

const STALE_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function PortalsMobile() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["portals"], queryFn: api.portals });
  const [adding, setAdding] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portals"] });
  const markChecked = useMutation({ mutationFn: api.markPortalChecked, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deletePortal, onSuccess: invalidate });
  const portals = data?.portals ?? [];
  const now = Date.now();

  if (portals.length === 0 && !adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11.5px]"
        style={{ border: "1px dashed rgba(233,233,237,.18)", color: "rgba(233,233,237,.5)" }}
      >
        <Plus size={12} weight="regular" aria-hidden="true" />
        Add a job portal
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {portals.map((p) => {
        const last = new Date(p.lastCheckedAt ?? p.createdAt).getTime();
        const days = Math.floor((now - last) / MS_PER_DAY);
        const stale = days >= STALE_DAYS;
        return (
          <span
            key={p.id}
            className="group inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-[11px]"
            style={{ background: "#1c1f2c" }}
          >
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5"
              style={{ color: "rgba(233,233,237,.75)" }}
              onClick={() => markChecked.mutate(p.id)}
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: stale ? "#e4c4b6" : "#9184d9" }} aria-hidden="true" />
              {p.label}
              {stale && <span style={{ color: "rgba(233,233,237,.35)" }}>· {days}d</span>}
            </a>
            <button type="button" onClick={() => remove.mutate(p.id)} style={{ color: "rgba(233,233,237,.3)" }} title="Remove portal">
              <X size={10} weight="regular" aria-hidden="true" />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="grid size-6 shrink-0 place-items-center rounded-full"
        style={{ border: "1px dashed rgba(233,233,237,.18)", color: "rgba(233,233,237,.4)" }}
        title="Add a portal"
      >
        <Plus size={12} weight="regular" aria-hidden="true" />
      </button>
      {adding && <AddPortalModal onClose={() => setAdding(false)} />}
    </div>
  );
}

/**
 * Applications screen — Nocturne reskin of the handoff's sJobs (funnel bar
 * + stage-pill filter + flat list, now BoardMobile.tsx). The lg+ desktop
 * layout (German Companion Desktop.dc.html id="2e") replaces the old
 * pre-Nocturne 5-column kanban (Board.tsx, deleted) with the same dense
 * list, wider — see BoardDesktop.tsx's doc comment for the two real-data
 * deviations from the literal spec (no B1-nudge callout, jobProfile stands
 * in for the "note" column) and docs/KNOWN_ISSUES.md for what's deferred
 * (the detail modal's own reskin, and desktop CV management).
 */
export default function JobSearch() {
  const { push } = useNavStack();
  const [addingApplication, setAddingApplication] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: statsData } = useQuery({ queryKey: ["applications", "stats"], queryFn: api.applicationStats });
  const { data: cvsData } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const stats = statsData?.stats;
  const cvCount = cvsData?.cvs.length ?? 0;

  return (
    <>
      {/* below lg: the reskinned handoff screen */}
      <div
        className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+90px)] lg:hidden"
        style={{ background: "radial-gradient(110% 40% at 80% 4%, #1f2a3d, #161826 58%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            Applications
          </div>
          <button
            type="button"
            onClick={() => setAddingApplication(true)}
            className="flex shrink-0 items-center gap-[6px] rounded-[10px] px-3 py-2.5 text-[12.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <Plus size={15} weight="regular" aria-hidden="true" />
            Log one
          </button>
        </div>
        {stats ? (
          <div className="mt-0.5 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
            {stats.total} application{stats.total === 1 ? "" : "s"} · {cvCount} CV{cvCount === 1 ? "" : "s"}
          </div>
        ) : (
          <Skeleton className="mt-1 h-3.5 w-48" />
        )}

        <div className="mt-4">
          <CvShelfMobile />
        </div>
        <div className="mt-3.5">
          <PortalsMobile />
        </div>

        <div className="mt-4">
          <BoardMobile onOpen={setOpenId} />
        </div>

        <button
          type="button"
          onClick={() => push("/plan/syllabus")}
          className="mt-3.5 flex shrink-0 items-center gap-[11px] rounded-xl p-3.5 text-left"
          style={{ border: "1px solid rgba(145,132,217,.35)", background: "rgba(145,132,217,.07)" }}
        >
          <Sparkle size={17} weight="regular" style={{ color: "#b5abfc", flexShrink: 0 }} aria-hidden="true" />
          <div className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.7)" }}>
            Your German level unlocks more roles as it climbs.
          </div>
        </button>
      </div>

      {/* lg and up: German Companion Desktop.dc.html id="2e" — labelled
          sidebar (Layout.tsx) + the dense funnel/filter/list board. */}
      <div className="hidden lg:mx-auto lg:my-8 lg:flex lg:max-w-[900px] lg:flex-col lg:gap-[13px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
              Applications
            </div>
            <div className="mt-px text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
              Jobs
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddingApplication(true)}
            className="flex shrink-0 items-center gap-[6px] rounded-[10px] px-3 py-2.5 text-[12.5px] font-medium text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <Plus size={15} weight="regular" aria-hidden="true" />
            Log one
          </button>
        </div>
        {stats ? (
          <div className="-mt-2 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
            {stats.total} application{stats.total === 1 ? "" : "s"} · {cvCount} CV{cvCount === 1 ? "" : "s"}
          </div>
        ) : (
          <Skeleton className="-mt-2 h-3.5 w-48" />
        )}

        <BoardDesktop onOpen={setOpenId} />

        <button
          type="button"
          onClick={() => push("/plan/syllabus")}
          className="flex shrink-0 items-center gap-[11px] rounded-xl p-3.5 text-left"
          style={{ border: "1px solid rgba(145,132,217,.35)", background: "rgba(145,132,217,.07)" }}
        >
          <Sparkle size={17} weight="regular" style={{ color: "#b5abfc", flexShrink: 0 }} aria-hidden="true" />
          <div className="flex-1 text-[12.5px]" style={{ color: "rgba(233,233,237,.7)" }}>
            Your German level unlocks more roles as it climbs.
          </div>
        </button>
      </div>

      {addingApplication && <NewApplicationModal onClose={() => setAddingApplication(false)} />}
      {openId && (
        <>
          <ApplicationDetailModal id={openId} onClose={() => setOpenId(null)} />
          <ApplicationDetailSheet id={openId} onClose={() => setOpenId(null)} />
        </>
      )}
    </>
  );
}

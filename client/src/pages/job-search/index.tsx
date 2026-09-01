import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkle, X } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useNavStack } from "../../lib/navStack";
import ApplicationDetailModal from "./ApplicationDetailModal";
import ApplicationDetailSheet from "./ApplicationDetailSheet";
import Board from "./Board";
import BoardMobile from "./BoardMobile";
import CvShelf from "./CvShelf";
import CvShelfMobile from "./CvShelfMobile";
import NewApplicationModal from "./NewApplicationModal";
import AddCvModal from "./AddCvModal";
import AddPortalModal from "./AddPortalModal";
import PortalsCard from "./PortalsCard";
import TrendChart from "./TrendChart";

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
 * + stage-pill filter + flat list, now BoardMobile.tsx). The handoff's
 * lg-only 5-column kanban has no equivalent screen in the handoff at all
 * (it predates the redesign and is real, working functionality desktop
 * users rely on) — kept exactly as it was rather than dropped or
 * force-reskinned, per the redesign's mobile-first rollout (desktop
 * layouts are Phase 18's job).
 */
export default function JobSearch() {
  const { push } = useNavStack();
  const [addingCv, setAddingCv] = useState(false);
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

      {/* lg and up: unchanged, desktop kanban + CV sidebar (Phase 18's job) */}
      <div className="mx-auto hidden max-w-[1320px] px-4 py-4 sm:px-6 lg:block">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-heading font-bold">Job Search</h1>
            {stats ? (
              <p className="animate-fade-in text-caption text-ink-400">
                {stats.total} application{stats.total === 1 ? "" : "s"} across 5 stages · {cvCount} CV{cvCount === 1 ? "" : "s"}
              </p>
            ) : (
              <Skeleton className="mt-1 h-3.5 w-64" />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddingCv(true)}>
              + New CV
            </Button>
            <Button onClick={() => setAddingApplication(true)}>+ New application</Button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <PortalsCard />
          <div className="rounded-lg border border-hairline p-3">
            <p className="mb-1 text-body font-medium text-ink-600">Applications per week</p>
            <TrendChart data={stats?.weeklyActivity ?? []} />
          </div>
        </div>

        {stats && (
          <div className="mb-4 flex rounded-lg border border-hairline">
            <StatCell label="Active" value={stats.active} />
            <StatCell
              label="Response rate"
              value={stats.responseRate === null ? "—" : `${Math.round(stats.responseRate * 100)}%`}
            />
            <StatCell
              label="Interview rate"
              value={stats.interviewRate === null ? "—" : `${Math.round(stats.interviewRate * 100)}%`}
            />
            <StatCell
              label="Avg. days to response"
              value={stats.avgDaysToResponse === null ? "—" : stats.avgDaysToResponse}
              last
            />
          </div>
        )}

        <div className="flex gap-4">
          <Board onOpen={setOpenId} />
          <CvShelf />
        </div>
      </div>

      {addingCv && <AddCvModal onClose={() => setAddingCv(false)} />}
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

function StatCell({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) {
  return (
    <div className={`flex-1 px-3.5 py-2.5 ${last ? "" : "border-r border-hairline-soft"}`}>
      <p className="text-title font-bold">{value}</p>
      <p className="mt-0.5 text-micro text-ink-300">{label}</p>
    </div>
  );
}

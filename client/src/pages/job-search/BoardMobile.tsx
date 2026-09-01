import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Application, ApplicationStatus } from "../../api/types";
import { COLUMNS, STAGE_COLOR } from "./stages";

const PAGE_SIZE = 20;
const FUNNEL_STAGES: ApplicationStatus[] = ["wishlist", "applied", "interview", "offer"];

const STATUS_PILL: Record<ApplicationStatus, { bg: string; color: string }> = {
  wishlist: { bg: "rgba(233,233,237,.1)", color: "rgba(233,233,237,.65)" },
  applied: { bg: "rgba(233,233,237,.1)", color: "rgba(233,233,237,.65)" },
  interview: { bg: "rgba(228,196,182,.16)", color: "#e4c4b6" },
  offer: { bg: "rgba(145,132,217,.18)", color: "#b5abfc" },
  rejected: { bg: "rgba(233,233,237,.07)", color: "rgba(233,233,237,.4)" },
};

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The handoff's Applications screen (sJobs) — funnel bar, stage-pill
 * filter, flat list. No drag-and-drop here (that stays the lg kanban's
 * job, Board.tsx, left untouched). Each row's footer line in the handoff
 * (a required-language-level badge + a "next action" hint) is dropped —
 * Application has no required-level or reminder field to back either one,
 * so the row is just what's real: company/role/portal, status, applied date.
 */
export default function BoardMobile({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const { data: statsData } = useQuery({ queryKey: ["applications", "stats"], queryFn: api.applicationStats });
  const [stage, setStage] = useState<ApplicationStatus>("wishlist");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [stage]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="h-8 animate-pulse rounded-full" style={{ background: "#20222f" }} />
        <div className="h-16 animate-pulse rounded-md" style={{ background: "#1c1f2c" }} />
        <div className="h-16 animate-pulse rounded-md" style={{ background: "#1c1f2c" }} />
      </div>
    );
  }

  const applications: Application[] = data.applications;
  const counts = statsData?.stats.byStatus ?? {
    wishlist: applications.filter((a) => a.status === "wishlist").length,
    applied: applications.filter((a) => a.status === "applied").length,
    interview: applications.filter((a) => a.status === "interview").length,
    offer: applications.filter((a) => a.status === "offer").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };
  const funnelTotal = FUNNEL_STAGES.reduce((sum, s) => sum + counts[s], 0);

  const allItems = applications.filter((a) => a.status === stage);
  const items = allItems.slice(0, visibleCount);
  const remaining = allItems.length - items.length;

  return (
    <div>
      {funnelTotal > 0 && (
        <>
          <div className="flex h-2 gap-1 overflow-hidden rounded-full" style={{ background: "#292b31" }}>
            {FUNNEL_STAGES.map((s) => (
              <div key={s} style={{ flex: counts[s] || 0.0001, background: STAGE_COLOR[s] }} />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[9.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
            {FUNNEL_STAGES.map((s) => (
              <span key={s}>
                {COLUMNS.find((c) => c.key === s)?.label.toLowerCase()} {counts[s]}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1">
        {COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setStage(c.key)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
            style={{
              background: stage === c.key ? "rgba(145,132,217,.22)" : "#20222f",
              color: stage === c.key ? "#d2cefd" : "rgba(233,233,237,.6)",
            }}
          >
            {c.label} {counts[c.key]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Briefcase size={26} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
            <p className="text-[12.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
              Nothing here yet
            </p>
          </div>
        ) : (
          items.map((app) => {
            const pill = STATUS_PILL[app.status];
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onOpen(app.id)}
                className="rounded-xl p-3.5 text-left"
                style={{ background: "#1c1f2c" }}
              >
                <div className="flex items-start gap-[11px]">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-medium"
                    style={{ background: "#292b31", color: "rgba(233,233,237,.7)" }}
                  >
                    {app.company[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-medium">{app.role}</div>
                    <div className="mt-px truncate text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                      {app.company}
                      {app.portal ? ` · ${app.portal}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ background: pill.bg, color: pill.color }}>
                      {COLUMNS.find((c) => c.key === app.status)?.label}
                    </span>
                    <span className="text-[9.5px]" style={{ color: "rgba(233,233,237,.35)" }}>
                      {relativeDay(app.appliedAt ?? app.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-2.5 w-full rounded-md py-2 text-center text-[12px]"
          style={{ border: "1px dashed rgba(233,233,237,.16)", color: "rgba(233,233,237,.5)" }}
        >
          Show more ({remaining})
        </button>
      )}
    </div>
  );
}

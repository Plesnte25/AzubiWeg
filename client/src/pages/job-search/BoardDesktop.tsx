import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Application, ApplicationStatus } from "../../api/types";
import { relativeDay, STATUS_PILL } from "./BoardMobile";
import { COLUMNS, STAGE_COLOR } from "./stages";

const PAGE_SIZE = 30;
const FUNNEL_STAGES: ApplicationStatus[] = ["wishlist", "applied", "interview", "offer"];

/**
 * The desktop dense-list Applications board (German Companion
 * Desktop.dc.html id="2e") — replaces the old pre-Nocturne kanban
 * (Board.tsx, deleted with this) outright, per the project's big-bang
 * rollout convention. Reuses BoardMobile.tsx's funnel bar / stage-filter /
 * row logic almost verbatim, just wider and denser. The handoff's "N of
 * your M roles ask for B1" pinned callout is omitted — Application has no
 * required-level field to back it (BoardMobile.tsx already made this same
 * real-data call once); jobProfile is the closest real field standing in
 * for the handoff's per-row "note" meta column. Row click still opens the
 * pre-Nocturne detail modal (ApplicationDetailModal/Sheet/Content) — no
 * handoff spec exists for a detail panel, so that reskin is deferred, see
 * docs/KNOWN_ISSUES.md.
 */
export function BoardDesktop({ onOpen }: { onOpen: (id: string) => void }) {
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
          <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" style={{ background: "#292b31" }}>
            {FUNNEL_STAGES.map((s) => (
              <div key={s} style={{ flex: counts[s] || 0.0001, background: STAGE_COLOR[s] }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {FUNNEL_STAGES.map((s) => (
              <span key={s}>
                {COLUMNS.find((c) => c.key === s)?.label.toLowerCase()} {counts[s]}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 flex gap-1.5">
        {COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setStage(c.key)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium"
            style={{
              background: stage === c.key ? "rgba(145,132,217,.22)" : "#20222f",
              color: stage === c.key ? "#d2cefd" : "rgba(233,233,237,.6)",
            }}
          >
            {c.label} {counts[c.key]}
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Briefcase size={28} weight="regular" style={{ color: "rgba(233,233,237,.3)" }} aria-hidden="true" />
            <p className="text-[13px]" style={{ color: "rgba(233,233,237,.45)" }}>
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
                className="grid items-center gap-3 rounded-xl p-3.5 text-left"
                style={{ background: "#1c1f2c", gridTemplateColumns: "36px 1fr 100px 120px 180px" }}
              >
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-medium"
                  style={{ background: "#292b31", color: "rgba(233,233,237,.7)" }}
                >
                  {app.company[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-medium">{app.role}</div>
                  <div className="mt-px truncate text-[11.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
                    {app.company}
                    {app.portal ? ` · ${app.portal}` : ""}
                  </div>
                </div>
                <span className="justify-self-start rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ background: pill.bg, color: pill.color }}>
                  {COLUMNS.find((c) => c.key === app.status)?.label}
                </span>
                <span className="text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                  {relativeDay(app.appliedAt ?? app.createdAt)}
                </span>
                <span className="truncate text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                  {app.jobProfile ?? ""}
                </span>
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

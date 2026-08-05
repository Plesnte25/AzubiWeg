import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { api } from "../../api/client";
import type { ApplicationStatus } from "../../api/types";
import { CarouselDots } from "../../components/ui/CarouselDots";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillTabs } from "../../components/ui/PillTabs";
import { COLUMNS, STAGE_BORDER, STAGE_COLOR } from "./stages";

const PILL_ITEMS = COLUMNS.map((c) => ({ key: c.key, label: c.label, color: STAGE_COLOR[c.key] }));

/** sm/md replacement for the lg 5-column kanban board — no drag-and-drop
 * below lg (per spec), a stage-pill filter instead of columns: tap a stage,
 * see that stage's applications as a single-column list (sm) / 2-column
 * grid (md), tap a card to open it. */
export default function BoardMobile({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const [stage, setStage] = useState<ApplicationStatus>("wishlist");

  if (isLoading) return <p className="text-ink-300">Loading…</p>;
  const applications = data?.applications ?? [];
  const counts: Record<ApplicationStatus, number> = {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const a of applications) counts[a.status]++;
  const items = applications.filter((a) => a.status === stage);
  const activeIndex = COLUMNS.findIndex((c) => c.key === stage);

  return (
    <div>
      <PillTabs
        items={PILL_ITEMS.map((p) => ({ ...p, count: counts[p.key as ApplicationStatus] }))}
        value={stage}
        onChange={(k) => setStage(k as ApplicationStatus)}
        ariaLabel="Application stage"
      />
      <CarouselDots count={PILL_ITEMS.length} activeIndex={activeIndex} className="mt-2 md:hidden" />

      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        {items.length === 0 ? (
          <EmptyState icon={Briefcase} title="Empty" className="md:col-span-2" />
        ) : (
          items.map((app) => (
            <button
              key={app.id}
              onClick={() => onOpen(app.id)}
              className={`rounded-[10px] border border-hairline border-l-[3px] bg-card px-3 py-3 text-left ${STAGE_BORDER[app.status]}`}
            >
              <p className="text-[13px] font-bold">{app.company}</p>
              <p className="text-[11.5px] text-ink-400">
                {app.role}
                {app.location ? ` · ${app.location}` : ""}
              </p>
              {app.cv && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  📄 {app.cv.title}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import ApplicationDetailModal from "./ApplicationDetailModal";
import Board from "./Board";
import CvShelf from "./CvShelf";
import NewApplicationModal from "./NewApplicationModal";
import AddCvModal from "./AddCvModal";
import PortalsCard from "./PortalsCard";
import TrendChart from "./TrendChart";

export default function JobSearch() {
  const { data: statsData } = useQuery({ queryKey: ["applications", "stats"], queryFn: api.applicationStats });
  const { data: cvsData } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [addingCv, setAddingCv] = useState(false);
  const [addingApplication, setAddingApplication] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = statsData?.stats;
  const cvCount = cvsData?.cvs.length ?? 0;

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.015em]">Job Search</h1>
          <p className="text-[12.5px] text-ink-400">
            {stats
              ? `${stats.total} application${stats.total === 1 ? "" : "s"} across 5 stages · ${cvCount} CV${cvCount === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
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
        <div className="rounded-[14px] border border-hairline p-3">
          <p className="mb-1 text-sm font-medium text-ink-600">Applications per week</p>
          <TrendChart data={stats?.weeklyActivity ?? []} />
        </div>
      </div>

      {stats && (
        <div className="mb-4 flex rounded-[14px] border border-hairline">
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

      {addingCv && <AddCvModal onClose={() => setAddingCv(false)} />}
      {addingApplication && <NewApplicationModal onClose={() => setAddingApplication(false)} />}
      {openId && <ApplicationDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function StatCell({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) {
  return (
    <div className={`flex-1 px-3.5 py-2.5 ${last ? "" : "border-r border-hairline-soft"}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="mt-0.5 text-[10.5px] text-ink-300">{label}</p>
    </div>
  );
}

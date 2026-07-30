import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { LearningRail, type Destination } from "./LearningRail";
import { ProgressPage } from "./ProgressPage";
import { RoadmapPage } from "./RoadmapPage";
import { SelfTestsPage } from "./SelfTestsPage";
import { SourcesPage } from "./SourcesPage";
import { SyllabusPage } from "./SyllabusPage";
import { TodayPage } from "./TodayPage";

const DESTINATIONS: Destination[] = ["today", "roadmap", "syllabus", "sources", "test", "progress"];
// Roadmap and Progress read the day-by-day plan; Today/Syllabus/Sources/
// Self-tests all stay fully open pre-activation (see the handoff's "Roadmap
// activation gate" section — Self-tests and Syllabus never depend on it).
const NEEDS_ROADMAP = new Set<Destination>(["roadmap", "progress"]);

function useCustomDateState() {
  const [date, setDate] = useState("");
  return { date, setDate };
}

function ActivationGate() {
  const { refetch } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const { date, setDate } = useCustomDateState();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setPending(true);
    setError(null);
    try {
      await api.activateRoadmap(date || undefined);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not activate");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card padding="lg" className="text-center">
      <h2 className="text-base font-bold">Start your 26-week roadmap</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
        Generates a day-by-day plan to Goethe-exam readiness from your syllabus progress.
      </p>
      <div className="mx-auto mt-4 max-w-xs">
        <input
          type="date"
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">Optional — leave blank to start today</p>
      </div>
      <Button className="mt-4" loading={pending} onClick={activate}>
        Activate
      </Button>
      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </Card>
  );
}

export default function LearningHub() {
  const [params, setParams] = useSearchParams();
  const viewParam = params.get("view");
  const destination: Destination = DESTINATIONS.includes(viewParam as Destination) ? (viewParam as Destination) : "today";
  // Lifted here (not local to SelfTestsPage) so the shell can hide the rail
  // without unmounting the runner — SelfTestsPage is mounted in exactly one
  // place below regardless of this flag, only the rail's visibility changes.
  const [testRunning, setTestRunning] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const needsActivation = !statusLoading && !status?.activated && NEEDS_ROADMAP.has(destination);

  const navigate = (d: Destination) => setParams({ view: d });
  const fullBleed = destination === "test" && testRunning;

  return (
    <div className="flex items-start gap-4">
      {!fullBleed && <LearningRail destination={destination} onNavigate={navigate} />}
      <div className="min-w-0 flex-1 space-y-3.5">
        {destination === "test" ? (
          <SelfTestsPage onRunningChange={setTestRunning} onNavigate={navigate} />
        ) : statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : needsActivation ? (
          <ActivationGate />
        ) : (
          <>
            {destination === "today" && <TodayPage onNavigate={navigate} />}
            {destination === "roadmap" && <RoadmapPage onNavigate={navigate} />}
            {destination === "syllabus" && <SyllabusPage />}
            {destination === "sources" && <SourcesPage />}
            {destination === "progress" && <ProgressPage onNavigate={navigate} />}
          </>
        )}
      </div>
    </div>
  );
}

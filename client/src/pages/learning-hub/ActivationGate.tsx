import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

function useCustomDateState() {
  const [date, setDate] = useState("");
  return { date, setDate };
}

/** Shared by the Learning Hub shell (index.tsx) and Stats.tsx — both gate
 * their roadmap-dependent content behind activation the same way. */
export function ActivationGate() {
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
      <h2 className="text-body-lg font-bold">Start your 26-week roadmap</h2>
      <p className="mx-auto mt-2 max-w-sm text-body text-ink-600">
        Generates a day-by-day plan to Goethe-exam readiness from your syllabus progress.
      </p>
      <div className="mx-auto mt-4 max-w-xs">
        <input
          type="date"
          className="w-full rounded-lg border border-hairline bg-paper px-3 py-1.5 text-body"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="mt-1 text-caption text-ink-400">Optional — leave blank to start today</p>
      </div>
      <Button className="mt-4" loading={pending} onClick={activate}>
        Activate
      </Button>
      {error && <p className="mt-2 text-body text-danger-600">{error}</p>}
    </Card>
  );
}

import { TrendUp, Warning } from "@phosphor-icons/react";
import type { RoadmapTopicWeakness } from "../../api/types";

/**
 * Weak topic areas + most-improved topics (Phase 4) — both already computed
 * into the exact `learningProgress()` payload Stats.tsx already fetches
 * (`progress.weakAreas`/`progress.improvedMost`), never rendered before.
 * Distinct from "the shaky ones" below it on the page: that's word-level
 * (individual vocab cards with a recent hard grade); this is topic/grammar-
 * area level, from self-test breakdowns (e.g. "Verbs: present tense").
 */
export function WeakAreasCard({
  weakAreas,
  improvedMost,
}: {
  weakAreas: RoadmapTopicWeakness[];
  improvedMost: { topic: string; percent: number; deltaPoints: number }[];
}) {
  if (weakAreas.length === 0 && improvedMost.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {weakAreas.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-micro tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            <Warning size={11} weight="regular" style={{ color: "#e4c4b6" }} aria-hidden="true" />
            Weak topic areas
          </div>
          <div className="flex flex-col gap-1">
            {weakAreas.slice(0, 4).map((w) => (
              <div key={w.topic} className="flex items-center justify-between text-[12.5px]">
                <span className="min-w-0 truncate" style={{ color: "rgba(233,233,237,.75)" }}>
                  {w.topic}
                </span>
                <span className="shrink-0" style={{ color: "#e4c4b6" }}>
                  {w.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {improvedMost.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-micro tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            <TrendUp size={11} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
            Most improved
          </div>
          <div className="flex flex-col gap-1">
            {improvedMost.slice(0, 4).map((w) => (
              <div key={w.topic} className="flex items-center justify-between text-[12.5px]">
                <span className="min-w-0 truncate" style={{ color: "rgba(233,233,237,.75)" }}>
                  {w.topic}
                </span>
                <span className="shrink-0" style={{ color: "#b5abfc" }}>
                  +{w.deltaPoints}pt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

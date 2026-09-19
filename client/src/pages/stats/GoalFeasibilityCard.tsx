import { Sparkle } from "@phosphor-icons/react";
import type { GoalFeasibility } from "../../api/types";

const VERDICT_META: Record<NonNullable<GoalFeasibility["verdict"]>, { color: string; label: string }> = {
  on_track: { color: "#b5abfc", label: "on track" },
  tight: { color: "#e4c4b6", label: "tight" },
  unrealistic: { color: "#e29b9b", label: "unrealistic" },
};

/**
 * Turns computeGoalFeasibility() (server/src/services/learning/pace.ts) into
 * a plain "is my exam date realistic given my own stated study capacity"
 * read — distinct from the existing readiness/pace tiles, which compare
 * against past velocity, not the user's own capacity setting. Renders
 * nothing when there's no exam target date set (verdict === null) — nothing
 * to assess yet, not a silent zero.
 */
export function GoalFeasibilityCard({ feasibility }: { feasibility: GoalFeasibility }) {
  if (feasibility.verdict === null) return null;
  const meta = VERDICT_META[feasibility.verdict];

  return (
    <div className="rounded-xl p-3.5" style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}>
      <div className="flex items-center gap-1.5 text-micro tracking-[.1em] uppercase" style={{ color: meta.color }}>
        <Sparkle size={12} weight="fill" aria-hidden="true" />
        Goal feasibility
      </div>
      <p className="mt-1 text-[14px] font-medium capitalize" style={{ color: meta.color }}>
        {meta.label}
      </p>
      <p className="mt-1 text-[11.5px] leading-[1.45]" style={{ color: "rgba(233,233,237,.55)" }}>
        {feasibility.verdict === "on_track"
          ? `Needs ~${feasibility.requiredItemsPerWeek}/week — within your ~${feasibility.sustainableItemsPerWeek}/week capacity.`
          : `Needs ~${feasibility.requiredItemsPerWeek}/week — above your ~${feasibility.sustainableItemsPerWeek}/week capacity. Consider a later exam date or raising study capacity in Settings.`}
      </p>
    </div>
  );
}

import { Minus, TrendDown, TrendUp } from "@phosphor-icons/react";
import type { ExamAttempt, GoetheReadiness } from "../../api/types";

const TREND_META: Record<NonNullable<GoetheReadiness["trend"]>, { icon: typeof TrendUp; color: string; label: string }> = {
  up: { icon: TrendUp, color: "#b5abfc", label: "improving" },
  down: { icon: TrendDown, color: "#e4c4b6", label: "declining" },
  flat: { icon: Minus, color: "rgba(233,233,237,.5)", label: "steady" },
};

/**
 * Self-test average + readiness trend + real exam-attempt history (Phase 4)
 * — testAvg and readiness.avgRecentTestScore/.trend were already computed
 * into payloads Stats.tsx already fetches (learningProgress()/exam/status)
 * but only readiness.level/readinessLabel/syllabusPercent were ever read.
 * `attempts` (exam/status's full history, previously trimmed to just
 * lastAttempt) gives a real score-over-time trend, not a single point.
 */
export function ExamTrendCard({
  testAvg,
  readiness,
  attempts,
}: {
  testAvg: { value: number | null; deltaPoints: number | null };
  readiness: GoetheReadiness;
  attempts: ExamAttempt[];
}) {
  const trend = readiness.trend ? TREND_META[readiness.trend] : null;
  const scoredAttempts = attempts.filter((a) => a.score !== null && a.total !== null);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <div className="text-[19px] font-medium">{testAvg.value === null ? "—" : `${testAvg.value}%`}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            self-test avg
            {testAvg.deltaPoints !== null && (
              <span style={{ color: testAvg.deltaPoints >= 0 ? "#b5abfc" : "#e4c4b6" }}> {testAvg.deltaPoints >= 0 ? "+" : ""}{testAvg.deltaPoints}pt</span>
            )}
          </div>
        </div>
        <div className="flex-1 rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <div className="text-[19px] font-medium">{readiness.avgRecentTestScore === null ? "—" : `${Math.round(readiness.avgRecentTestScore)}%`}</div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            recent avg
            {trend && (
              <span className="flex items-center gap-0.5" style={{ color: trend.color }}>
                <trend.icon size={10} weight="bold" aria-hidden="true" />
                {trend.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {scoredAttempts.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.62)" }}>
            Exam attempts
          </div>
          <div className="flex flex-col gap-1">
            {scoredAttempts.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-[12px]">
                <span style={{ color: "rgba(233,233,237,.6)" }}>{new Date(a.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="font-medium" style={{ color: a.passed ? "#b5abfc" : "#e4c4b6" }}>
                  {Math.round(((a.score ?? 0) / (a.total ?? 1)) * 100)}% {a.passed ? "· passed" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import type { MasteryDistribution, MasteryTrendPoint } from "../../api/types";

const STATE_LABEL: Record<keyof MasteryDistribution, string> = {
  not_started: "not started",
  learning: "learning",
  passed: "passed",
  mastered: "mastered",
};

const STATE_COLOR: Record<keyof MasteryDistribution, string> = {
  not_started: "#3f424d",
  learning: "#5d5294",
  passed: "#796cbf",
  mastered: "#9184d9",
};

export function MasteryInsightsCard({
  distribution,
  trend,
}: {
  distribution: MasteryDistribution;
  trend: MasteryTrendPoint[];
}) {
  const total = distribution.not_started + distribution.learning + distribution.passed + distribution.mastered;
  const latest = trend[trend.length - 1] ?? null;

  return (
    <div>
      <div className="text-micro tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.62)" }}>
        Mastery insight
      </div>

      <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
        {(Object.keys(distribution) as (keyof MasteryDistribution)[]).map((state) => (
          <div key={state} style={{ flex: distribution[state] || 0.0001, background: STATE_COLOR[state] }} />
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-micro" style={{ color: "rgba(233,233,237,.55)" }}>
        {(Object.keys(distribution) as (keyof MasteryDistribution)[]).map((state) => (
          <div key={state} className="flex items-center justify-between gap-2">
            <span className="capitalize">{STATE_LABEL[state]}</span>
            <span className="font-medium">{distribution[state]}</span>
          </div>
        ))}
      </div>

      {trend.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-micro tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.5)" }}>
            Weekly pass trend
          </div>
          <div className="flex h-10 items-end gap-1">
            {trend.slice(-12).map((p) => (
              <div key={p.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-[3px]"
                  style={{ height: `${Math.max(8, Math.round((p.passRate / 100) * 32))}px`, background: "#9184d9" }}
                  title={`${p.weekStart}: ${p.passRate}% (${p.passed}/${p.attempts})`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 text-micro" style={{ color: "rgba(233,233,237,.55)" }}>
            {latest
              ? `${latest.passRate}% this week (${latest.passed}/${latest.attempts})`
              : "No recent attempts yet"}
            {total > 0 ? ` · ${Math.round((distribution.mastered / total) * 100)}% mastered overall` : ""}
          </div>
        </div>
      )}
    </div>
  );
}


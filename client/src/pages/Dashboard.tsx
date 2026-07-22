import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ActivityHeatmap from "../components/ActivityHeatmap";
import FillBar from "../components/FillBar";
import RoadmapWeekStrip from "../components/RoadmapWeekStrip";
import { levelStates } from "../lib/levels";

function Tile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-card p-4">
      <div className={`text-2xl font-semibold ${accent ? "text-brand-600" : ""}`}>{value}</div>
      <div className="mt-0.5 text-sm text-ink-600">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  // separate from the once-per-mount dashboard query and polled — this tile
  // should visibly tick up while the tab stays open, matching the heartbeat
  const { data: activity } = useQuery({
    queryKey: ["activity", "summary"],
    queryFn: api.activitySummary,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <p className="text-ink-600">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Guten Tag! 👋</h1>
        {data.dueToday > 0 ? (
          <Link
            to="/review"
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Start today's revision · {data.dueToday} due
          </Link>
        ) : (
          <span className="text-sm text-ink-600">Nothing due — alles erledigt ✓</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Words" value={data.totalWords} />
        <Tile label="Due today" value={data.dueToday} accent={data.dueToday > 0} />
        <Tile label="Never reviewed" value={data.newWords} />
        <Tile label="Reviews today" value={data.reviewsToday} />
        <Tile label="Day streak" value={`${data.streak} 🔥`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-hairline bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-ink-600">Today's roadmap</h2>
            {activity && (
              <span className="text-xs text-ink-400">
                {activity.minutesToday}m today · {activity.minutesThisWeek}m this week
              </span>
            )}
          </div>
          {data.roadmapToday ? (
            <Link to="/learning?group=progress&tab=today" className="block space-y-2 rounded-lg p-1 hover:bg-paper">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{data.roadmapToday.theme ?? "Today"}</span>
                <span className="text-ink-600">
                  {data.roadmapToday.tasksDone}/{data.roadmapToday.tasksTotal} done
                </span>
              </div>
              {data.roadmapToday.nextIncompleteTitle && (
                <p className="text-sm text-ink-600">
                  Next: <span className="font-medium text-ink-900">{data.roadmapToday.nextIncompleteTitle}</span>
                </p>
              )}
            </Link>
          ) : (
            <Link to="/learning?group=progress" className="text-sm text-brand-600 hover:underline">
              Start your 26-week roadmap →
            </Link>
          )}
          <div className="mt-3">
            <RoadmapWeekStrip days={data.roadmapWeekStrip} />
          </div>
        </section>

        <section className="rounded-xl border border-hairline bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-ink-600">Progress points</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-brand-600">{data.gamification.points}</span>
            <span className="text-sm text-ink-600">
              points · {data.gamification.badgeCount} badge{data.gamification.badgeCount === 1 ? "" : "s"}
            </span>
          </div>
          {data.gamification.recentBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.gamification.recentBadges.map((b) => (
                <span
                  key={b.key}
                  title={new Date(b.unlockedAt).toLocaleDateString()}
                  className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600"
                >
                  🏅 {b.label}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-hairline bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-600">Study activity</h2>
        <ActivityHeatmap data={data.heatmap} />
      </section>

      <section className="rounded-xl border border-hairline bg-card p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-ink-600">German level progress</h2>
          <div className="flex items-center gap-3 text-sm text-ink-600">
            {data.learning.streak > 0 && <span>Study streak {data.learning.streak} 🔥</span>}
            {data.learning.lastSelfTest && (
              <span>
                Last test{" "}
                <span className="font-medium text-ink-900">
                  {data.learning.lastSelfTest.score}/{data.learning.lastSelfTest.total}
                </span>
              </span>
            )}
          </div>
        </div>
        {data.learning.levels.every((l) => l.total === 0) ? (
          <Link to="/learning" className="text-sm text-brand-600 hover:underline">
            Set up your syllabus — open the Learning tab to get started →
          </Link>
        ) : (
          (() => {
            const states = levelStates(data.learning.levels);
            const activeIdx = Math.max(0, states.indexOf("active"));
            const active = data.learning.levels[activeIdx];
            return (
              <div className="space-y-3">
                <Link to="/learning" className="block space-y-1.5 rounded-lg p-1 hover:bg-paper">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold uppercase">
                      {active.level}
                      <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium normal-case text-brand-600">
                        current level
                      </span>
                    </span>
                    <span className="text-ink-600">
                      {active.done}/{active.total} · {active.percent}%
                    </span>
                  </div>
                  <FillBar percent={active.percent} />
                </Link>
                {/* later levels stay off the dashboard until reached — one goal at a time */}
                {states.some((s, i) => s === "done" && i !== activeIdx) && (
                  <div className="flex flex-wrap gap-2">
                    {data.learning.levels.map((l, i) =>
                      i === activeIdx || states[i] !== "done" ? null : (
                        <span
                          key={l.level}
                          className="rounded-full border border-ok-600 bg-ok-50 px-2.5 py-0.5 text-xs uppercase text-ok-600"
                        >
                          {l.level} ✓
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </section>

      {data.expiringDocuments.length > 0 && (
        <section className="rounded-xl border border-hairline bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-ink-600">Documents needing attention</h2>
          <ul className="space-y-1.5">
            {data.expiringDocuments.map((d) => (
              <li key={d.id}>
                <Link to="/checklist" className="flex items-center gap-2 text-sm hover:text-brand-600">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      d.expiry === "warn" ? "bg-brand-400" : "bg-danger-600"
                    }`}
                  />
                  <span className="flex-1">{d.title}</span>
                  <span className="text-xs text-ink-400">
                    {d.expiry === "expired" ? "expired" : `by ${d.expiresAt.slice(0, 10)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.values(data.applications).some((n) => n > 0) && (
        <section className="rounded-xl border border-hairline bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-ink-600">Application pipeline</h2>
          <Link to="/applications" className="flex flex-wrap gap-2">
            {(
              [
                ["wishlist", "Wishlist"],
                ["applied", "Applied"],
                ["interview", "Interview"],
                ["offer", "Offer"],
                ["rejected", "Rejected"],
              ] as const
            ).map(([key, label]) => (
              <span
                key={key}
                className="inline-block rounded-full border border-hairline bg-paper px-3 py-1 text-sm hover:border-brand-400"
              >
                {label} <span className="text-ink-400">{data.applications[key]}</span>
              </span>
            ))}
          </Link>
        </section>
      )}

      {data.lessons.length > 0 && (
        <section className="rounded-xl border border-hairline bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-ink-600">Words by lesson</h2>
          <ul className="flex flex-wrap gap-2">
            {data.lessons.map((l) => (
              <li key={l.lesson ?? "none"}>
                <Link
                  to={l.lesson ? `/vocabulary?lesson=${l.lesson}` : "/vocabulary"}
                  className="inline-block rounded-full border border-hairline bg-paper px-3 py-1 text-sm hover:border-brand-400"
                >
                  {l.lesson ?? "untagged"} <span className="text-ink-400">{l.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

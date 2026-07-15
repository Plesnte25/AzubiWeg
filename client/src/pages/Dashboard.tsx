import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ActivityChart from "../components/ActivityChart";

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

      <section className="rounded-xl border border-hairline bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-600">Reviews per day — last 14 days</h2>
        <ActivityChart data={data.activity} />
      </section>

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

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export type Destination = "today" | "roadmap" | "syllabus" | "sources" | "test" | "progress";

interface DestinationRow {
  key: Destination;
  label: string;
}

const GROUPS: { label: string; rows: DestinationRow[] }[] = [
  {
    label: "Plan",
    rows: [
      { key: "today", label: "Today" },
      { key: "roadmap", label: "Roadmap" },
    ],
  },
  {
    label: "Learn",
    rows: [
      { key: "syllabus", label: "Syllabus" },
      { key: "sources", label: "Sources" },
    ],
  },
  {
    label: "Check",
    rows: [
      { key: "test", label: "Self-tests" },
      { key: "progress", label: "Progress" },
    ],
  },
];

const READINESS_LABEL: Record<string, string> = {
  "not started": "not started",
  building: "building",
  "ready soon": "ready soon",
  "exam ready": "exam ready",
};

const TREND_ARROW = { up: "↗", down: "↘", flat: "→" } as const;

export function LearningRail({ destination, onNavigate }: { destination: Destination; onNavigate: (d: Destination) => void }) {
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const activated = status?.activated ?? false;

  const { data: today } = useQuery({ queryKey: ["roadmap", "today"], queryFn: api.roadmapToday, enabled: activated });
  const { data: backlog } = useQuery({ queryKey: ["roadmap", "backlog"], queryFn: api.roadmapBacklog, enabled: activated });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: sources } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const { data: readiness } = useQuery({ queryKey: ["roadmap", "readiness"], queryFn: api.goetheReadiness, enabled: activated });
  const { data: dueWords } = useQuery({ queryKey: ["words"], queryFn: api.words });

  const syllabusPercent = syllabus
    ? Math.round((syllabus.levels.reduce((s, l) => s + l.done, 0) / Math.max(1, syllabus.levels.reduce((s, l) => s + l.total, 0))) * 100)
    : 0;
  const dueCount = dueWords?.words.filter((w) => w.state === "due").length ?? 0;
  const activeSourceCount = sources?.sources.filter((s) => s.percent === null || s.percent < 100).length ?? 0;
  const lateCount = backlog?.totalOverdueTasks ?? 0;

  const BADGE: Record<Destination, { text: string; tone: "brand" | "warn" | "muted" } | null> = {
    today: dueCount > 0 ? { text: String(dueCount), tone: "brand" } : null,
    roadmap: lateCount > 0 ? { text: `${lateCount} late`, tone: "warn" } : null,
    syllabus: syllabus ? { text: `${syllabusPercent}%`, tone: "muted" } : null,
    sources: activeSourceCount > 0 ? { text: String(activeSourceCount), tone: "muted" } : null,
    test: null,
    progress: null,
  };

  return (
    <div className="flex w-[212px] shrink-0 flex-col gap-3 self-start lg:sticky lg:top-5">
      {/* Day counter */}
      <div className="rounded-2xl bg-ink-900 p-4 text-white">
        <p className="text-[10px] font-bold tracking-[0.1em] text-ink-400">LEARNING HUB</p>
        {activated && today ? (
          <>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[32px] font-bold leading-none">{today.overview.currentDayOffset + 1}</span>
              <span className="text-xs text-ink-400">of {today.overview.totalDays} days</span>
            </div>
            <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-[#333]">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.round((today.overview.percent / 100) * 100)}%` }}
              />
            </div>
            {today.theme && <p className="mt-2 text-[11.5px] text-ink-400">{today.theme}</p>}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-white">Roadmap not started</p>
            <Link to="/learning?view=roadmap" className="mt-2 inline-block text-xs font-medium text-brand-400 hover:underline">
              Activate →
            </Link>
          </>
        )}
      </div>

      {/* Destination list */}
      <div className="rounded-2xl border border-hairline bg-card p-1.5">
        {GROUPS.map((group, gi) => (
          <div key={group.label}>
            <p className={`px-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400 ${gi > 0 ? "pt-3" : "pt-2"}`}>
              {group.label}
            </p>
            {group.rows.map((row) => {
              const active = destination === row.key;
              const badge = BADGE[row.key];
              return (
                <button
                  key={row.key}
                  onClick={() => onNavigate(row.key)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                    active ? "bg-brand-50" : "hover:bg-paper"
                  }`}
                >
                  <span className={`size-[5px] shrink-0 rounded-full ${active ? "bg-brand-500" : "bg-hairline"}`} />
                  <span className={`flex-1 truncate text-[13px] ${active ? "font-semibold text-ink-900" : "text-ink-600"}`}>{row.label}</span>
                  {badge && (
                    <span
                      className={`shrink-0 text-[11px] font-bold ${
                        badge.tone === "brand" ? "text-brand-500" : badge.tone === "warn" ? "text-warn-500" : "text-ink-400"
                      }`}
                    >
                      {badge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Goethe readiness */}
      <div className="rounded-2xl border border-hairline bg-card p-4">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-400">Goethe {readiness?.level.toUpperCase() ?? ""}</p>
        {readiness ? (
          <>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm font-bold">{READINESS_LABEL[readiness.readinessLabel]}</span>
              {readiness.avgRecentTestScore !== null && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-ok-600">
                  {readiness.trend && TREND_ARROW[readiness.trend]} {readiness.avgRecentTestScore}%
                </span>
              )}
            </div>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-ink-900" style={{ width: `${readiness.syllabusPercent}%` }} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-ink-400">Activate your roadmap to see readiness.</p>
        )}
      </div>
    </div>
  );
}

import type { StudySource, StudySourceType } from "../../api/types";

const TYPE_LABELS: Record<StudySourceType, string> = {
  youtube: "YouTube",
  video: "Video",
  audio: "Audio",
  book: "Book",
  course: "Course",
  article: "Article",
  link: "Link",
};

/**
 * External-material completion rollup (Phase 4), sequenced after the
 * Sources rebuild since it reads that model's real per-type/percent shape.
 * `learningSources()` is a new query for Stats (not previously fetched
 * there) but shares the exact `["learning","sources"]` key the Sources page
 * itself uses, so no extra request if that page's already been visited
 * this session.
 */
export function SourcesRollupCard({ sources }: { sources: StudySource[] }) {
  const withProgress = sources.filter((s) => s.percent !== null);
  if (withProgress.length === 0) return null;

  const overallPct = Math.round(withProgress.reduce((a, s) => a + (s.percent ?? 0), 0) / withProgress.length);
  const byType = new Map<StudySourceType, { count: number; totalPct: number }>();
  for (const s of withProgress) {
    const entry = byType.get(s.type) ?? { count: 0, totalPct: 0 };
    entry.count += 1;
    entry.totalPct += s.percent ?? 0;
    byType.set(s.type, entry);
  }
  const rows = [...byType.entries()]
    .map(([type, v]) => ({ type, avgPct: Math.round(v.totalPct / v.count), count: v.count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Sources progress
        </div>
        <span className="text-[13px] font-medium">{overallPct}%</span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.type} className="flex items-center gap-2">
            <span className="w-14 shrink-0 truncate text-[11px]" style={{ color: "rgba(233,233,237,.55)" }}>
              {TYPE_LABELS[r.type]} ({r.count})
            </span>
            <div className="h-[5px] flex-1 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
              <div className="h-full rounded-[3px]" style={{ width: `${r.avgPct}%`, background: "linear-gradient(90deg,#5d5294,#9184d9)" }} />
            </div>
            <span className="w-8 shrink-0 text-right text-[10.5px]" style={{ color: "rgba(233,233,237,.4)" }}>
              {r.avgPct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

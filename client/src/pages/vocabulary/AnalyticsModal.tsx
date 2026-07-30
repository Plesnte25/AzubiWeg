import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../../api/client";
import type { CefrLevel, Word } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { SkeletonCard, SkeletonText } from "../../components/ui/Skeleton";
import { THEMENFELD_LABELS, THEMENFELD_ORDER } from "../../lib/vocab";

const GRADE_VARIANT = { hard: "danger", good: "neutral", easy: "success" } as const;
const HISTORY_DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface AnalyticsModalProps {
  words: Word[];
  onClose: () => void;
  onDrillTheme: (themenfeld: string) => void;
}

export function AnalyticsModal({ words, onClose, onDrillTheme }: AnalyticsModalProps) {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["reviews", "stats"], queryFn: api.reviewStats });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["reviews", "history", 200],
    queryFn: () => api.reviewHistory(200),
  });

  const dueNow = words.filter((w) => w.state === "due").length;
  const problemWords = words.filter((w) => w.leech).length;

  const histogram = useMemo(() => {
    const days: { key: string; label: string; count: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), count: 0, isToday: i === 0 });
    }
    for (const entry of history?.entries ?? []) {
      const key = dayKey(new Date(entry.reviewedAt));
      const bucket = days.find((d) => d.key === key);
      if (bucket) bucket.count++;
    }
    return days;
  }, [history]);
  const maxCount = Math.max(1, ...histogram.map((d) => d.count));

  const masteryByLevel = useMemo(() => {
    const levels: CefrLevel[] = ["a1", "a2", "b1"];
    return levels.map((level) => {
      const inLevel = words.filter((w) => w.level === level);
      const mastered = inLevel.filter((w) => w.state === "mastered").length;
      return { level, total: inLevel.length, percent: inLevel.length ? Math.round((mastered / inLevel.length) * 100) : 0 };
    });
  }, [words]);

  const weakestThemenfelder = useMemo(() => {
    return THEMENFELD_ORDER.map((themenfeld) => {
      const inTheme = words.filter((w) => w.themenfeld.includes(themenfeld));
      const mastered = inTheme.filter((w) => w.state === "mastered").length;
      return { themenfeld, total: inTheme.length, percent: inTheme.length ? Math.round((mastered / inTheme.length) * 100) : 0 };
    })
      .filter((t) => t.total > 0)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 5);
  }, [words]);

  const avgPerDay = stats ? Math.round((stats.reviewsThisWeek / 7) * 10) / 10 : 0;

  return (
    <Modal title="Analytics" onClose={onClose} size="xl">
      <div className="flex max-h-[min(600px,75vh)] flex-col gap-4 lg:flex-row">
        {/* left: static overview */}
        <div className="flex shrink-0 flex-col gap-3 overflow-y-auto lg:max-w-[58%] lg:min-w-[360px] lg:flex-[0_1_560px]">
          {statsLoading || !stats ? (
            <SkeletonCard className="h-16" />
          ) : (
            <p className="text-sm text-ink-600">
              <span className="text-lg font-semibold text-ink-900">{stats.reviewsToday}</span> today ·{" "}
              <span className="font-medium text-ink-900">{avgPerDay}</span>/day average this week
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiTile label="Today" value={stats?.reviewsToday} />
            <KpiTile label="Last 7 days" value={stats?.reviewsThisWeek} />
            <KpiTile label="Due now" value={dueNow} />
            <KpiTile label="Problem words" value={problemWords} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-400">REVIEWS · LAST 14 DAYS</p>
            {historyLoading ? (
              <SkeletonCard className="h-20" />
            ) : (
              <div className="flex h-20 items-end gap-1">
                {histogram.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.count}`}>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max(3, (d.count / maxCount) * 80)}px`,
                        backgroundColor: d.isToday ? "var(--color-brand-500)" : "var(--color-hairline)",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-400">GRADE MIX</p>
              {statsLoading || !stats ? (
                <SkeletonText lines={3} />
              ) : (
                <div className="space-y-1.5">
                  {(["easy", "good", "hard"] as const).map((g) => {
                    const count = stats.gradeBreakdown[g];
                    const percent = stats.totalReviews === 0 ? 0 : Math.round((count / stats.totalReviews) * 100);
                    return (
                      <div key={g} className="flex items-center gap-2 text-xs">
                        <span className="w-10 shrink-0 capitalize text-ink-600">{g}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                          <div
                            className={`h-full ${g === "hard" ? "bg-danger-600" : g === "good" ? "bg-ink-400" : "bg-ok-600"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-ink-400">
                          {count} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-400">MASTERY BY LEVEL</p>
              <div className="space-y-1.5">
                {masteryByLevel.map((l) => (
                  <div key={l.level} className="flex items-center gap-2 text-xs">
                    <span className="w-6 shrink-0 font-medium text-ink-600">{l.level.toUpperCase()}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                      <div className="h-full bg-ok-600" style={{ width: `${l.percent}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-ink-400">{l.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-400">WEAKEST THEMENFELDER</p>
            {weakestThemenfelder.length === 0 ? (
              <p className="text-xs text-ink-400">Not enough data yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {weakestThemenfelder.map((t) => (
                  <li key={t.themenfeld} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{THEMENFELD_LABELS[t.themenfeld]}</span>
                    <span className="shrink-0 text-ink-400">{t.percent}% mastered</span>
                    <Button size="sm" variant="outline" onClick={() => onDrillTheme(t.themenfeld)}>
                      Drill
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* right: the only scroller */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-hairline pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-400">RECENT REVIEWS</p>
          {historyLoading ? (
            <SkeletonText lines={6} />
          ) : !history || history.entries.length === 0 ? (
            <p className="text-sm text-ink-600">No reviews yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.entries.slice(0, 30).map((e) => (
                <li key={e.id} className="rounded-lg border border-hairline bg-card px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.headword}</span>
                    <Badge variant={GRADE_VARIANT[e.grade]} className="capitalize">
                      {e.grade}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {new Date(e.reviewedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · next in{" "}
                    {e.intervalAfter}d
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function KpiTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-hairline bg-card p-2 text-center">
      <p className="text-base font-semibold">{value ?? "–"}</p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Fire, Target, Timer, TrendUp } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { ProgressPeriod, SrsState } from "../../api/types";
import { useNavStack } from "../../lib/navStack";
import { fullArtLabel } from "../../lib/wordDisplay";
import type { SkillProgressDatum } from "../../lib/skills";
import { ActivationGate } from "../learning-hub/ActivationGate";
import { Constellation } from "./Constellation";
import { RetentionCurve } from "./RetentionCurve";
import { SkillProgressGauges } from "./SkillProgressGauges";

const PERIODS: { key: ProgressPeriod; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "all" },
];
const PERIOD_DAYS: Partial<Record<ProgressPeriod, number>> = { "7d": 7, "30d": 30, "90d": 90 };

const STATE_ORDER: SrsState[] = ["mastered", "learning", "due", "new"];
const STATE_LABEL: Record<SrsState, string> = { mastered: "mastered", learning: "learning", due: "due", new: "new" };
const STATE_COLOR: Record<SrsState, string> = { mastered: "#9184d9", learning: "#796cbf", due: "#5d5294", new: "#3f424d" };

/**
 * Real Stats tab — Nocturne rebuild of the pre-Nocturne ProgressPage (still
 * used by nothing else after this). The handoff's sProgress screen (word
 * constellation, SRS-state bar, mastery-by-skill, retention curve, "the
 * shaky ones") is the primary structure here; the old page's task/roadmap-
 * centric KPIs, streak grid, and Goethe-readiness card are real and not
 * redundant with anything above, so they're kept as a condensed "Activity"
 * section below rather than dropped — the old page's minutes-per-day chart
 * and completion-by-skill bars ARE redundant with the new mastery-by-skill
 * list and are dropped.
 */
export default function Stats() {
  const { goBack, backLabel, push } = useNavStack();
  const [period, setPeriod] = useState<ProgressPeriod>("30d");

  const { data: roadmapStatus, isLoading: roadmapLoading } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const { data: wordsData, isLoading: wordsLoading } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: historyData } = useQuery({ queryKey: ["reviews", "history", "sparkline"], queryFn: () => api.reviewHistory(200) });
  const { data: reviewStats } = useQuery({ queryKey: ["reviews", "stats"], queryFn: api.reviewStats });
  const { data: weakWordsData } = useQuery({ queryKey: ["reviews", "weakWords"], queryFn: () => api.reviewWeakWords(6) });
  const { data: examStatus } = useQuery({ queryKey: ["learning", "exam", "status"], queryFn: api.examStatus });
  const { data: progress } = useQuery({ queryKey: ["learning", "progress", period], queryFn: () => api.learningProgress(period) });

  if (roadmapLoading || wordsLoading || !wordsData) {
    return <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)]" style={{ background: "#161826" }} />;
  }
  if (!roadmapStatus?.activated) {
    return (
      <div className="-mx-4 -my-4 min-h-[calc(100dvh-40px)] px-4 py-6" style={{ background: "#161826" }}>
        <ActivationGate />
      </div>
    );
  }

  const words = wordsData.words;
  const periodDays = PERIOD_DAYS[period];
  const addedInPeriod = periodDays ? words.filter((w) => Date.now() - new Date(w.createdAt).getTime() <= periodDays * 86_400_000).length : null;

  const stateCounts: Record<SrsState, number> = { new: 0, due: 0, learning: 0, mastered: 0 };
  for (const w of words) stateCounts[w.state]++;

  const lastReviewed = historyData?.entries[0]?.wordId ?? null;

  const bySkill: SkillProgressDatum[] = (progress?.bySkill ?? []).map((s) => ({
    skill: s.skill,
    total: s.planned,
    done: s.done,
    percent: s.planned === 0 ? 0 : Math.round((s.done / s.planned) * 100),
  }));

  const accuracy = reviewStats
    ? (() => {
        const { hard, good, easy } = reviewStats.gradeBreakdown;
        const total = hard + good + easy;
        return total === 0 ? null : Math.round(((good + easy) / total) * 100);
      })()
    : null;

  const weakWords = weakWordsData?.words ?? [];
  const historyByWord = new Map<string, number>();
  for (const e of historyData?.entries ?? []) {
    if (e.grade === "hard") historyByWord.set(e.wordId, (historyByWord.get(e.wordId) ?? 0) + 1);
  }
  const maxWeakCount = Math.max(1, ...weakWords.map((w) => historyByWord.get(w.wordId) ?? 1));

  return (
    <>
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+90px)] lg:hidden"
      style={{ background: "radial-gradient(90% 34% at 50% 30%, #2b2741 0%, #161826 72%)" }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <button type="button" onClick={goBack} className="flex items-center gap-[3px] text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
            {backLabel}
          </button>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            Where you stand
          </div>
          <div className="mt-0.5 text-[26px] leading-tight font-medium" style={{ letterSpacing: "-.025em" }}>
            Stats
          </div>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: period === p.key ? "#9184d9" : "transparent", color: period === p.key ? "#161826" : "rgba(233,233,237,.6)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex items-end gap-2.5">
        <div className="text-[48px] leading-[.95] font-medium" style={{ letterSpacing: "-.04em" }}>
          {words.length}
        </div>
        <div className="pb-1.5 text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          words that are
          <br />
          yours{addedInPeriod !== null ? ` · +${addedInPeriod} / ${period}` : ""}
        </div>
      </div>

      <Constellation words={words} highlightWordId={lastReviewed} />

      <div className="mt-2">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
          {STATE_ORDER.map((s) => (
            <div key={s} style={{ flex: stateCounts[s] || 0.0001, background: STATE_COLOR[s] }} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: "rgba(233,233,237,.45)" }}>
          {STATE_ORDER.map((s) => (
            <span key={s}>
              {STATE_LABEL[s]} {stateCounts[s]}
            </span>
          ))}
        </div>
      </div>

      {bySkill.length > 0 && (
        <div className="mt-[22px]">
          <SkillProgressGauges
            bySkill={bySkill}
            benchmarkPercent={examStatus ? Math.round(examStatus.passThreshold * 100) : 70}
            benchmarkLevel={examStatus ? examStatus.level.toUpperCase() : ""}
          />
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[20px] font-medium">{accuracy === null ? "—" : `${accuracy}%`}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            accuracy
          </div>
        </div>
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[20px] font-medium" style={{ color: "#b5abfc" }}>
            {reviewStats?.avgIntervalAfter ?? "—"}
            {reviewStats?.avgIntervalAfter !== null && reviewStats?.avgIntervalAfter !== undefined ? "d" : ""}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            avg interval
          </div>
        </div>
        <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
          <div className="text-[20px] font-medium">{reviewStats?.reviewsThisWeek ?? "—"}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            reviews this week
          </div>
        </div>
      </div>

      <div className="mt-[18px]">
        <RetentionCurve entries={historyData?.entries ?? []} />
      </div>

      {weakWords.length > 0 && (
        <div className="mt-[18px]">
          <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            The shaky ones
          </div>
          <div className="flex flex-col gap-1.5">
            {weakWords.map((w) => {
              const word = words.find((x) => x.id === w.wordId);
              const count = historyByWord.get(w.wordId) ?? 1;
              return (
                <div key={w.wordId} className="flex items-center gap-2.5 text-[13.5px]">
                  <span
                    className="w-14 shrink-0 truncate text-[10px]"
                    title={word ? fullArtLabel(word) : undefined}
                    style={{ color: word?.genus ? "#d2cefd" : "rgba(233,233,237,.5)" }}
                  >
                    {word ? fullArtLabel(word) : ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{w.headword}</span>
                  <div className="h-[5px] w-[66px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                    <div className="h-full" style={{ width: `${Math.round((count / maxWeakCount) * 100)}%`, background: "#b5abfc" }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                    {count}×
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {progress && (
        <div className="mt-6">
          <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            Activity
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
              <Target size={14} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
              <div className="mt-1 text-[16px] font-medium">
                {progress.kpis.tasksKept.value}/{progress.kpis.tasksKept.total}
              </div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
                tasks kept
              </div>
            </div>
            <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
              <Timer size={14} weight="regular" style={{ color: "#9184d9" }} aria-hidden="true" />
              <div className="mt-1 text-[16px] font-medium">{progress.kpis.minutes.value}</div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
                minutes
              </div>
            </div>
            <div className="rounded-xl p-[11px]" style={{ background: "#1c1f2c" }}>
              <Fire size={14} weight="regular" style={{ color: "#e4c4b6" }} aria-hidden="true" />
              <div className="mt-1 text-[16px] font-medium">{progress.kpis.streak.current}d</div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
                streak · best {progress.kpis.streak.best}d
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
            <div className="flex items-center gap-2 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
              <CalendarCheck size={12} weight="regular" aria-hidden="true" />
              Study streak
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {progress.streakGrid.map((cell, i) => {
                const isToday = i === progress.streakGrid.length - 1;
                const intensity = cell.minutes === 0 ? 0 : cell.minutes < 15 ? 1 : cell.minutes < 30 ? 2 : cell.minutes < 60 ? 3 : 4;
                const colors = ["#20222f", "#423a6a", "#5d5294", "#796cbf", "#9184d9"];
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.minutes} min`}
                    className="size-4 rounded-sm"
                    style={{ background: isToday ? "#b5abfc" : colors[intensity] }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl p-3.5" style={{ background: "linear-gradient(160deg,#2b2741,#232532)", boxShadow: "0 0 0 1px #423a6a" }}>
            <div className="flex items-center gap-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "#b5abfc" }}>
              <TrendUp size={12} weight="regular" aria-hidden="true" />
              Goethe {progress.readiness.level.toUpperCase()}
            </div>
            <p className="mt-1 text-[14px] font-medium capitalize">{progress.readiness.readinessLabel}</p>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full" style={{ background: "#292b31" }}>
              <div className="h-full rounded-full" style={{ width: `${progress.readiness.syllabusPercent}%`, background: "#9184d9" }} />
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Desktop (lg+) — German Companion Desktop.dc.html id="2f": icon rail
        + a 3-column grid (totals/strength/accuracy | constellation +
        retention curve | mastery-by-skill + shaky ones). The "Strength" bar
        reuses the real SRS state (mastered/learning/due/new) breakdown
        rather than the handoff's fabricated solid/stable/learning/shaky
        tiering, which has no backing data anywhere in this app — see the
        implementation plan for the full reasoning. */}
    <div className="hidden lg:flex lg:h-full lg:flex-col">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
            Where you stand
          </div>
          <div className="mt-0.5 text-[27px] leading-tight font-medium" style={{ letterSpacing: "-.02em" }}>
            Stats
          </div>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#20222f" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: period === p.key ? "#9184d9" : "transparent", color: period === p.key ? "#161826" : "rgba(233,233,237,.6)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[18px] grid flex-1 gap-5" style={{ gridTemplateColumns: "1fr 1.15fr 1fr" }}>
        <div className="flex flex-col gap-3.5">
          <div className="rounded-xl p-4 text-center" style={{ background: "#1c1f2c" }}>
            <div className="text-[34px] leading-none font-medium" style={{ letterSpacing: "-.03em" }}>
              {words.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
              words that are yours
            </div>
            {addedInPeriod !== null && (
              <div className="mt-1 text-[11px]" style={{ color: "#b5abfc" }}>
                +{addedInPeriod} / {period}
              </div>
            )}
          </div>

          <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c" }}>
            <div className="text-[9.5px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
              Strength
            </div>
            <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
              {STATE_ORDER.map((s) => (
                <div key={s} style={{ flex: stateCounts[s] || 0.0001, background: STATE_COLOR[s] }} />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[9.5px]" style={{ color: "rgba(233,233,237,.5)" }}>
              {STATE_ORDER.map((s) => (
                <span key={s}>
                  {STATE_LABEL[s]} {stateCounts[s]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3" style={{ background: "#1c1f2c" }}>
              <div className="text-[19px] font-medium">{accuracy === null ? "—" : `${accuracy}%`}</div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
                accuracy
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1c1f2c" }}>
              <div className="text-[19px] font-medium" style={{ color: "#b5abfc" }}>
                {reviewStats?.avgIntervalAfter ?? "—"}
                {reviewStats?.avgIntervalAfter !== null && reviewStats?.avgIntervalAfter !== undefined ? "d" : ""}
              </div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
                avg interval
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-1 items-center justify-center rounded-xl p-4" style={{ background: "#1c1f2c" }}>
            <Constellation words={words} highlightWordId={lastReviewed} />
          </div>
          <RetentionCurve entries={historyData?.entries ?? []} />
        </div>

        <div className="flex flex-col gap-3.5 overflow-y-auto">
          {bySkill.length > 0 && (
            <SkillProgressGauges
              bySkill={bySkill}
              benchmarkPercent={examStatus ? Math.round(examStatus.passThreshold * 100) : 70}
              benchmarkLevel={examStatus ? examStatus.level.toUpperCase() : ""}
            />
          )}

          {weakWords.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
                The shaky ones
              </div>
              <div className="flex flex-col gap-1.5">
                {weakWords.map((w) => {
                  const word = words.find((x) => x.id === w.wordId);
                  const count = historyByWord.get(w.wordId) ?? 1;
                  return (
                    <div key={w.wordId} className="flex items-center gap-2.5 text-[13.5px]">
                      <span
                        className="w-14 shrink-0 truncate text-[10px]"
                        title={word ? fullArtLabel(word) : undefined}
                        style={{ color: word?.genus ? "#d2cefd" : "rgba(233,233,237,.5)" }}
                      >
                        {word ? fullArtLabel(word) : ""}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{w.headword}</span>
                      <div className="h-[5px] w-[66px] overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                        <div className="h-full" style={{ width: `${Math.round((count / maxWeakCount) * 100)}%`, background: "#b5abfc" }} />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                        {count}×
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => push("/review", { state: { words: words.filter((w) => weakWords.some((ww) => ww.wordId === w.id)) } })}
                className="mt-3 min-h-[38px] w-full rounded-[10px] text-[13px] font-medium text-white"
                style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
              >
                Drill the shaky ones
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

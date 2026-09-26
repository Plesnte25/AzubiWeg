import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { localDateKey } from "../../lib/tasks";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { GenderDrillBody } from "../plan/tests/GenderDrill";
import {
  ArticlesTile,
  HeatTile,
  HeroTile,
  JobsTile,
  ProjectionTile,
  RetentionTile,
  RingTile,
  ShakyTile,
  SkillsTile,
  TimeTile,
} from "./StatsTiles";
import { lernzeitSeries, type Range } from "./series";

/*
 * Stats (Bento README §6, AzubiStats.dc.html). Ten tiles plus the shaky-words Drill modal. Grid areas are the
 * prototype's layout table minus its nav row (Layout.tsx renders the chrome). Where each number comes from:
 *   hero        GET /words (strength per word) + /reviews/stats accuracy per range
 *   Lernzeit    /activity/summary?days=366 (learning-route minutes), goal from the weekly goal ÷ 6 study days
 *   ring        dashboard bento.weeklyGoal
 *   projection  /learning/pace (active level), /roadmap/readiness (recent test average), /exam/status
 *   retention   /reviews/stats retention (real gaps between reviews)
 *   skills      dashboard bento.skillMastery (Level % split by skill)
 *   articles    /learning/quiz/results articles (gender-drill answers)
 *   heatmap     dashboard bento.streakCalendar
 *   shaky       /reviews/weak-words (strength 1–2, hard count)
 *   jobs        /applications/stats funnel + bento.nextInterview
 */

const LAYOUT = {
  lg: '"hero hero time time time ring" "ret ret skills skills art proj" "heat heat heat shaky shaky jobs"',
  md: ['"hero hero proj ring" "time time time time" "ret ret skills skills" "heat heat heat heat" "art shaky shaky jobs"', "250px 230px 290px 270px 300px"],
  // sm: articles and jobs get a full row each; side by side, a 360px phone cut off the funnel labels ("interviews").
  sm: ['"hero hero" "proj ring" "time time" "skills skills" "ret ret" "heat heat" "art art" "jobs jobs" "shaky shaky"', "250px 230px 210px 300px 240px 220px 220px 210px 330px"],
} as const;

function gridStyle(bp: Breakpoint, fill: boolean): CSSProperties {
  if (bp === "lg") {
    return {
      gridTemplateColumns: "repeat(6,minmax(0,1fr))",
      // lgfill: the three rows share the viewport; shorter lg screens page-scroll with fixed row floors
      gridTemplateRows: fill ? "repeat(3,minmax(0,1fr))" : "260px 260px 250px",
      gridTemplateAreas: LAYOUT.lg,
      gap: 20,
      height: fill ? "100%" : undefined,
      "--k": 1,
    } as CSSProperties;
  }
  if (bp === "md") {
    return { gridTemplateColumns: "repeat(4,minmax(0,1fr))", gridTemplateRows: LAYOUT.md[1], gridTemplateAreas: LAYOUT.md[0], gap: 20, "--k": 0.92 } as CSSProperties;
  }
  return { gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridTemplateRows: LAYOUT.sm[1], gridTemplateAreas: LAYOUT.sm[0], gap: 16, "--k": 0.8 } as CSSProperties;
}

/** "Drill the shaky ones": the gender drill on shaky nouns, in the prototype's tomato dialog. */
function DrillModal({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState({ i: 0, total: 0 });
  const done = progress.total > 0 && progress.i >= progress.total;
  return (
    <Modal
      ariaLabel="Shaky drill"
      tag={`Shaky drill${progress.total ? ` · ${done ? "done" : `${progress.i + 1} of ${progress.total}`}` : ""}`}
      bg="var(--tomato)"
      width={480}
      onClose={onClose}
    >
      {progress.total > 0 && (
        <div className="flex shrink-0" style={{ gap: 5 }} aria-hidden="true">
          {Array.from({ length: progress.total }, (_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                border: "2px solid var(--line)",
                background: i < progress.i ? "var(--mint)" : i === progress.i ? "var(--plain)" : "transparent",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>
      )}
      <GenderDrillBody shakyOnly onClose={onClose} onProgress={(i, total) => setProgress({ i, total })} />
    </Modal>
  );
}

export default function Stats() {
  const { bp, fill } = useBreakpoint();
  const [range, setRange] = useState<Range>("30d");
  const [drill, setDrill] = useState(false);

  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: reviewStats } = useQuery({ queryKey: ["reviews", "stats"], queryFn: api.reviewStats });
  const { data: weak } = useQuery({ queryKey: ["reviews", "weakWords", 6], queryFn: () => api.reviewWeakWords(6) });
  const { data: activity } = useQuery({ queryKey: ["activity", "summary", 366], queryFn: () => api.activitySummary(366) });
  const { data: quiz } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });
  const { data: pace } = useQuery({ queryKey: ["learning", "pace"], queryFn: api.learningPace });
  const { data: readiness } = useQuery({ queryKey: ["learning", "readiness"], queryFn: api.goetheReadiness });
  const { data: exam } = useQuery({ queryKey: ["learning", "exam", "status"], queryFn: api.examStatus });
  const { data: appStats } = useQuery({ queryKey: ["applications", "stats"], queryFn: api.applicationStats });

  const words = useMemo(() => wordsData?.words ?? [], [wordsData]);
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const lernzeitByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of activity?.history ?? []) m.set(d.date, d.lernzeit);
    if (activity) m.set(localDateKey(), activity.lernzeitToday);
    return m;
  }, [activity]);

  if (!dash) return <div className="min-h-[60vh]" aria-busy="true" />;
  const b = dash.bento;
  const series = lernzeitSeries(lernzeitByDay, range, b.weeklyGoal.goalMinutes);

  return (
    <div className="grid" style={gridStyle(bp, fill)}>
      <HeroTile words={words} range={range} onRange={setRange} accuracy={reviewStats?.accuracy[range] ?? null} />
      <TimeTile series={series} range={range} bp={bp} />
      <RingTile goal={b.weeklyGoal} />
      <ProjectionTile level={b.level.level} pace={pace} readiness={readiness} exam={exam} />
      <RetentionTile points={reviewStats?.retention ?? []} />
      <SkillsTile rows={b.skillMastery} level={b.level.level} bp={bp} />
      <ArticlesTile articles={quiz?.articles} drill={quiz?.scores.genderDrill} />
      <HeatTile calendar={b.streakCalendar} streak={dash.streak} best={b.bestStreak} bp={bp} />
      <ShakyTile weak={weak?.words ?? []} wordsById={wordsById} bp={bp} onDrill={() => setDrill(true)} />
      <JobsTile stats={appStats?.stats} interview={b.nextInterview} />
      {drill && <DrillModal onClose={() => setDrill(false)} />}
    </div>
  );
}

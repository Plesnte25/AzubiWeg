import { useState, type CSSProperties, type ReactNode } from "react";
import { Briefcase, Fire, Lightning, Sparkle } from "@phosphor-icons/react";
import type { ApplicationStats, ArticleAccuracy, BentoDashboard, ExamStatus, GoetheReadiness, RoutePace, WeakWord, Word } from "../../api/types";
import { Eyebrow, Tile } from "../../components/ui/Tile";
import { Segmented } from "../../components/ui/Segmented";
import { Starburst } from "../../components/ui/Sticker";
import { SKILL_COLORS, SKILL_LABELS } from "../../lib/skills";
import { localDateKey } from "../../lib/tasks";
import type { Breakpoint } from "../../lib/useBreakpoint";
import { articleLabel, wordColor } from "../../lib/wordBento";
import { heatLevel } from "../../lib/heat";
import { MONTHS, type LernzeitSeries, type Range } from "./series";

/*
 * The ten Stats tiles (AzubiStats.dc.html). Styles are the prototype's literal values; the data is real (see
 * Stats.tsx for where each number comes from, and CLAUDE.md for the one-definition-per-metric rule).
 */

const RANGES = [
  ["7d", "7d"],
  ["30d", "30d"],
  ["1y", "1y"],
] as const;
const k = (px: number) => `calc(var(--k) * ${px}px)`;
const title: CSSProperties = { fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" };

function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}` : `${h}h`;
}

// ── Hero: words + strength ───────────────────────────────────────────────────

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "1y": 365 };
const GAIN_COPY: Record<Range, string> = { "7d": "this week", "30d": "in 30 days", "1y": "in 12 months" };

export function HeroTile({
  words,
  range,
  onRange,
  accuracy,
}: {
  words: Word[];
  range: Range;
  onRange: (r: Range) => void;
  accuracy: number | null;
}) {
  const since = Date.now() - RANGE_DAYS[range] * 86_400_000;
  const gain = words.filter((w) => new Date(w.createdAt).getTime() >= since).length;
  // solid = 3+ pips, shaky = 1–2 (the app-wide rule), learning = everything not yet reviewed into either
  const solid = words.filter((w) => (w.strength ?? 0) >= 3).length;
  const shaky = words.filter((w) => w.strength === 1 || w.strength === 2).length;
  const parts = [
    { l: "solid", n: solid, c: "var(--mint)" },
    { l: "learning", n: words.length - solid - shaky, c: "var(--plain)" },
    { l: "shaky", n: shaky, c: "var(--tomato)" },
  ];
  const total = Math.max(1, words.length);
  const shown = parts.filter((p) => p.n > 0);
  return (
    <Tile
      bg="var(--lemon)"
      tilt={-0.5}
      radius={26}
      shadow={6}
      tape={{ left: 34, width: 84 }}
      className="flex flex-col"
      style={{ gridArea: "hero", padding: k(20), gap: 10 }}
    >
      <div className="flex items-center justify-between gap-2">
        <Eyebrow className="whitespace-nowrap">Where you stand</Eyebrow>
        <Segmented label="Range" options={RANGES} value={range} onChange={onRange} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <span style={{ fontSize: k(64), fontWeight: 700, letterSpacing: "-.06em", lineHeight: 0.85 }}>
          {words.length.toLocaleString("en")}
        </span>
        <div className="flex flex-col" style={{ gap: 2, paddingBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>words that are yours</span>
          <span
            className="self-start"
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: "1px 9px",
              borderRadius: 999,
              border: "2px solid var(--line)",
              background: "var(--mint)",
              transform: "rotate(-2deg)",
            }}
          >
            +{gain.toLocaleString("en")} {GAIN_COPY[range]}
          </span>
        </div>
      </div>
      <div
        className="mt-auto flex overflow-hidden"
        role="img"
        aria-label={parts.map((p) => `${p.n} ${p.l}`).join(", ")}
        style={{ height: 22, border: "2.5px solid var(--line)", borderRadius: 10, boxSizing: "border-box", background: "var(--plain)" }}
      >
        {shown.map((p, i) => (
          <div
            key={p.l}
            style={{
              width: `${(p.n / total) * 100}%`,
              background: p.c,
              borderRight: i < shown.length - 1 ? "2.5px solid var(--line)" : "none",
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        {parts.map((p) => (
          <span key={p.l} className="inline-flex items-center" style={{ gap: 6, fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, border: "2px solid var(--line)", background: p.c, boxSizing: "border-box" }} />
            {p.n.toLocaleString("en")} {p.l}
          </span>
        ))}
        <span className="ml-auto" style={{ fontSize: 13, fontWeight: 700 }}>
          {accuracy === null ? "no reviews yet" : `${accuracy}% accuracy`}
        </span>
      </div>
    </Tile>
  );
}

// ── Lernzeit bars ────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;

export function TimeTile({ series, range, bp }: { series: LernzeitSeries; range: Range; bp: Breakpoint }) {
  const [sel, setSel] = useState<number | null>(null);
  const [seenRange, setSeenRange] = useState(range);
  if (seenRange !== range) {
    setSeenRange(range);
    setSel(null);
  }
  const { vals, labels, goal, unit } = series;
  const mx = Math.max(...vals, goal, 1) * 1.1;
  const sum = round1(vals.reduce((a, b) => a + b, 0));
  const total = unit === "h" ? `${sum} h` : `${Math.floor(sum / 60)}h ${sum % 60}m`;
  const sub = range === "7d" ? "this week" : range === "30d" ? "last 30 days" : "last 12 months";
  const selLabel =
    sel !== null && vals[sel] !== undefined ? `${labels[sel]} · ${vals[sel]} ${unit}` : `avg ${unit === "h" ? round1(sum / vals.length) : Math.round(sum / vals.length)} ${unit}`;
  const isSm = bp === "sm";
  return (
    <Tile tilt={0.4} className="flex flex-col" style={{ gridArea: "time", padding: "18px 20px", gap: 10 }}>
      <div className="flex flex-wrap items-baseline justify-between" style={{ gap: 10 }}>
        <div className="flex items-baseline" style={{ gap: 10 }}>
          <span style={title}>Lernzeit</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)" }}>{sub}</span>
        </div>
        <span style={{ fontSize: k(26), fontWeight: 700, letterSpacing: "-.04em" }}>{total}</span>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-end"
        style={{ gap: range === "30d" ? (isSm ? 2 : 4) : isSm ? 6 : 10, borderBottom: "2.5px solid var(--line)", marginTop: 16 }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${(goal / mx) * 100}%`,
            borderTop: "2.5px dashed var(--plainText)",
            opacity: 0.55,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 0,
              top: -18,
              whiteSpace: "nowrap",
              background: "var(--plain)",
              padding: "0 4px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--plainMuted)",
            }}
          >
            goal {goal} {unit}
          </span>
        </span>
        {vals.map((v, i) => (
          <button
            key={labels[i]}
            type="button"
            aria-label={`${labels[i]}: ${v} ${unit}`}
            aria-pressed={sel === i}
            onClick={() => setSel(sel === i ? null : i)}
            className="cursor-pointer p-0"
            style={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(2, (v / mx) * 100)}%`,
              background: sel === i ? "var(--btn)" : v >= goal && v > 0 ? "var(--mint)" : v ? "var(--sky)" : "var(--plain2)",
              border: "2px solid var(--line)",
              borderBottom: "none",
              borderRadius: "6px 6px 0 0",
              boxSizing: "border-box",
              position: "relative",
              zIndex: 1,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between" style={{ fontSize: 11, fontWeight: 700, color: "var(--plainMuted)" }}>
        <span>{labels[0]}</span>
        <span>{selLabel}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </Tile>
  );
}

// ── Weekly goal ring ─────────────────────────────────────────────────────────

const RING_C = 251.3; // 2π · 40

export function RingTile({ goal }: { goal: BentoDashboard["weeklyGoal"] }) {
  const pct = Math.min(100, goal.percent);
  const left = Math.max(0, goal.goalMinutes - goal.minutes);
  const dash = `${(pct / 100) * RING_C} ${RING_C}`;
  return (
    <Tile
      bg="var(--lilac)"
      tilt={-1}
      className="flex flex-col items-center justify-between"
      style={{ gridArea: "ring", padding: 16, gap: 8 }}
    >
      <Eyebrow className="self-start">Weekly goal</Eyebrow>
      <div className="relative" style={{ width: k(128), height: k(128) }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle cx="50" cy="50" r="40" style={{ fill: "none", stroke: "var(--plain)", strokeWidth: 14 }} />
          {pct > 0 && (
            <>
              <circle cx="50" cy="50" r="40" strokeDasharray={dash} style={{ fill: "none", stroke: "var(--line)", strokeWidth: 14, strokeLinecap: "round" }} />
              <circle cx="50" cy="50" r="40" strokeDasharray={dash} style={{ fill: "none", stroke: "var(--mint)", strokeWidth: 8, strokeLinecap: "round" }} />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ lineHeight: 1 }}>
          <span style={{ fontSize: k(28), fontWeight: 700, letterSpacing: "-.04em" }}>{goal.percent}%</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>
            {fmtMinutes(goal.minutes)} / {fmtMinutes(goal.goalMinutes)}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
        {left > 0 ? `${left} min to go by Sunday` : "Goal met this week"}
      </span>
    </Tile>
  );
}

// ── Projection ───────────────────────────────────────────────────────────────

export function ProjectionTile({
  level,
  pace,
  readiness,
  exam,
}: {
  level: string;
  pace: RoutePace | undefined;
  readiness: GoetheReadiness | undefined;
  exam: ExamStatus | undefined;
}) {
  const LVL = level.toUpperCase();
  const finish = pace?.projectedFinishDate ? new Date(`${pace.projectedFinishDate}T00:00:00`) : null;
  const late = pace?.weeksBehindPace && pace.weeksBehindPace > 0 ? pace.weeksBehindPace : null;
  const score = readiness?.avgRecentTestScore ?? null;
  const need = Math.round((exam?.passThreshold ?? 0.7) * 100);
  const examDate = exam?.examTargetDate ?? pace?.examTargetDate ?? null;
  const days = examDate ? Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null;
  return (
    <Tile
      bg="var(--orange)"
      tilt={1}
      className="flex flex-col justify-between"
      style={{ gridArea: "proj", padding: 16, gap: 8 }}
    >
      <Eyebrow>Projection</Eyebrow>
      <Starburst size={62} tilt={12} shadow={3} style={{ position: "absolute", top: -14, right: -10 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{LVL}</span>
      </Starburst>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: k(34), fontWeight: 700, letterSpacing: "-.05em" }}>
          {finish ? `${MONTHS[finish.getMonth()]} ${finish.getFullYear()}` : "—"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
          {finish ? `${LVL} done at this pace${late ? ` · ${late} wk after the exam` : ""}` : "Close a topic to see a pace"}
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: 5 }}>
        {/* the value stays short ("–" before any test) so the row fits the narrow sm tile on one line */}
        <div className="flex justify-between whitespace-nowrap" style={{ fontSize: 12, fontWeight: 700, gap: 6 }}>
          <span>{LVL} exam readiness</span>
          <span title={score === null ? "No self-tests or exams at this level yet" : undefined}>{score === null ? "–" : `${score}%`}</span>
        </div>
        <div style={{ height: 12, border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", overflow: "hidden", boxSizing: "border-box" }}>
          {score !== null && score > 0 && (
            <div style={{ width: `${score}%`, height: "100%", background: "var(--mint)", borderRight: "2px solid var(--line)" }} />
          )}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {days !== null && days >= 0 ? `Exam in ${days} days` : "No exam date"} · need {need}%
        </span>
      </div>
    </Tile>
  );
}

// ── Retention ────────────────────────────────────────────────────────────────

const RET_DAYS = [1, 7, 14, 30, 60];
const retY = (p: number) => 6 + ((100 - p) / 100) * 106;

/** Smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: { x: number; y: number }[]): string {
  let d = `M${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function RetentionTile({ points }: { points: { day: number; percent: number; samples: number }[] }) {
  const pts = points
    .filter((p) => RET_DAYS.includes(p.day))
    .map((p) => ({ ...p, x: RET_DAYS.indexOf(p.day) * 75, y: retY(p.percent) }));
  const headline = points.find((p) => p.day === 30) ?? points[points.length - 1];
  const line = pts.length >= 2 ? smooth(pts) : null;
  return (
    <Tile bg="var(--sky)" tilt={-0.4} className="flex flex-col" style={{ gridArea: "ret", padding: "18px 20px", gap: 8 }}>
      <div className="flex items-baseline justify-between" style={{ gap: 10 }}>
        <span style={title}>Retention</span>
        <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>
          {headline ? `${headline.percent}% recalled after ${headline.day} day${headline.day === 1 ? "" : "s"}` : "not enough reviews yet"}
        </span>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ background: "var(--plain)", border: "2.5px solid var(--line)", borderRadius: 16 }}
      >
        <div className="absolute" style={{ inset: "8px 10px 22px 10px" }}>
          <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <path
              d="M0 6 C 40 70, 90 100, 300 112"
              vectorEffect="non-scaling-stroke"
              style={{ fill: "none", stroke: "var(--plainText)", strokeWidth: 2.5, strokeDasharray: "6 6", opacity: 0.5 }}
            />
            {line && (
              <>
                <path d={`${line} L ${pts[pts.length - 1]!.x} 120 L ${pts[0]!.x} 120 Z`} style={{ fill: "var(--mint)", opacity: 0.55 }} />
                <path d={line} vectorEffect="non-scaling-stroke" style={{ fill: "none", stroke: "var(--line)", strokeWidth: 4 }} />
              </>
            )}
          </svg>
          {pts.map((p) => (
            <span
              key={p.day}
              title={`${p.percent}% after ~${p.day} days (${p.samples} reviews)`}
              className="absolute"
              style={{
                left: `${(p.x / 300) * 100}%`,
                top: `${(p.y / 120) * 100}%`,
                width: 10,
                height: 10,
                marginLeft: -5,
                marginTop: -5,
                borderRadius: "50%",
                background: "var(--mint)",
                border: "2.5px solid var(--line)",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>
        <div
          className="absolute flex justify-between"
          style={{ left: 10, right: 10, bottom: 4, fontSize: 11, fontWeight: 700, color: "var(--plainMuted)" }}
        >
          <span>day 1</span>
          <span>7</span>
          <span>14</span>
          <span>30</span>
          <span>60</span>
        </div>
      </div>
      <div className="flex flex-wrap" style={{ gap: 14, fontSize: 12, fontWeight: 700 }}>
        <span className="inline-flex items-center" style={{ gap: 6 }}>
          <span style={{ width: 22, height: 4, background: "var(--line)" }} />
          you
        </span>
        <span className="inline-flex items-center" style={{ gap: 6 }}>
          <span style={{ width: 22, height: 0, borderTop: "3px dashed var(--line)", opacity: 0.6 }} />
          forgetting curve
        </span>
      </div>
    </Tile>
  );
}

// ── Mastery by skill ─────────────────────────────────────────────────────────

type SkillRow = BentoDashboard["skillMastery"][number];

function skillTip(row: SkillRow, rows: SkillRow[], level: string): string {
  const name = SKILL_LABELS[row.skill];
  const LVL = level.toUpperCase();
  if (row.percent === null) return `No ${name.toLowerCase()} topics in ${LVL}.`;
  const withData = rows.filter((r) => r.percent !== null);
  const left = row.counted - row.passed;
  if (left === 0) return `Every ${LVL} ${name.toLowerCase()} topic passed.`;
  const top = withData.reduce((a, b) => (b.percent! > a.percent! ? b : a));
  const low = withData.reduce((a, b) => (b.percent! < a.percent! ? b : a));
  if (withData.length > 1 && row.skill === top.skill) return `${name} leads: ${row.passed} of ${row.counted} ${LVL} topics passed.`;
  if (withData.length > 1 && row.skill === low.skill) return `${name} is the gap: ${left} ${LVL} topic${left === 1 ? "" : "s"} still open.`;
  return `${row.passed} of ${row.counted} ${LVL} ${name.toLowerCase()} topics passed.`;
}

export function SkillsTile({ rows, level, bp }: { rows: SkillRow[]; level: string; bp: Breakpoint }) {
  const withData = rows.filter((r) => r.percent !== null);
  // the prototype opens on its weakest skill; so does this
  const weakest = withData.length ? withData.reduce((a, b) => (b.percent! < a.percent! ? b : a)).skill : rows[0]?.skill;
  const [picked, setPicked] = useState<SkillRow["skill"] | undefined>(undefined);
  const sel = rows.find((r) => r.skill === (picked ?? weakest));
  const isLg = bp === "lg";
  return (
    <Tile tilt={0.5} className="flex flex-col" style={{ gridArea: "skills", padding: "16px 20px", gap: 8 }}>
      <div className="flex shrink-0 items-baseline justify-between">
        <span style={title}>Mastery by skill</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--plainMuted)" }}>tap one</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-hidden" style={{ gap: isLg ? 3 : 6 }}>
        {rows.map((r) => {
          const on = r.skill === sel?.skill;
          return (
            <button
              key={r.skill}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(r.skill)}
              className="flex cursor-pointer items-center text-left"
              style={{
                gap: 10,
                padding: isLg ? "2px 8px" : "4px 8px",
                margin: "0 -8px",
                borderRadius: 10,
                border: "none",
                background: on ? "var(--plain2)" : "transparent",
                outline: on ? "2px solid var(--line)" : "none",
                color: "inherit",
              }}
            >
              <span style={{ width: 78, flexShrink: 0, fontSize: 13, fontWeight: 700 }}>{SKILL_LABELS[r.skill]}</span>
              <div
                style={{
                  flex: 1,
                  height: isLg ? 11 : 14,
                  border: "2px solid var(--line)",
                  borderRadius: 999,
                  background: "var(--plain2)",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                {!!r.percent && (
                  <div style={{ width: `${r.percent}%`, height: "100%", background: SKILL_COLORS[r.skill], borderRight: "2px solid var(--line)" }} />
                )}
              </div>
              <span style={{ width: 38, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{r.percent === null ? "–" : `${r.percent}%`}</span>
            </button>
          );
        })}
      </div>
      {sel && (
        <div
          className="flex shrink-0 items-center"
          style={{
            gap: 8,
            padding: "6px 10px",
            border: "2px solid var(--line)",
            borderRadius: 12,
            background: "var(--plain2)",
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.25,
          }}
        >
          <Sparkle size={15} weight="fill" className="shrink-0" aria-hidden="true" />
          <span>{skillTip(sel, rows, level)}</span>
        </div>
      )}
    </Tile>
  );
}

// ── Articles ─────────────────────────────────────────────────────────────────

const ART_COLORS = { der: "var(--sky)", die: "var(--plain)", das: "var(--mint)" } as const;

export function ArticlesTile({ articles }: { articles: ArticleAccuracy | undefined }) {
  const rows = (["der", "die", "das"] as const).map((a) => ({ l: a, v: articles?.byArticle[a]?.percent ?? null }));
  const any = rows.some((r) => r.v !== null);
  return (
    <Tile bg="var(--pink)" tilt={-1} className="flex flex-col" style={{ gridArea: "art", padding: 16, gap: 10 }}>
      <Eyebrow>Articles</Eyebrow>
      <div className="flex min-h-0 flex-1 items-end" style={{ gap: 8 }}>
        {rows.map((r) => (
          <div key={r.l} className="flex h-full flex-1 flex-col items-center justify-end" style={{ gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.v === null ? "–" : `${r.v}%`}</span>
            <div
              style={{
                width: "100%",
                height: `calc(${r.v ?? 0}% - 44px)`,
                minHeight: 20,
                background: r.v === null ? "transparent" : ART_COLORS[r.l],
                border: "2.5px solid var(--line)",
                borderStyle: r.v === null ? "dashed" : "solid",
                borderRadius: "10px 10px 4px 4px",
                boxSizing: "border-box",
              }}
            />
            <span lang="de" style={{ fontSize: 14, fontWeight: 700 }}>
              {r.l}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>
        {!any ? "No gender drills yet" : articles?.mostMissed ? `${articles.mostMissed} trips you up most` : "No article stands out"}
      </span>
    </Tile>
  );
}

// ── Streak heatmap ───────────────────────────────────────────────────────────

const HC = [
  "var(--h0)",
  "color-mix(in oklch, var(--mint) 40%, var(--h0))",
  "color-mix(in oklch, var(--mint) 70%, var(--h0))",
  "var(--mint)",
  "var(--lemon)",
];

export function HeatTile({
  calendar,
  streak,
  best,
  bp,
}: {
  calendar: BentoDashboard["streakCalendar"];
  streak: number;
  best: number;
  bp: Breakpoint;
}) {
  const [day, setDay] = useState<{ date: string; lernzeit: number } | null>(null);
  const weeks = bp === "sm" ? 16 : 26;
  const cell = bp === "lg" ? 16 : bp === "md" ? 20 : 14;
  const days = calendar.slice(-weeks * 7);
  const todayKey = localDateKey();
  const first = days[0] ? new Date(`${days[0].date}T00:00:00`) : null;
  const fmtDay = (key: string) => {
    const d = new Date(`${key}T00:00:00`);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };
  return (
    <Tile tilt={-0.3} className="flex flex-col" style={{ gridArea: "heat", padding: "18px 20px", gap: 10 }}>
      <div className="flex flex-wrap items-baseline justify-between" style={{ gap: 10 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Fire size={20} weight="fill" aria-hidden="true" />
          <span style={title}>{streak}-day streak</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--plainMuted)" }}>
          {day ? `${fmtDay(day.date)} · ${day.lernzeit ? `${day.lernzeit} min` : "rest day"}` : `best: ${best} days`}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          role="img"
          aria-label={`Study activity, last ${weeks} weeks`}
          style={{ display: "grid", gridTemplateRows: `repeat(7,${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap: 3 }}
        >
          {days.map((d) => {
            const lvl = heatLevel(d);
            const isToday = d.date === todayKey;
            return (
              <span
                key={d.date}
                title={d.future ? undefined : `${fmtDay(d.date)} · ${d.lernzeit} min`}
                onClick={d.future ? undefined : () => setDay(d)}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 5,
                  boxSizing: "border-box",
                  background: d.future ? "transparent" : HC[lvl],
                  border: d.future ? "2px dashed var(--plain2)" : isToday ? "2.5px solid var(--line)" : lvl ? "2px solid var(--line)" : "none",
                  cursor: d.future ? "default" : "pointer",
                  transform: isToday ? "rotate(-10deg) scale(1.1)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ fontSize: 11, fontWeight: 700, color: "var(--plainMuted)" }}>
        <span>{first ? first.toLocaleDateString("en", { month: "long" }) : ""}</span>
        <span className="inline-flex items-center" style={{ gap: 4 }}>
          less
          {HC.map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: "1.5px solid var(--line)", boxSizing: "border-box" }} />
          ))}
          more
        </span>
        <span>today</span>
      </div>
    </Tile>
  );
}

// ── Shakiest words ───────────────────────────────────────────────────────────

export function ShakyTile({
  weak,
  wordsById,
  bp,
  onDrill,
}: {
  weak: WeakWord[];
  wordsById: Map<string, Word>;
  bp: Breakpoint;
  onDrill: () => void;
}) {
  // lg 4 and md 6 as in the prototype; sm stacks one column, where only 5 fit the 330px row
  const list = weak.slice(0, bp === "lg" ? 4 : bp === "md" ? 6 : 5);
  return (
    <Tile bg="var(--tomato)" tilt={0.6} className="flex flex-col" style={{ gridArea: "shaky", padding: "16px 18px", gap: 10 }}>
      <div className="flex items-baseline justify-between">
        <span style={title}>Shakiest words</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>missed ×</span>
      </div>
      {list.length === 0 ? (
        <div
          className="flex min-h-0 flex-1 items-center justify-center text-center"
          style={{ border: "2.5px dashed var(--line)", borderRadius: 14, fontSize: 14, fontWeight: 700, padding: 12 }}
        >
          Nothing shaky right now.
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1 content-start overflow-hidden"
          style={{ gridTemplateColumns: bp === "sm" ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 6 }}
        >
          {list.map((w) => {
            const word = wordsById.get(w.wordId);
            return (
              <div
                key={w.wordId}
                className="flex min-w-0 items-center"
                style={{ gap: 8, padding: "6px 10px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)" }}
              >
                {word && (
                  <span
                    lang="de"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 999,
                      border: "2px solid var(--line)",
                      background: wordColor(word),
                      color: "var(--onTile)",
                      flexShrink: 0,
                    }}
                  >
                    {articleLabel(word)}
                  </span>
                )}
                <span
                  lang="de"
                  className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontSize: 14, fontWeight: 700 }}
                >
                  {w.headword}
                </span>
                {/* shaky by flag alone (never missed) has no count to show */}
                {w.hardCount > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>{w.hardCount}×</span>}
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onDrill}
        className="press flex shrink-0 cursor-pointer items-center justify-center"
        style={{
          height: 44,
          gap: 8,
          border: "2.5px solid var(--line)",
          borderRadius: 999,
          background: "var(--btn)",
          color: "var(--btnText)",
          fontWeight: 700,
          fontSize: 15,
          boxShadow: "3px 3px 0 var(--shadow)",
        }}
      >
        <Lightning size={16} weight="fill" aria-hidden="true" />
        Drill the shaky ones
      </button>
    </Tile>
  );
}

// ── Bewerbungen funnel ───────────────────────────────────────────────────────

export function JobsTile({ stats, interview }: { stats: ApplicationStats | undefined; interview: BentoDashboard["nextInterview"] }) {
  const f = stats?.funnel;
  const cells: { n: number; l: string; bg: string; dashed?: boolean; plain?: boolean }[] = [
    { n: f?.sent ?? 0, l: "sent", bg: "var(--plain)", plain: true },
    { n: f?.replies ?? 0, l: "replies", bg: "var(--plain)", plain: true },
    { n: f?.interviews ?? 0, l: "interviews", bg: "var(--lemon)" },
    { n: stats?.offers ?? 0, l: "offers", bg: "transparent", dashed: true },
  ];
  let line: ReactNode = "No interview booked";
  if (interview) {
    const d = new Date(interview.at);
    line = `Interview ${d.toLocaleDateString("en", { weekday: "short" })} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${interview.company}`;
  } else if (!stats || stats.total === 0) line = "No applications yet";
  return (
    <Tile bg="var(--mint)" tilt={-0.8} className="flex flex-col" style={{ gridArea: "jobs", padding: 16, gap: 8 }}>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Briefcase size={16} weight="fill" aria-hidden="true" />
        <Eyebrow>Bewerbungen</Eyebrow>
      </div>
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        {cells.map((c) => (
          <div
            key={c.l}
            className="flex min-h-0 flex-col justify-center"
            style={{
              gap: 2,
              padding: "6px 8px",
              border: `2px ${c.dashed ? "dashed" : "solid"} var(--line)`,
              borderRadius: 12,
              background: c.bg,
              color: c.plain ? "var(--plainText)" : "var(--onTile)",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: k(22), fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{c.n}</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{c.l}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{line}</span>
    </Tile>
  );
}

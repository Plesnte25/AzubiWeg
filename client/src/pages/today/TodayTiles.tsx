import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  Briefcase,
  Cards,
  Check,
  Fire,
  Lightning,
  LockSimple,
  Plus,
  Target,
  Timer,
} from "@phosphor-icons/react";
import type { BentoDashboard, CefrLevel } from "../../api/types";
import { Checkbox } from "../../components/ui/Checkbox";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillButton } from "../../components/ui/PillButton";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { RoundSticker, Starburst } from "../../components/ui/Sticker";
import { Tile } from "../../components/ui/Tile";
import { clock, daysUntil, shortDate } from "../../lib/tasks";
import { heatLevel } from "../../lib/heat";
import type { Breakpoint } from "../../lib/useBreakpoint";

/*
 * Today tiles — literal values from AzubiDashSticker2.dc.html (variant a). Where the prototype and the README
 * disagree on a tile colour (streak pink, Lernzeit tomato, jobs orange in the prototype), the prototype wins
 * (CLAUDE.md: extract from the .dc.html).
 */

const pad = (px: number) => `calc(var(--k) * ${px}px)`;

/** Tile eyebrow with an optional icon: 13px/700, uppercase, .08em. */
function Label({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
      {icon}
      {children}
    </span>
  );
}

/** The dark pill CTA used inside tiles (Los geht's / 5-min drill): space-between, arrow/icon on the right. */
function TileCta({ children, icon, onClick, small = false, disabled }: { children: ReactNode; icon: ReactNode; onClick: () => void; small?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press flex cursor-pointer items-center justify-between disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: "var(--btn)",
        color: "var(--btnText)",
        border: "2.5px solid var(--line)",
        borderRadius: 999,
        padding: small ? "9px 15px" : "10px 16px",
        fontWeight: 700,
        fontSize: small ? 14 : 15,
        boxShadow: "3px 3px 0 var(--shadow)",
      }}
    >
      {children}
      {icon}
    </button>
  );
}

const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

// ── Hero ────────────────────────────────────────────────────────────────────

export function HeroTile({
  firstName,
  dayLabel,
  heroLine,
  level,
  totalWords,
  bp,
}: {
  firstName: string;
  dayLabel: string | null;
  heroLine: string;
  level: BentoDashboard["level"];
  totalWords: number;
  bp: Breakpoint;
}) {
  const idx = LEVELS.indexOf(level.level);
  const prev = idx > 0 ? LEVELS[idx - 1] : null;
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  return (
    <Tile
      bg="var(--lemon)"
      tilt={-0.8}
      radius={26}
      shadow={6}
      lift
      tape={{ left: "18%", width: 96, height: 26, tilt: -5, style: { top: -13 } }}
      className="flex flex-col justify-between gap-3.5"
      style={{ gridArea: "hero", padding: pad(28) }}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em" }}>
          {shortDate(new Date())}
        </span>
        {dayLabel && (
          <span
            className="whitespace-nowrap"
            style={{ fontSize: 13, fontWeight: 700, background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 999, padding: "4px 11px" }}
          >
            {dayLabel}
          </span>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: pad(12) }}>
        <h1 style={{ margin: 0, fontSize: pad(88), fontWeight: 700, lineHeight: 0.9, letterSpacing: "-.045em" }}>
          Moin,
          <br />
          {firstName}!
        </h1>
        <p style={{ margin: 0, fontSize: pad(19), fontWeight: 500, lineHeight: 1.35, maxWidth: "26ch", textWrap: "pretty" }}>{heroLine}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between" style={{ fontSize: 14, fontWeight: 700 }}>
          <span>
            {level.level.toUpperCase()} · {level.percent}%
          </span>
          <span style={{ fontWeight: 500 }}>
            {level.closedStations}/{level.totalStations} stations · {totalWords.toLocaleString("en")} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          {prev && (
            <span
              className="inline-flex items-center gap-1"
              style={{ height: 34, padding: "0 12px", borderRadius: 999, background: "var(--mint)", border: "2.5px solid var(--line)", fontWeight: 700, fontSize: 14, boxSizing: "border-box" }}
            >
              <Check size={14} weight="bold" aria-hidden="true" />
              {prev.toUpperCase()}
            </span>
          )}
          <div
            role="progressbar"
            aria-label={`${level.level.toUpperCase()} progress`}
            aria-valuenow={level.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative flex-1 overflow-hidden"
            style={{ height: 34, borderRadius: 999, background: "var(--plain)", border: "2.5px solid var(--line)", boxSizing: "border-box" }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${level.percent}%`,
                background: "var(--tomato)",
                borderRight: level.percent > 0 && level.percent < 100 ? "2.5px solid var(--line)" : "none",
                backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 8px, rgba(27,27,31,.12) 8px 14px)",
                transition: "width .3s",
              }}
            />
          </div>
          {next && (
            <span
              className="inline-flex items-center gap-1"
              style={{ height: 34, padding: "0 12px", borderRadius: 999, background: "var(--plain2)", color: "var(--plainText)", border: "2.5px dashed var(--line)", fontWeight: 700, fontSize: 14, boxSizing: "border-box" }}
            >
              <LockSimple size={14} weight="fill" aria-hidden="true" />
              {next.toUpperCase()}
            </span>
          )}
        </div>
      </div>
      {bp === "lg" && (
        <div
          aria-hidden="true"
          className="absolute flex flex-col items-center justify-center text-center"
          style={{ right: 34, top: 70, width: 118, height: 118, borderRadius: "50%", background: "var(--pink)", border: "2.5px solid var(--line)", boxShadow: "4px 4px 0 var(--shadow)", transform: "rotate(12deg)", lineHeight: 1 }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>WEITER</span>
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em" }}>so!</span>
        </div>
      )}
    </Tile>
  );
}

// ── Today's route ───────────────────────────────────────────────────────────

export interface RouteRow {
  id: string;
  title: string;
  meta: string;
  color: string;
  done: boolean;
  /** Review is a destination, not a checkable task. */
  review?: boolean;
}

export function RouteTile({
  rows,
  optionalCount,
  carriedOver,
  onToggle,
  onOpen,
  onAdd,
  onPullIn,
  onSpread,
  inactive,
}: {
  rows: RouteRow[];
  optionalCount: number;
  carriedOver: number;
  onToggle: (row: RouteRow) => void;
  onOpen: (row: RouteRow) => void;
  onAdd: () => void;
  onPullIn: () => void;
  onSpread: () => void;
  /** Roadmap not activated yet: the tile offers to start it instead. */
  inactive?: ReactNode;
}) {
  const done = rows.filter((r) => r.done).length;
  const open = rows.filter((r) => !r.done);
  const minutesLeft = open.reduce((sum, r) => sum + Number(r.meta.match(/(\d+) min/)?.[1] ?? 0), 0);
  return (
    <Tile tilt={0.5} radius={22} tape={{ left: 30, width: 70, tilt: -3 }} className="flex flex-col gap-3" style={{ gridArea: "plan", padding: pad(20) }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em" }}>Today's route</span>
        <div className="flex items-center gap-1.5">
          {!inactive && (
            <span style={{ fontSize: 13, fontWeight: 700, background: "var(--mint)", color: "var(--onTile)", border: "2px solid var(--line)", borderRadius: 999, padding: "2px 9px" }}>
              {done} / {rows.length}
            </span>
          )}
          {!inactive && (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add task"
              className="press flex cursor-pointer items-center justify-center p-0"
              style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--line)", background: "var(--lemon)", color: "var(--onTile)", boxShadow: "2px 2px 0 var(--shadow)" }}
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {inactive ?? (
        <>
          <div className="flex flex-col gap-1.5">
            <ProgressBar value={rows.length ? done / rows.length : 0} height={12} track="var(--plain2)" label="Route progress" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>
              {open.length ? `${open.length} stops · ${minutesLeft} min left` : "Route cleared — schönen Feierabend!"}
            </span>
          </div>
          {carriedOver > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-2"
              style={{ border: "2px dashed var(--line)", borderRadius: 14, padding: "6px 8px 6px 12px", fontSize: 13, fontWeight: 700 }}
            >
              <span>carried over · {carriedOver}</span>
              <span className="flex gap-1.5">
                <PillButton variant="secondary" height={30} onClick={onPullIn} style={{ fontSize: 13, padding: "0 11px", borderWidth: 2 }}>
                  Pull in
                </PillButton>
                <PillButton variant="secondary" height={30} onClick={onSpread} style={{ fontSize: 13, padding: "0 11px", borderWidth: 2 }}>
                  Spread
                </PillButton>
              </span>
            </div>
          )}
          <div className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-[7px] overflow-y-auto px-1 py-0.5">
            {rows.length === 0 && <EmptyState>Nothing planned today. Add a task with +.</EmptyState>}
            {rows.map((row) => (
              <div
                key={row.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(row);
                  }
                }}
                className="flex shrink-0 cursor-pointer items-center gap-2.5 hover:bg-plain2"
                style={{ padding: "8px 10px", borderRadius: 14, border: "2px solid var(--dash)", transition: "background .15s" }}
              >
                {row.review ? (
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center justify-center"
                    style={{ width: 24, height: 24, borderRadius: 8, border: "2.5px solid var(--line)", background: "var(--tomato)", color: "var(--onTile)", boxSizing: "border-box" }}
                  >
                    <ArrowRight size={13} weight="bold" />
                  </span>
                ) : (
                  <Checkbox checked={row.done} onChange={() => onToggle(row)} label={`${row.title} done`} tiltWhenChecked />
                )}
                <div className="min-w-0 flex-1" style={{ textDecoration: row.done ? "line-through" : "none", opacity: row.done ? 0.5 : 1 }}>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }} lang="de">
                    {row.title}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--plainMuted)" }}>{row.meta}</div>
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ width: 10, height: 10, borderRadius: 3, background: row.color, border: "2px solid var(--line)", opacity: row.done ? 0.35 : 1 }}
                />
              </div>
            ))}
            {optionalCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)", padding: "2px 4px" }}>+{optionalCount} optional in Plan</span>
            )}
          </div>
        </>
      )}
    </Tile>
  );
}

// ── Review ──────────────────────────────────────────────────────────────────

export function ReviewTile({ due, minutes, onGo, onBrowse }: { due: number; minutes: number; onGo: () => void; onBrowse: () => void }) {
  return (
    <Tile bg="var(--tomato)" tilt={1.4} radius={22} lift={8} className="flex flex-col justify-between gap-2" style={{ gridArea: "review", padding: pad(20) }}>
      {due > 0 && (
        <RoundSticker size={58} tilt={14} bg="var(--lemon)" style={{ position: "absolute", top: -16, right: -12, fontSize: 12 }}>
          fällig!
        </RoundSticker>
      )}
      <Label icon={<Cards size={17} weight="fill" aria-hidden="true" />}>Review</Label>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span style={{ fontSize: pad(96), fontWeight: 700, lineHeight: 0.82, letterSpacing: "-.06em" }}>{due}</span>
        <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
          {due > 0 ? (
            <>
              cards due
              <br />~{minutes} min
            </>
          ) : (
            <>
              nothing due
              <br />
              come back tomorrow
            </>
          )}
        </span>
      </div>
      {due > 0 ? (
        <TileCta onClick={onGo} icon={<ArrowRight size={17} weight="bold" aria-hidden="true" />}>
          Los geht's
        </TileCta>
      ) : (
        <TileCta onClick={onBrowse} icon={<ArrowRight size={17} weight="bold" aria-hidden="true" />}>
          Browse words
        </TileCta>
      )}
    </Tile>
  );
}

// ── Weekly goal ─────────────────────────────────────────────────────────────

const RING_C = 2 * Math.PI * 46; // r 46 → 289

export function GoalTile({ goal }: { goal: BentoDashboard["weeklyGoal"] }) {
  const dash = (goal.percent / 100) * RING_C;
  return (
    <Tile bg="var(--sky)" tilt={-1.8} radius={22} lift={8} className="flex flex-col justify-between gap-2" style={{ gridArea: "goal", padding: pad(18) }}>
      <div className="flex items-center justify-between gap-1.5">
        <Label>Weekly goal</Label>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{goal.percent}%</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative" style={{ width: pad(120), height: pad(120) }}>
          <svg viewBox="0 0 120 120" className="size-full" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
            <circle cx="60" cy="60" r="46" fill="var(--plain)" stroke="var(--line)" strokeWidth="2.5" />
            {dash > 0 && (
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${dash} ${RING_C}`} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ lineHeight: 1, color: "var(--plainText)" }}>
            <span style={{ fontSize: pad(30), fontWeight: 700, letterSpacing: "-.04em" }}>{goal.minutes}</span>
            <span style={{ fontSize: pad(12), fontWeight: 600 }}>/ {goal.goalMinutes} min</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-[3px]">
        {goal.days.map((d) => {
          const studied = d.status === "past" && d.minutes > 0;
          const letter = new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "narrow" });
          return (
            <span
              key={d.date}
              title={`${d.date}: ${d.minutes} min`}
              className="flex items-center justify-center"
              style={{
                width: pad(24),
                height: pad(24),
                borderRadius: "50%",
                border: `2px ${d.status === "future" ? "dashed" : "solid"} var(--line)`,
                boxSizing: "border-box",
                fontSize: pad(11),
                fontWeight: 700,
                background: studied ? "var(--line)" : d.status === "today" ? "var(--lemon)" : "transparent",
                color: studied ? "var(--sky)" : "var(--onTile)",
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </Tile>
  );
}

// ── Weak spot ───────────────────────────────────────────────────────────────

export function WeakTile({ spot, onDrill }: { spot: BentoDashboard["weakSpot"]; onDrill: () => void }) {
  return (
    <Tile bg="var(--lilac)" tilt={0.9} radius={22} lift={8} className="flex flex-col justify-between gap-2.5" style={{ gridArea: "weak", padding: pad(20) }}>
      <Label icon={<Target size={17} weight="fill" aria-hidden="true" />}>Weak spot</Label>
      {spot ? (
        <>
          <div style={{ fontSize: pad(26), fontWeight: 700, lineHeight: 1, letterSpacing: "-.03em", hyphens: "auto", overflowWrap: "anywhere" }}>{spot.label}</div>
          {spot.source === "self_test" ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar value={spot.percent / 100} height={14} fill="var(--tomato)" label={`${spot.label} accuracy`} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{spot.percent}%</span>
            </div>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {spot.count} mistake{spot.count === 1 ? "" : "s"} in the last 30 days
            </span>
          )}
          <TileCta small onClick={onDrill} icon={<Lightning size={16} weight="fill" aria-hidden="true" />}>
            5-min drill
          </TileCta>
        </>
      ) : (
        <EmptyState action={<TileCta small onClick={onDrill} icon={<Lightning size={16} weight="fill" aria-hidden="true" />}>Take a self-test</TileCta>}>
          No weak spot yet — a self-test finds one.
        </EmptyState>
      )}
    </Tile>
  );
}

// ── Wortschatz ──────────────────────────────────────────────────────────────

export function WordsTile({ words, onOpen }: { words: BentoDashboard["words"]; onOpen: () => void }) {
  return (
    <Tile
      as="button"
      type="button"
      onClick={onOpen}
      aria-label={`Wortschatz: ${words.total} words, ${words.shaky} shaky`}
      bg="var(--mint)"
      tilt={-1.3}
      radius={22}
      lift={8}
      className="flex cursor-pointer flex-col justify-between gap-2 text-left"
      style={{ gridArea: "words", padding: pad(20), font: "inherit" }}
    >
      {/* sits above the label row: on a 360px phone the tile is only as wide as "WORTSCHATZ", so a lower sticker covered it */}
      {words.newThisWeek > 0 && (
        <Starburst size={56} tilt={10} shadow={3} style={{ position: "absolute", top: -30, right: -12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>+{words.newThisWeek}</span>
        </Starburst>
      )}
      <Label>Wortschatz</Label>
      <div>
        <div style={{ fontSize: pad(60), fontWeight: 700, lineHeight: 0.9, letterSpacing: "-.05em" }}>{words.total.toLocaleString("en")}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>words · {words.shaky} shaky</div>
      </div>
    </Tile>
  );
}

// ── Streak ──────────────────────────────────────────────────────────────────

const CELL = ["rgba(27,27,31,.10)", "rgba(27,27,31,.28)", "rgba(27,27,31,.5)", "rgba(27,27,31,.74)", "#1B1B1F"];

export function StreakTile({ streak, best, calendar, bp }: { streak: number; best: number; calendar: BentoDashboard["streakCalendar"]; bp: Breakpoint }) {
  const weeks = bp === "lg" ? 22 : bp === "md" ? 32 : 17;
  const days = calendar.slice(-weeks * 7);
  const todayKey = days.find((d, i) => !d.future && (days[i + 1]?.future ?? true))?.date;
  return (
    <Tile bg="var(--pink)" tilt={-0.5} radius={22} className="flex flex-col gap-3" style={{ gridArea: "streak", padding: pad(20) }}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center"
            style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tomato)", border: "2.5px solid var(--line)", transform: "rotate(-8deg)", boxSizing: "border-box" }}
          >
            <Fire size={18} weight="fill" aria-hidden="true" />
          </span>
          <span style={{ fontSize: pad(24), fontWeight: 700, letterSpacing: "-.03em" }}>{streak}-day streak</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Best {best}</span>
      </div>
      <div
        role="img"
        aria-label={`Study activity, last ${weeks} weeks`}
        className="min-h-0 flex-1"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${weeks},minmax(0,1fr))`,
          gridTemplateRows: "repeat(7,minmax(0,1fr))",
          gridAutoFlow: "column",
          gap: bp === "sm" ? 3 : 4,
        }}
      >
        {days.map((d) => {
          const style: CSSProperties = {
            background: d.future ? "transparent" : CELL[heatLevel(d)],
            border: d.future ? "1.5px dashed rgba(27,27,31,.3)" : "none",
            borderRadius: bp === "sm" ? 3 : 4,
            minHeight: 0,
            boxSizing: "border-box",
            outline: d.date === todayKey ? "2.5px solid var(--line)" : "none",
            outlineOffset: 1,
          };
          return <span key={d.date} title={d.future ? undefined : `${d.date}: ${d.lernzeit} min`} style={style} />;
        })}
      </div>
    </Tile>
  );
}

// ── Lernzeit (the app-wide task timer) ─────────────────────────────────────

export interface TimerTarget {
  id: string;
  title: string;
  seconds: number;
  runningSince: string | null;
}

export function TimerTile({
  lernzeitToday,
  target,
  sessions,
  showSessions,
  onToggle,
  onReset,
  busy,
}: {
  lernzeitToday: number;
  target: TimerTarget | null;
  sessions: { id: string; title: string; minutes: number; color: string }[];
  showSessions: boolean;
  onToggle: () => void;
  onReset: () => void;
  busy: boolean;
}) {
  const running = !!target?.runningSince;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [running]);
  const seconds = target ? target.seconds + (target.runningSince ? Math.max(0, Math.floor((now - new Date(target.runningSince).getTime()) / 1000)) : 0) : 0;

  return (
    <Tile bg="var(--tomato)" tilt={-1.4} radius={22} className="flex flex-col justify-between gap-2" style={{ gridArea: "timer", padding: pad(20) }}>
      <div className="flex items-center justify-between">
        <Label icon={<Timer size={17} weight="fill" aria-hidden="true" />}>Lernzeit</Label>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{lernzeitToday} min today</span>
      </div>
      <span role="timer" aria-live="off" style={{ fontSize: pad(64), fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.9, fontVariantNumeric: "tabular-nums" }}>
        {clock(seconds)}
      </span>
      <span className="truncate" style={{ fontSize: 13, fontWeight: 600 }} lang="de">
        {target ? (running ? `On: ${target.title}` : `Next: ${target.title}`) : "No open task today"}
      </span>
      {showSessions && sessions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>
            Today's sessions
          </span>
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2.5"
              style={{ padding: "7px 10px", background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 12 }}
            >
              <span aria-hidden="true" className="shrink-0" style={{ width: 10, height: 10, borderRadius: 3, background: s.color, border: "2px solid var(--line)" }} />
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13, fontWeight: 700 }} lang="de">
                {s.title}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>{s.minutes} min</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={!target || busy}
          className="press flex flex-1 cursor-pointer items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ height: 40, background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 14, boxShadow: "3px 3px 0 var(--shadow)" }}
        >
          {running ? "Pause" : target && target.seconds > 0 ? "Resume" : "Start"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!target || seconds === 0 || busy}
          aria-label="Reset this task's timer"
          className="flex cursor-pointer items-center justify-center p-0 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ width: 40, height: 40, background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: "50%" }}
        >
          <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </Tile>
  );
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export function JobsTile({
  applications,
  nextInterview,
  onOpen,
}: {
  applications: Record<string, number>;
  nextInterview: BentoDashboard["nextInterview"];
  onOpen: () => void;
}) {
  const waiting = applications.applied ?? 0;
  const interview = applications.interview ?? 0;
  const offer = applications.offer ?? 0;
  const sent = waiting + interview + offer + (applications.rejected ?? 0);
  const active = waiting + interview + offer;
  const seg = (n: number) => (active === 0 ? 0 : (n / active) * 100);
  const when = nextInterview ? new Date(nextInterview.at) : null;
  const inDays = when ? daysUntil(when) : null;
  return (
    <Tile
      as="button"
      type="button"
      onClick={onOpen}
      bg="var(--orange)"
      tilt={1.2}
      radius={22}
      lift={8}
      className="flex cursor-pointer flex-col justify-between gap-2.5 text-left"
      style={{ gridArea: "jobs", padding: pad(20), font: "inherit" }}
    >
      <div className="flex items-center justify-between">
        <Label icon={<Briefcase size={17} weight="fill" aria-hidden="true" />}>Jobs</Label>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{sent} applied</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex overflow-hidden" style={{ height: 20, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)" }}>
          {active > 0 && (
            <>
              <div style={{ width: `${seg(waiting)}%`, background: "var(--plain)", borderRight: interview + offer > 0 ? "2.5px solid var(--line)" : "none" }} />
              <div style={{ width: `${seg(interview)}%`, background: "var(--lemon)", borderRight: offer > 0 && interview > 0 ? "2.5px solid var(--line)" : "none" }} />
              <div style={{ width: `${seg(offer)}%`, background: "var(--mint)" }} />
            </>
          )}
        </div>
        <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600 }}>
          <span>{waiting} waiting</span>
          <span>{interview} interview</span>
          <span>{offer} offer</span>
        </div>
      </div>
      <div
        className="flex flex-col gap-[3px]"
        style={{
          background: nextInterview ? "var(--plain)" : "transparent",
          color: nextInterview ? "var(--plainText)" : "var(--onTile)",
          border: `2.5px ${nextInterview ? "solid" : "dashed"} var(--line)`,
          borderRadius: 16,
          padding: "10px 12px",
          transform: "rotate(-1.5deg)",
        }}
      >
        {nextInterview && when ? (
          <>
            <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--plainMuted)" }}>
              Next interview · {inDays === 0 ? "today" : inDays === 1 ? "tomorrow" : `in ${inDays} days`}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere" }} lang="de">
              {nextInterview.company} — {nextInterview.role}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {shortDate(when)} · {when.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600 }}>No interview scheduled yet.</span>
        )}
      </div>
    </Tile>
  );
}

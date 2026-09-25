import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, Check, FlagPennant, HandTap, HourglassMedium } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CapacityUpdate, NewWordsPerDay, RoadmapStatus } from "../../api/types";
import { Tape, Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { invalidateHub } from "../../lib/queryHelpers";
import { localDateKey } from "../../lib/tasks";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { CvShelf } from "./CvShelf";
import { ObsidianTile } from "./ObsidianTile";
import { Kicker } from "./Kicker";
import { chip, fmtDay, k, label } from "./ui";

/*
 * Settings (handoff addendum §1, AzubiSettings.dc.html). lg: a no-scroll 3 × 2 grid (Capacity · Exam · Obsidian /
 * Reset · CV shelf); md two columns and sm one, both scrolling. Every change saves to the account straight away.
 * Honest deviations: the exam's name/location and the "Next sessions" Goethe dates have no data source, so the
 * sub-line shows the level being worked on and the session chips are left out; readiness uses the plan's real hours
 * left in that level (GET /learning/pace `hoursLeft`).
 */

type Capacity = { mins: number; days: boolean[]; newW: NewWordsPerDay };

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const PRESETS = [20, 30, 45, 60, 90];
const NEW_WORDS: NewWordsPerDay[] = [5, 10, 15, 20];
const clampMins = (m: number) => Math.max(10, Math.min(180, m));

/** Local capacity state that saves itself (debounced, so stepping 45 → 60 is one request). */
function useCapacity(status: RoadmapStatus | undefined) {
  const queryClient = useQueryClient();
  const [cap, setCap] = useState<Capacity | null>(null);
  useEffect(() => {
    if (status && !cap) setCap({ mins: status.studyCapacityMinutes, days: status.studyDays, newW: status.newWordsPerDay });
  }, [status, cap]);

  const pending = useRef<CapacityUpdate>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useMutation({
    mutationFn: api.updateStudyCapacity,
    onSuccess: (d) => {
      queryClient.setQueryData<RoadmapStatus>(["roadmap", "status"], (s) => (s ? { ...s, ...d } : s));
      invalidateHub(queryClient);
    },
    onError: () => {
      toast.error("Couldn't save that");
      setCap(null);
      void queryClient.invalidateQueries({ queryKey: ["roadmap", "status"] });
    },
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (next: Capacity, change: CapacityUpdate) => {
    setCap(next);
    pending.current = { ...pending.current, ...change };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save.mutate(pending.current);
      pending.current = {};
    }, 450);
  };
  return {
    cap,
    setMins: (m: number) => cap && update({ ...cap, mins: clampMins(m) }, { minutes: clampMins(m) }),
    toggleDay: (i: number) => {
      if (!cap) return;
      const days = cap.days.map((d, j) => (j === i ? !d : d));
      update({ ...cap, days }, { studyDays: days });
    },
    setNewW: (n: NewWordsPerDay) => cap && update({ ...cap, newW: n }, { newWordsPerDay: n }),
  };
}

function weekLabel(mins: number, days: number): string {
  if (!days) return "No study days";
  const wk = mins * days;
  return `${Math.floor(wk / 60)} h${wk % 60 ? ` ${wk % 60} min` : ""} a week`;
}

const tileBox = (bp: Breakpoint): CSSProperties => ({ padding: bp === "sm" ? 16 : 20, gap: bp === "lg" ? 12 : 14 });

// ── capacity ─────────────────────────────────────────────────────────────────

function CapacityTile({ bp, c, style }: { bp: Breakpoint; c: ReturnType<typeof useCapacity>; style: CSSProperties }) {
  const cap = c.cap;
  const nDays = cap?.days.filter(Boolean).length ?? 0;
  const round = (primary: boolean): CSSProperties => ({
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "2.5px solid var(--line)",
    background: primary ? "var(--btn)" : "var(--plain)",
    color: primary ? "var(--btnText)" : "var(--plainText)",
    fontSize: 24,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "3px 3px 0 var(--shadow)",
    padding: 0,
    flexShrink: 0,
  });
  const dz = bp === "sm" ? 38 : 42;
  return (
    <Tile bg="var(--lemon)" tilt={-0.5} className="flex flex-col" style={{ ...tileBox(bp), ...style }}>
      <Tape left={36} width={84} />
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <Kicker icon={<HourglassMedium size={16} weight="fill" aria-hidden="true" />}>Capacity</Kicker>
        <span style={{ padding: "4px 11px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontSize: 13, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(2deg)" }}>
          {cap ? weekLabel(cap.mins, nDays) : "…"}
        </span>
      </div>
      <span style={{ fontSize: k(26), fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05 }}>How much time can you give a day?</span>
      <div className="flex items-center" style={{ gap: 14 }}>
        <button type="button" aria-label="Less time" disabled={!cap || cap.mins <= 10} onClick={() => cap && c.setMins(cap.mins - 5)} style={round(false)}>
          −
        </button>
        <div className="flex flex-1 items-baseline justify-center" style={{ gap: 6 }} aria-live="polite">
          <span style={{ fontSize: k(76), fontWeight: 700, letterSpacing: "-.06em", lineHeight: 0.9 }}>{cap?.mins ?? "–"}</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>min</span>
        </div>
        <button type="button" aria-label="More time" disabled={!cap || cap.mins >= 180} onClick={() => cap && c.setMins(cap.mins + 5)} style={round(true)}>
          +
        </button>
      </div>
      <div className="flex flex-wrap justify-center" style={{ gap: 6 }}>
        {PRESETS.map((m) => (
          <button key={m} type="button" aria-pressed={cap?.mins === m} onClick={() => c.setMins(m)} style={chip(cap?.mins === m, { height: 32, padding: "0 11px", fontSize: 12 })}>
            {m} min
          </button>
        ))}
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <span style={label}>Study days</span>
        <div className="flex" style={{ gap: 6 }} role="group" aria-label="Study days">
          {DAY_LABELS.map((l, i) => {
            const on = cap?.days[i] ?? false;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => c.toggleDay(i)}
                style={{
                  width: dz,
                  height: dz,
                  flex: bp === "sm" ? 1 : "none",
                  borderRadius: "50%",
                  border: "2.5px solid var(--line)",
                  background: on ? "var(--sel)" : "var(--plain)",
                  color: on ? "var(--selText)" : "var(--plainText)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: on ? "2px 2px 0 var(--shadow)" : "none",
                  transform: on ? `rotate(${i % 2 ? 4 : -4}deg)` : "none",
                  opacity: on ? 1 : 0.75,
                  boxSizing: "border-box",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <span style={label}>New words a day</span>
        <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
          {NEW_WORDS.map((n) => (
            <button key={n} type="button" aria-pressed={cap?.newW === n} onClick={() => c.setNewW(n)} style={chip(cap?.newW === n, { height: 34, minWidth: 44, justifyContent: "center", padding: "0 12px" })}>
              {n}
            </button>
          ))}
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>≈ {(cap?.newW ?? 10) * 6} reviews a day</span>
        </div>
      </div>
    </Tile>
  );
}

// ── exam date + readiness ────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const fromKey = (key: string) => new Date(`${key}T00:00:00`);

function ExamTile({ bp, c, style }: { bp: Breakpoint; c: ReturnType<typeof useCapacity>; style: CSSProperties }) {
  const queryClient = useQueryClient();
  const { data: pace } = useQuery({ queryKey: ["learning", "pace"], queryFn: api.learningPace });
  const current = pace?.examTargetDate ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const exam = picked ?? current;
  const save = useMutation({
    mutationFn: (date: string) => api.setExamTarget(date),
    onSuccess: (_d, date) => {
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Exam set for ${fmtDay(fromKey(date), true)} · plan re-paced`);
    },
    onError: () => {
      setPicked(null);
      toast.error("Couldn't save that date");
    },
  });

  const today = fromKey(localDateKey());
  const tomorrow = localDateKey(new Date(today.getTime() + DAY_MS));
  const ex = exam ? fromKey(exam) : null;
  const examDays = ex ? Math.max(0, Math.round((ex.getTime() - today.getTime()) / DAY_MS)) : 0;

  // readiness (handoff §1.4), live from the capacity being edited
  const cap = c.cap;
  const nDays = cap?.days.filter(Boolean).length ?? 0;
  const level = (pace?.level ?? "b1").toUpperCase();
  const hoursLeft = pace?.hoursLeft ?? 0;
  const weeklyH = cap ? (cap.mins * nDays) / 60 : 0;
  const needDays = weeklyH > 0 ? (hoursLeft / weeklyH) * 7 : Infinity;
  const slackW = (examDays - needDays) / 7;
  const readyD = new Date(today.getTime() + (Number.isFinite(needDays) ? needDays : 0) * DAY_MS);
  const st = !ex || hoursLeft === 0 ? "ok" : !Number.isFinite(needDays) ? "late" : slackW >= 2 ? "ok" : slackW >= 0 ? "tight" : "late";
  const needMins = nDays && examDays ? Math.ceil((hoursLeft * 60) / (examDays / 7) / nDays / 5) * 5 : 0;
  const late = !!ex && st === "late" && needMins > 0 && needMins <= 180;
  const statusL = !pace || !cap
    ? "Working it out…"
    : !ex
      ? `Pick an exam date to see if your time gets you to ${level}.`
      : !nDays
        ? "Pick at least one study day."
        : hoursLeft === 0
          ? `Nothing left to study in ${level}. Book the exam whenever you like.`
          : st === "ok"
            ? `On track. Ready for ${level} around ${fmtDay(readyD)}, about ${Math.floor(slackW)} weeks early. Mock exam lands two weeks before.`
            : st === "tight"
              ? `Just in time. You'd finish around ${fmtDay(readyD)}, with no room for a mock exam.`
              : `Too tight. At ${cap.mins} min on ${nDays} days you'd be ready ${fmtDay(readyD, true)}. Add time or move the exam.`;
  const dot = !ex || !pace ? "var(--plain2)" : { ok: "var(--mint)", tight: "var(--lemon)", late: "var(--tomato)" }[st];

  return (
    <Tile bg="var(--sky)" tilt={0.7} className="flex flex-col" style={{ ...tileBox(bp), ...style }}>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <Kicker icon={<FlagPennant size={16} weight="fill" aria-hidden="true" />}>Exam date</Kicker>
        {ex && (
          <span style={{ padding: "5px 12px", border: "2.5px solid var(--line)", borderRadius: 10, background: "var(--tomato)", color: "var(--onTile)", fontSize: 14, fontWeight: 700, boxShadow: "2px 2px 0 var(--shadow)", transform: "rotate(-3deg)" }}>
            {examDays} day{examDays === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: k(34), fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{ex ? fmtDay(ex, true) : "Pick a date"}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Goethe-Zertifikat {level}
          {hoursLeft > 0 ? ` · about ${Math.round(hoursLeft)} h of study left` : ""}
        </span>
      </div>
      <input
        type="date"
        value={exam ?? ""}
        min={tomorrow}
        aria-label="Exam date"
        onChange={(e) => {
          const v = e.target.value;
          if (!v || v < tomorrow) return;
          setPicked(v);
          save.mutate(v);
        }}
        style={{ height: 44, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)", fontSize: 15, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
      />
      <div className="flex items-start" style={{ gap: 10, padding: 12, border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--plain)", color: "var(--plainText)", marginTop: bp === "lg" ? "auto" : 0 }}>
        <span aria-hidden="true" style={{ width: 16, height: 16, marginTop: 1, borderRadius: "50%", border: "2.5px solid var(--line)", background: dot, flexShrink: 0, boxSizing: "border-box" }} />
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
          <span role="status" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
            {statusL}
          </span>
          {late && (
            <button
              type="button"
              onClick={() => {
                c.setMins(needMins);
                toast.success(`Capacity set to ${needMins} min a day`);
              }}
              className="cursor-pointer self-start"
              style={{ height: 34, padding: "0 13px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 13 }}
            >
              Set {needMins} min a day
            </button>
          )}
        </div>
      </div>
    </Tile>
  );
}

// ── reset plan ───────────────────────────────────────────────────────────────

const KEEPS = [
  ["keepWords", "Keep words & review history"],
  ["keepNotes", "Keep notes"],
  ["keepApplications", "Keep applications"],
] as const;
type KeepKey = (typeof KEEPS)[number][0];
const HOLD_MS = 1500;

function ResetTile({ bp, style }: { bp: Breakpoint; style: CSSProperties }) {
  const queryClient = useQueryClient();
  const { data: pace } = useQuery({ queryKey: ["learning", "pace"], queryFn: api.learningPace });
  const { data: vault } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const vaultLinked = !!vault?.vaultPath;
  const [keep, setKeep] = useState<Record<KeepKey, boolean>>({ keepWords: true, keepNotes: true, keepApplications: true });
  const [hold, setHold] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const reset = useMutation({
    mutationFn: () => api.resetRoadmap({ ...keep, keepWords: keep.keepWords || vaultLinked }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      setDone(true);
      const lost = KEEPS.filter(([key]) => !keep[key] && !(key === "keepWords" && vaultLinked)).length;
      toast.success(lost ? `Fresh route · Day 1 · ${lost} thing${lost > 1 ? "s" : ""} cleared` : "Fresh route · Day 1 · everything kept");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't reset the plan · try again"),
  });

  const start = () => {
    if (reset.isPending) return;
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = () => {
      const pr = Math.min(1, (performance.now() - t0) / HOLD_MS);
      setHold(pr);
      if (pr >= 1) {
        setHold(0);
        reset.mutate();
      } else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const end = () => {
    cancelAnimationFrame(raf.current);
    setHold((h) => (h < 1 ? 0 : h));
  };

  const examKey = pace?.examTargetDate ?? null;
  const holdL = reset.isPending ? "Resetting…" : hold > 0 ? "Keep holding…" : done ? "Route restarted · hold to redo" : "Hold to reset";
  return (
    <Tile tilt={0.5} className="flex flex-col" style={{ ...tileBox(bp), ...style }}>
      <div className="flex flex-col" style={{ gap: 4 }}>
        <Kicker icon={<ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />}>Reset plan</Kicker>
        <span style={{ fontSize: k(24), fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05 }}>Start the route again</span>
        <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: "var(--plainMuted)" }}>
          Builds a new route from today{examKey ? ` to ${fmtDay(fromKey(examKey))}` : ""} using your capacity. Your streak goes back to 0.
        </span>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {KEEPS.map(([key, l]) => {
          const locked = key === "keepWords" && vaultLinked;
          const on = keep[key] || locked;
          return (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={locked}
              title={locked ? "Your words live in the Obsidian vault. Switch sync off to clear them here." : undefined}
              onClick={() => setKeep((s) => ({ ...s, [key]: !s[key] }))}
              className="flex items-center text-left"
              style={{ gap: 10, padding: 0, border: "none", background: "transparent", color: "inherit", cursor: locked ? "default" : "pointer", fontSize: 14, fontWeight: 700 }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{ width: 24, height: 24, borderRadius: 7, border: "2.5px solid var(--line)", background: on ? "var(--mint)" : "var(--plain)", color: "var(--onTile)", boxSizing: "border-box" }}
              >
                {on && <Check size={13} weight="bold" aria-hidden="true" />}
              </span>
              {l}
              {locked && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>· in your vault</span>}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.button === 0 && start()}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && (e.preventDefault(), start())}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && end()}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to reset the plan"
        className="relative cursor-pointer overflow-hidden select-none"
        style={{ marginTop: "auto", height: 52, flexShrink: 0, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain2)", color: "var(--plainText)", fontWeight: 700, fontSize: 15, boxShadow: "3px 3px 0 var(--shadow)", padding: 0, touchAction: "none" }}
      >
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-0" style={{ width: `${hold * 100}%`, background: "var(--tomato)", borderRight: hold > 0 ? "2.5px solid var(--line)" : "none" }} />
        <span className="relative flex items-center justify-center" style={{ gap: 8 }}>
          <HandTap size={15} weight="fill" aria-hidden="true" />
          {holdL}
        </span>
      </button>
    </Tile>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

function gridStyle(bp: Breakpoint, fill: boolean): CSSProperties {
  if (bp === "lg")
    return {
      gridTemplateColumns: "minmax(0,1.12fr) minmax(0,1fr) minmax(0,1fr)",
      gridTemplateRows: fill ? "minmax(0,1.1fr) minmax(0,1fr)" : "auto auto",
      gap: 22,
      height: fill ? "100%" : undefined,
    };
  return { gridTemplateColumns: bp === "md" ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: bp === "sm" ? 18 : 22, paddingBottom: bp === "sm" ? 4 : 0 };
}

/** Grid placement per tile: lg [column, row], md column span + order, sm order. */
function at(bp: Breakpoint, lg: [string | number, number], md: string, order: number, smOrder = order): CSSProperties {
  return bp === "lg" ? { gridColumn: lg[0], gridRow: lg[1] } : bp === "md" ? { gridColumn: md, order } : { order: smOrder };
}

export default function Settings() {
  const { bp, fill } = useBreakpoint();
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const capacity = useCapacity(status);
  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 16, "--k": bp === "lg" ? 1 : bp === "md" ? 0.92 : 0.8 } as CSSProperties}>
      {bp === "sm" && (
        <div className="flex items-baseline justify-between" style={{ gap: 8, padding: "4px 4px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.04em", margin: 0 }}>Settings</h1>
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>Saved to your account</span>
        </div>
      )}
      <div className="grid min-h-0 flex-1" style={gridStyle(bp, fill)}>
        {bp !== "sm" && <h1 className="sr-only">Settings</h1>}
        <CapacityTile bp={bp} c={capacity} style={at(bp, [1, 1], "1 / 3", 1)} />
        <ExamTile bp={bp} c={capacity} style={at(bp, [2, 1], "auto", 2)} />
        <ObsidianTile bp={bp} style={at(bp, [3, 1], "auto", 3, 4)} />
        <ResetTile bp={bp} style={at(bp, [1, 2], "1 / 3", 5)} />
        <CvShelf bp={bp} style={at(bp, ["2 / 4", 2], "1 / 3", 4, 3)} />
      </div>
    </div>
  );
}

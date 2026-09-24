import { useState, type CSSProperties, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  ArrowRight,
  BookOpen,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  Check,
  DotsThree,
  Exam,
  FlagPennant,
  HourglassMedium,
  LinkSimple,
  ListChecks,
  LockSimple,
  MicrophoneStage,
  NotePencil,
  Play,
  Plus,
  SpeakerHigh,
  TextAa,
  Timer,
  VideoCamera,
} from "@phosphor-icons/react";
import type { StudySource } from "../../../api/types";
import { DuSticker, Starburst } from "../../../components/ui/Sticker";
import { Tile } from "../../../components/ui/Tile";
import { SKILL_COLORS } from "../../../lib/skills";
import { clock } from "../../../lib/tasks";
import type { Breakpoint } from "../../../lib/useBreakpoint";
import { isItemDone, SOURCE_COLOR, sourceKind, type SourceKind, type Station } from "./model";

/*
 * The journey stream (AzubiPlanJourney.dc.html): behind-you toggle → today's ticket → (sm) Now card → you are here →
 * next stations → checkpoint → later stations → the gate. Literal prototype values; data from the real roadmap and
 * syllabus.
 */

const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };

export const SOURCE_ICON: Record<SourceKind, typeof VideoCamera> = {
  video: VideoCamera,
  audio: MicrophoneStage,
  book: BookOpen,
  course: ChalkboardTeacher,
  article: NotePencil,
  link: LinkSimple,
};

export function SourceChip({ source, onClick }: { source: StudySource; onClick: () => void }) {
  const k = sourceKind(source.type);
  const Icon = SOURCE_ICON[k];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5"
      style={{ fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, border: "2px solid var(--line)", background: SOURCE_COLOR[k], color: "var(--onTile)" }}
    >
      <Icon size={13} weight="fill" aria-hidden="true" />
      <span className="max-w-[200px] truncate">{source.title}</span>
      {source.totalUnits ? ` · ${source.completedUnits}/${source.totalUnits}` : ""}
    </button>
  );
}

function Dashed({ children, onClick, expanded }: { children: ReactNode; onClick: () => void; expanded: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex shrink-0 cursor-pointer items-center gap-2 self-center"
      style={{ height: 40, padding: "0 16px", border: "2.5px dashed var(--text)", borderRadius: 999, background: "transparent", color: "var(--text)", fontWeight: 700, fontSize: 14 }}
    >
      {children}
    </button>
  );
}

// ── behind you ──

export function Behind({ closed, prevLevels, bp, onOpen }: { closed: Station[]; prevLevels: string[]; bp: Breakpoint; onOpen: (s: Station) => void }) {
  const [open, setOpen] = useState(false);
  if (closed.length === 0 && prevLevels.length === 0) return null;
  const label =
    bp === "sm"
      ? `Behind you · ${closed.length} closed`
      : `Behind you · ${prevLevels.length ? `${prevLevels.join(" + ")} + ` : ""}${closed.length} ${closed[0]?.level.toUpperCase() ?? ""} station${closed.length === 1 ? "" : "s"} closed`;
  return (
    <>
      <Dashed onClick={() => setOpen((v) => !v)} expanded={open}>
        <CaretLeft size={15} weight="bold" aria-hidden="true" />
        {label}
      </Dashed>
      {open && (
        <div className="flex shrink-0 flex-wrap justify-center gap-1.5">
          {closed.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onOpen(s)}
              className="inline-flex cursor-pointer items-center gap-1"
              style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: "2px solid var(--line)", background: s.skipped ? "var(--plain2)" : "var(--mint)", color: s.skipped ? "var(--plainText)" : "var(--onTile)" }}
            >
              <Check size={12} weight="bold" aria-hidden="true" />
              {s.index} · {s.theme}
              {s.skipped ? " (skipped)" : ""}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── ticket ──

export interface TicketRow {
  key: string;
  title: string;
  meta: string;
  color: string;
  done: boolean;
  running?: boolean;
  /** A destination, not a checkbox (due reviews). */
  review?: boolean;
  taskId?: string;
  itemId?: string;
}

function Draggable({ id, enabled, children, style }: { id: string; enabled: boolean; children: ReactNode; style: CSSProperties }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, position: "relative" } : {}), opacity: isDragging ? 0.85 : 1 }}
    >
      {children}
      {enabled && (
        <span {...listeners} {...attributes} aria-label="Drag onto Notes to pin" className="flex shrink-0 cursor-grab items-center" style={{ opacity: 0.45, touchAction: "none" }}>
          <DotsThree size={16} weight="bold" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function RowBox({ done, circle, accent, onToggle, label }: { done: boolean; circle?: boolean; accent?: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex shrink-0 cursor-pointer items-center justify-center p-0"
      style={{ width: 22, height: 22, borderRadius: circle ? "50%" : 7, border: "2.5px solid var(--line)", background: done ? "var(--mint)" : accent ? "var(--lemon)" : "transparent", color: "var(--onTile)", boxSizing: "border-box" }}
    >
      {done && <Check size={12} weight="bold" aria-hidden="true" />}
    </button>
  );
}

function RowText({ title, meta, done, onOpen, muted }: { title: string; meta: string; done: boolean; onOpen: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
      style={{ color: "inherit", textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }}
    >
      <div lang="de" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: muted ? 1 : 0.7, color: muted ? "var(--plainMuted)" : undefined }}>{meta}</div>
    </button>
  );
}

export function Ticket({
  rows,
  optional,
  carriedOver,
  capLine,
  bp,
  dragOK,
  onToggle,
  onOpen,
  onWeek,
  onPullIn,
  onSpread,
}: {
  rows: TicketRow[];
  optional: TicketRow[];
  carriedOver: number;
  capLine: string;
  bp: Breakpoint;
  dragOK: boolean;
  onToggle: (r: TicketRow) => void;
  onOpen: (r: TicketRow) => void;
  onWeek: () => void;
  onPullIn: () => void;
  onSpread: () => void;
}) {
  const [showOptional, setShowOptional] = useState(false);
  const today = new Date();
  const firstOpen = rows.find((r) => !r.done)?.key;
  const shown = showOptional ? [...rows, ...optional] : rows;
  const sm = bp === "sm";
  const stub: CSSProperties = sm
    ? { display: "flex", alignItems: "baseline", gap: 8, padding: "12px 16px", borderBottom: "3px dashed var(--line)", background: "var(--orange)" }
    : { width: bp === "md" ? 80 : 96, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderRight: "3px dashed var(--line)", background: "var(--orange)" };
  return (
    <section
      className="flex shrink-0 overflow-hidden"
      style={{ flexDirection: sm ? "column" : "row", background: "var(--lemon)", color: "var(--onTile)", border: "2.5px solid var(--line)", borderRadius: 24, boxShadow: "5px 5px 0 var(--shadow)", transform: "rotate(-0.5deg)" }}
    >
      <button type="button" onClick={onWeek} aria-label="Open this week" className="cursor-pointer border-0 p-0" style={{ ...stub, color: "inherit", font: "inherit" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>{today.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</span>
        <span style={{ fontSize: "calc(var(--k) * 44px)", fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.9 }}>{today.getDate()}</span>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>
          {(() => {
            const m = today.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
            return m === "SEP" ? "SEPT" : m;
          })()}
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5" style={{ padding: "16px 18px" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span style={{ fontSize: "calc(var(--k) * 24px)", fontWeight: 700, letterSpacing: "-.03em" }}>Today's ticket</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{capLine}</span>
        </div>
        {carriedOver > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2" style={{ border: "2px dashed var(--line)", borderRadius: 14, padding: "5px 8px 5px 12px", fontSize: 13, fontWeight: 700 }}>
            <span>carried over · {carriedOver}</span>
            <span className="flex gap-1.5">
              {[
                ["Pull in", onPullIn],
                ["Spread", onSpread],
              ].map(([l, fn]) => (
                <button key={l as string} type="button" onClick={fn as () => void} className="cursor-pointer" style={{ height: 30, padding: "0 11px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 13 }}>
                  {l as string}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className="grid gap-2" style={{ gridTemplateColumns: bp === "lg" ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)" }}>
          {shown.map((r) => {
            const c = r.key === firstOpen;
            return (
              <Draggable
                key={r.key}
                id={`ticket:${r.key}`}
                enabled={dragOK && !r.review}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 14,
                  border: `2px solid ${c ? "var(--line)" : "var(--dash)"}`,
                  background: c ? "var(--plain)" : "transparent",
                  color: c ? "var(--plainText)" : "inherit",
                  boxShadow: c ? "3px 3px 0 var(--shadow)" : "none",
                  transform: c ? "rotate(-0.8deg)" : "none",
                  flexShrink: 0,
                }}
              >
                {r.review ? (
                  <span aria-hidden="true" className="flex shrink-0 items-center justify-center" style={{ width: 22, height: 22, borderRadius: 7, border: "2.5px solid var(--line)", background: "var(--tomato)", color: "var(--onTile)" }}>
                    <ArrowRight size={12} weight="bold" />
                  </span>
                ) : (
                  <RowBox done={r.done} accent={c} onToggle={() => onToggle(r)} label={`${r.title} done`} />
                )}
                <RowText title={r.title} meta={r.meta} done={r.done} onOpen={() => onOpen(r)} muted={c} />
                {r.running && <span aria-label="Timer running" className="shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--tomato)", border: "2px solid var(--line)" }} />}
              </Draggable>
            );
          })}
        </div>
        {optional.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            className="cursor-pointer self-start"
            style={{ height: 32, padding: "0 12px", border: "2px dashed var(--line)", borderRadius: 999, background: "transparent", color: "inherit", fontWeight: 700, fontSize: 13 }}
          >
            {showOptional ? "Hide optional" : `+${optional.length} optional — pull ahead`}
          </button>
        )}
        {dragOK && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>Tap a task to open it · drag one onto Notes to pin it</span>}
      </div>
    </section>
  );
}

// ── sm Now card ──

export function NowCard({ title, seconds, running, onOpen, onRun }: { title: string; seconds: number; running: boolean; onOpen: () => void; onRun: () => void }) {
  return (
    <section
      className="flex items-center gap-2.5"
      style={{ padding: "10px 12px", background: "var(--sky)", color: "var(--onTile)", border: "2.5px solid var(--line)", borderRadius: 18, boxShadow: "4px 4px 0 var(--shadow)" }}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left" style={{ color: "inherit" }}>
        <div style={{ ...eyebrow, fontSize: 11 }}>Now</div>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }} lang="de">
          {title}
        </div>
      </button>
      <span role="timer" style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {clock(seconds)}
      </span>
      <RunButton running={running} onClick={onRun} />
    </section>
  );
}

export function RunButton({ running, onClick, disabled }: { running: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 disabled:cursor-default disabled:opacity-50"
      style={{ height: 40, padding: "0 14px", border: "2.5px solid var(--line)", borderRadius: 999, background: running ? "var(--tomato)" : "var(--btn)", color: running ? "var(--onTile)" : "var(--btnText)", fontWeight: 700, fontSize: 14, boxShadow: "2px 2px 0 var(--shadow)" }}
    >
      {running ? <HourglassMedium size={14} weight="fill" aria-hidden="true" /> : <Play size={14} weight="fill" aria-hidden="true" />}
      {running ? "Pause" : "Start"}
    </button>
  );
}

// ── you are here ──

export function CurrentStation({
  station,
  total,
  fuel,
  bp,
  dragOK,
  runningTaskId,
  onOverview,
  onOpenItem,
  onToggleItem,
  onOpenSource,
  onAddFuel,
}: {
  station: Station;
  total: number;
  fuel: StudySource[];
  bp: Breakpoint;
  dragOK: boolean;
  runningTaskId: string | null;
  onOverview: () => void;
  onOpenItem: (itemId: string) => void;
  onToggleItem: (itemId: string, done: boolean) => void;
  onOpenSource: (s: StudySource) => void;
  onAddFuel: () => void;
}) {
  const done = station.items.filter(isItemDone).length;
  return (
    <Tile bg="var(--lilac)" tilt={0.4} radius={26} shadow={6} className="flex shrink-0 flex-col gap-3.5" style={{ padding: "calc(var(--k) * 22px)" }}>
      <DuSticker size={54} tilt={-12} style={{ position: "absolute", top: -18, left: -12 }} />
      <div className="flex flex-wrap items-start justify-between gap-3" style={{ paddingLeft: 36 }}>
        <div>
          <div style={eyebrow}>
            You are here · Station {station.index} of {total}
          </div>
          <div style={{ fontSize: "calc(var(--k) * 34px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>{station.theme}</div>
        </div>
        <button
          type="button"
          onClick={onOverview}
          className="cursor-pointer"
          style={{ height: 40, padding: "0 16px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14, boxShadow: "2px 2px 0 var(--shadow)" }}
        >
          Station overview
        </button>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 overflow-hidden" style={{ height: 14, borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain)", boxSizing: "border-box" }}>
          <div style={{ width: `${(done / Math.max(1, station.total)) * 100}%`, height: "100%", background: "var(--mint)", borderRight: done && done < station.total ? "2px solid var(--line)" : "none", transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {done}/{station.total} closed
        </span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: bp === "lg" ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)" }}>
        {station.items.map((item) => {
          const d = isItemDone(item);
          return (
            <Draggable
              key={item.id}
              id={`item:${item.id}`}
              enabled={dragOK}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "2px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)" }}
            >
              <RowBox done={d} circle onToggle={() => onToggleItem(item.id, !d)} label={`${item.title} done`} />
              <RowText title={item.title} meta={`${item.skill ? item.skill[0]!.toUpperCase() + item.skill.slice(1) : "Topic"}${item.exerciseType ? " · exercise" : ""}`} done={d} onOpen={() => onOpenItem(item.id)} muted />
              {item.roadmapTaskId && item.roadmapTaskId === runningTaskId && (
                <span aria-label="Timer running" className="shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--tomato)", border: "2px solid var(--line)" }} />
              )}
            </Draggable>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span style={eyebrow}>Fuel</span>
        {fuel.map((s) => (
          <SourceChip key={s.id} source={s} onClick={() => onOpenSource(s)} />
        ))}
        <button
          type="button"
          onClick={onAddFuel}
          className="inline-flex cursor-pointer items-center gap-1"
          style={{ height: 30, padding: "0 11px", border: "2px dashed var(--line)", borderRadius: 999, background: "transparent", color: "var(--onTile)", fontWeight: 700, fontSize: 13 }}
        >
          <Plus size={12} weight="bold" aria-hidden="true" />
          Add fuel
        </button>
      </div>
    </Tile>
  );
}

// ── station cards (next / later) ──

const SKILL_DOTS = ["vocab", "grammar", "listening", "speaking"] as const;

export function StationCards({ stations, bp, fuelCount, onOpen }: { stations: Station[]; bp: Breakpoint; fuelCount: (s: Station) => number; onOpen: (s: Station) => void }) {
  return (
    <div className="relative flex shrink-0 flex-col gap-3.5">
      <span aria-hidden="true" className="absolute" style={{ left: "calc(50% - 1px)", top: -14, bottom: -14, borderLeft: "3px dashed var(--text)", opacity: 0.4 }} />
      {stations.map((s, i) => {
        const skills = new Set(s.items.map((it) => it.skill));
        const n = fuelCount(s);
        return (
          <div key={s.key} className="relative flex" style={{ justifyContent: i % 2 ? "flex-end" : "flex-start" }}>
            <button
              type="button"
              onClick={() => onOpen(s)}
              className="flex cursor-pointer items-center gap-3 text-left"
              style={{
                width: bp === "lg" ? "62%" : "86%",
                padding: "12px 14px",
                borderRadius: 18,
                border: "2.5px dashed var(--line)",
                background: "var(--plain)",
                color: "var(--plainText)",
                transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)`,
                font: "inherit",
              }}
            >
              <span className="flex shrink-0 items-center justify-center" style={{ width: 34, height: 34, borderRadius: "50%", border: "2.5px dashed var(--line)", fontWeight: 700, fontSize: 14, boxSizing: "border-box" }}>
                {s.index}
              </span>
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{s.theme}</div>
                <div className="mt-[5px] flex gap-[3px]" aria-label={`Skills: ${[...skills].filter(Boolean).join(", ")}`}>
                  {SKILL_DOTS.map((sk) => (
                    <span
                      key={sk}
                      style={{ width: 10, height: 10, borderRadius: 3, border: "2px solid var(--line)", background: skills.has(sk) ? SKILL_COLORS[sk] : "transparent", opacity: skills.has(sk) ? 0.8 : 0.25, boxSizing: "border-box" }}
                    />
                  ))}
                </div>
              </div>
              {n > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, border: "2px solid var(--line)", whiteSpace: "nowrap" }}>{n} src</span>}
              {[7, 14, 21].includes(s.index) ? <Exam size={15} weight="fill" aria-label="Checkpoint after this station" /> : <LockSimple size={14} weight="fill" style={{ opacity: 0.5 }} aria-hidden="true" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function LaterToggle({ count, first, last, open, onToggle }: { count: number; first: number; last: number; open: boolean; onToggle: () => void }) {
  return (
    <Dashed onClick={onToggle} expanded={open}>
      <CaretRight size={15} weight="bold" aria-hidden="true" />
      Stations {first}–{last} · {count} more stops
    </Dashed>
  );
}

// ── checkpoint ──

export interface CheckpointTest {
  key: "mcq" | "fill" | "gender" | "listen";
  title: string;
  percent: number | null;
}

const TEST_ICON = { mcq: ListChecks, fill: TextAa, gender: Timer, listen: SpeakerHigh };
export const band = (s: number) => (s >= 80 ? "var(--mint)" : s >= 65 ? "var(--lemon)" : "var(--tomato)");

export function CheckpointTile({ label, tests, weak, bp, onOpen }: { label: string; tests: CheckpointTest[]; weak: string[]; bp: Breakpoint; onOpen: () => void }) {
  return (
    <Tile bg="var(--mint)" tilt={-0.6} radius={24} className="flex shrink-0 flex-col gap-3.5" style={{ padding: "18px 20px" }}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex shrink-0 items-center justify-center" style={{ width: 52, height: 52, borderRadius: 14, border: "2.5px solid var(--line)", background: "var(--lemon)", transform: "rotate(-8deg)", boxSizing: "border-box" }}>
          <Exam size={24} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-[180px] flex-1">
          <div style={eyebrow}>{label}</div>
          <div style={{ fontSize: "calc(var(--k) * 24px)", fontWeight: 700, letterSpacing: "-.03em" }}>Self-tests</div>
        </div>
        <button type="button" onClick={onOpen} className="cursor-pointer" style={{ height: 40, padding: "0 16px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14, boxShadow: "2px 2px 0 var(--shadow)" }}>
          Practise now
        </button>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: bp === "sm" ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))" }}>
        {tests.map((t) => {
          const Icon = TEST_ICON[t.key];
          return (
            <button key={t.key} type="button" onClick={onOpen} className="flex cursor-pointer flex-col gap-1.5 text-left" style={{ padding: "10px 12px", border: "2px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)", font: "inherit" }}>
              <div className="flex items-center justify-between gap-1.5">
                <Icon size={16} weight="fill" aria-hidden="true" />
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: `2px ${t.percent === null ? "dashed" : "solid"} var(--line)`, background: t.percent === null ? "transparent" : band(t.percent), color: "var(--onTile)" }}>
                  {t.percent === null ? "—" : `${t.percent}%`}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15 }}>{t.title}</span>
            </button>
          );
        })}
      </div>
      {weak.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={eyebrow}>Weak spots</span>
          {weak.map((w) => (
            <span key={w} style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "2px solid var(--line)", background: "var(--tomato)" }}>
              {w}
            </span>
          ))}
        </div>
      )}
    </Tile>
  );
}

// ── the gate ──

export interface ScheduleCard {
  k: string;
  d: string;
  c: string;
  st: "done" | "next" | "soon" | "gate";
  go?: () => void;
}

export function GateTile({ stationIndex, level, rules, schedule, bp, onOpen }: { stationIndex: number; level: string; rules: string; schedule: ScheduleCard[]; bp: Breakpoint; onOpen: () => void }) {
  return (
    <Tile bg="var(--orange)" tilt={0.5} radius={28} shadow={6} className="mb-1.5 flex shrink-0 flex-col gap-[18px]" style={{ padding: "calc(var(--k) * 26px)" }}>
      <div className="flex flex-wrap items-center gap-[22px]">
        <Starburst size="calc(var(--k) * 100px)" tilt={-10}>
          <FlagPennant size={34} weight="fill" aria-hidden="true" />
        </Starburst>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span style={eyebrow}>The gate · station {stationIndex}</span>
          <span style={{ fontSize: "calc(var(--k) * 44px)", fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.95 }}>{level} final exam</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{rules}</span>
        </div>
        <button type="button" onClick={onOpen} className="cursor-pointer" style={{ height: 48, padding: "0 20px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 15, boxShadow: "3px 3px 0 var(--shadow)" }}>
          See the gate
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <span style={eyebrow}>Exam schedule</span>
        <ScheduleGrid schedule={schedule} bp={bp} />
      </div>
    </Tile>
  );
}

export function ScheduleGrid({ schedule, bp }: { schedule: ScheduleCard[]; bp: Breakpoint }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: bp === "sm" ? "repeat(2,minmax(0,1fr))" : `repeat(${Math.min(4, schedule.length)},minmax(0,1fr))` }}>
      {schedule.map((e) => {
        const style: CSSProperties = {
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "10px 12px",
          border: `2px ${e.st === "soon" ? "dashed" : "solid"} var(--line)`,
          borderRadius: 14,
          background: e.st === "done" ? "var(--mint)" : e.st === "next" ? "var(--lemon)" : e.st === "gate" ? "var(--btn)" : "var(--plain)",
          color: e.st === "gate" ? "var(--btnText)" : e.st === "soon" ? "var(--plainText)" : "var(--onTile)",
          textAlign: "left",
          font: "inherit",
        };
        const inner = (
          <>
            <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em" }}>
              {e.k}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.1 }}>{e.d}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{e.c}</span>
          </>
        );
        return e.go ? (
          <button key={e.k} type="button" onClick={e.go} className="cursor-pointer" style={style}>
            {inner}
          </button>
        ) : (
          <div key={e.k} style={style}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

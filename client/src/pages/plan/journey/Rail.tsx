import { useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Fire, FlagPennant, Tag } from "@phosphor-icons/react";
import type { CefrLevel, Note, StudySource } from "../../../api/types";
import { DuSticker } from "../../../components/ui/Sticker";
import { Tile } from "../../../components/ui/Tile";
import { clock } from "../../../lib/tasks";
import { stripHtml } from "../../../lib/text";
import type { Breakpoint } from "../../../lib/useBreakpoint";
import { SOURCE_COLOR, sourceKind, sourceProgress } from "./model";
import { RunButton } from "./Stream";
import { SOURCE_ICON } from "./sourceIcons";

const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };

export interface AltLevel {
  level: CefrLevel;
  percent: number;
  state: "done" | "active" | "locked";
}

/** Prototype: closed levels mint, the level you're climbing lemon, locked ones empty. */
const fillFor = (l: AltLevel) => (l.state === "done" ? "var(--mint)" : "var(--lemon)");
const pctFor = (l: AltLevel) => (l.state === "done" ? 100 : l.state === "locked" ? 0 : l.percent);

export interface GateInfo {
  days: number | null;
  date: string | null;
}

function gateLine(g: GateInfo): { big: string; small: string } {
  if (g.days === null) return { big: "Set a date", small: "for the exam gate" };
  return { big: `${g.days} day${g.days === 1 ? "" : "s"}`, small: g.date ?? "" };
}

/** lg altitude rail: B1 / A2 / A1 stacked, filling from the bottom; the DU sticker at the active level's fill line. */
export function AltitudeRail({ levels, gate, streak, onGate }: { levels: AltLevel[]; gate: GateInfo; streak: number; onGate: () => void }) {
  const g = gateLine(gate);
  return (
    <Tile radius={24} className="flex w-[220px] shrink-0 flex-col gap-3.5" style={{ padding: 18 }}>
      <span style={eyebrow}>Altitude</span>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {[...levels].reverse().map((l) => {
          const pct = pctFor(l);
          return (
            <div
              key={l.level}
              className="relative min-h-0 flex-1"
              style={{ border: `2.5px ${pct ? "solid" : "dashed"} var(--line)`, borderRadius: 16, background: "var(--plain2)" }}
              aria-label={`${l.level.toUpperCase()}: ${l.state === "done" ? "closed" : l.state === "locked" ? "locked" : `${l.percent}%`}`}
            >
              <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 13 }}>
                <div className="absolute inset-x-0 bottom-0" style={{ height: `${pct}%`, background: fillFor(l), borderTop: pct && pct < 100 ? "2.5px solid var(--line)" : "none", transition: "height .4s" }} />
              </div>
              <div className="absolute flex flex-col" style={{ top: 10, left: 12, lineHeight: 1.05, color: pct === 100 ? "var(--onTile)" : "var(--plainText)" }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.04em" }}>{l.level.toUpperCase()}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{l.state === "done" ? "closed" : l.state === "locked" ? "locked" : `${l.percent}%`}</span>
              </div>
              {l.state === "active" && <DuSticker size={44} tilt={12} style={{ position: "absolute", right: -6, bottom: `calc(${pct}% - 20px)` }} />}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onGate}
        className="cursor-pointer text-left"
        style={{ padding: "10px 12px", border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--orange)", color: "var(--onTile)", transform: "rotate(-1deg)", font: "inherit" }}
      >
        <div style={{ ...eyebrow, fontSize: 11 }}>Exam gate</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.03em" }}>{g.big}</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{g.small}</div>
      </button>
      <div className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 700 }}>
        <Fire size={18} weight="fill" aria-hidden="true" />
        {streak}-day streak
      </div>
    </Tile>
  );
}

/** md/sm altitude strip: a horizontal A1 / A2 / B1 bar and a rotated gate chip. */
export function AltitudeStrip({ levels, active, gate, streak, bp, onGate }: { levels: AltLevel[]; active: AltLevel; gate: GateInfo; streak: number; bp: Breakpoint; onGate: () => void }) {
  return (
    <section
      className="flex items-center gap-3.5"
      style={{ background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 22, boxShadow: "4px 4px 0 var(--shadow)", padding: bp === "sm" ? "12px 12px 12px 14px" : "14px 16px" }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-2" style={{ fontSize: 13, fontWeight: 700 }}>
          <span>
            Altitude · {active.level.toUpperCase()} {active.percent}%
          </span>
          <span className="inline-flex items-center gap-1">
            <Fire size={15} weight="fill" aria-hidden="true" />
            {streak} days
          </span>
        </div>
        <div className="flex gap-[5px]">
          {levels.map((l) => {
            const pct = pctFor(l);
            return (
              <div key={l.level} className="relative flex-1 overflow-hidden" style={{ height: 26, border: `2.5px ${pct ? "solid" : "dashed"} var(--line)`, borderRadius: 10, background: "var(--plain2)" }}>
                <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: fillFor(l), borderRight: pct && pct < 100 ? "2.5px solid var(--line)" : "none" }} />
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "var(--onTile)" : "var(--plainText)" }}>
                  {l.level.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onGate}
        className="flex shrink-0 cursor-pointer items-center gap-2"
        style={{ padding: bp === "sm" ? "8px 10px" : "10px 14px", border: "2.5px solid var(--line)", borderRadius: 16, background: "var(--orange)", color: "var(--onTile)", transform: "rotate(-1.5deg)", boxShadow: "2px 2px 0 var(--shadow)", font: "inherit" }}
      >
        <FlagPennant size={20} weight="fill" aria-hidden="true" />
        <div className="text-left" style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.03em" }}>{gate.days === null ? "Set date" : `${gate.days} days`}</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>to the exam gate</div>
        </div>
      </button>
    </section>
  );
}

/** Now tile (sky): the running task, else the first open ticket task; clock, run button, estimate bar, +N min. */
export function NowTile({
  kind,
  title,
  seconds,
  estimate,
  running,
  disabled,
  onOpen,
  onRun,
  onAdd,
}: {
  kind: string;
  title: string;
  seconds: number;
  estimate: number;
  running: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRun: () => void;
  onAdd: (m: number) => void;
}) {
  const over = seconds > estimate * 60;
  return (
    <Tile bg="var(--sky)" tilt={-0.8} radius={24} className="flex shrink-0 flex-col gap-2" style={{ padding: "14px 16px" }}>
      <span style={eyebrow}>Now · {kind}</span>
      <button type="button" onClick={onOpen} disabled={disabled} className="cursor-pointer truncate border-0 bg-transparent p-0 text-left disabled:cursor-default" style={{ color: "inherit", fontSize: 18, fontWeight: 700, lineHeight: 1.15 }} lang="de">
        {title}
      </button>
      <div className="flex items-center gap-2.5">
        <span role="timer" className="flex-1" style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {clock(seconds)}
        </span>
        <RunButton running={running} onClick={onRun} disabled={disabled} />
      </div>
      <div className="overflow-hidden" style={{ height: 10, borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain)", boxSizing: "border-box" }}>
        <div style={{ width: `${Math.min(100, (seconds / (estimate * 60)) * 100)}%`, height: "100%", background: over ? "var(--tomato)" : "var(--mint)", borderRight: seconds > 0 && !over ? "2px solid var(--line)" : "none" }} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex-1 whitespace-nowrap" style={{ fontSize: 12, fontWeight: 700 }}>
          of {estimate} min
        </span>
        {[5, 10, 15].map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(m)}
            className="cursor-pointer whitespace-nowrap disabled:cursor-default disabled:opacity-50"
            style={{ height: 30, padding: "0 9px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 12 }}
          >
            +{m}
          </button>
        ))}
      </div>
    </Tile>
  );
}

/** Notes · Station N (mint): the station's notes, a drop target for ticket/station rows (lg/md), and a composer. */
export function NotesTile({
  stationIndex,
  notes,
  bp,
  dragOK,
  onSave,
  saving,
}: {
  stationIndex: number | null;
  notes: Note[];
  bp: Breakpoint;
  dragOK: boolean;
  onSave: (text: string) => void;
  saving: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "notes-tile", disabled: !dragOK });
  const [draft, setDraft] = useState("");
  const lg = bp === "lg";
  return (
    <section
      ref={setNodeRef}
      className="flex flex-col gap-2"
      style={{
        flex: lg ? 1 : "none",
        minHeight: 0,
        background: "var(--mint)",
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: 24,
        boxShadow: isOver ? "8px 8px 0 var(--shadow)" : "5px 5px 0 var(--shadow)",
        transform: isOver ? "rotate(0deg) scale(1.01)" : "rotate(0.6deg)",
        padding: lg ? 16 : 18,
        boxSizing: "border-box",
        transition: "transform .15s, box-shadow .15s",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={eyebrow}>Notes · {stationIndex ? `Station ${stationIndex}` : "Plan"}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          {notes.length} note{notes.length === 1 ? "" : "s"}
        </span>
      </div>
      {dragOK && (
        <div
          className="flex shrink-0 items-center justify-center gap-1.5"
          style={{ height: 34, border: "2.5px dashed var(--line)", borderRadius: 12, background: isOver ? "var(--lemon)" : "transparent", fontSize: 13, fontWeight: 700, transition: "background .15s" }}
        >
          <Tag size={15} weight="fill" aria-hidden="true" />
          {isOver ? "Let go to pin it" : "Drop a task here to pin it"}
        </div>
      )}
      <div className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto" style={{ flex: lg ? 1 : "none", minHeight: lg ? 130 : 0, maxHeight: lg ? "none" : 260 }}>
        {notes.map((n) => (
          <div key={n.id} className="flex shrink-0 flex-col gap-[5px]" style={{ padding: "9px 11px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
            {(n.pinned || n.title) && (
              <span className="inline-flex items-center gap-1 self-start" style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, border: "2px solid var(--line)", background: n.pinned ? "var(--lemon)" : "var(--plain2)", color: n.pinned ? "var(--onTile)" : "var(--plainText)" }}>
                <Tag size={11} weight="fill" aria-hidden="true" />
                {n.pinned ? "pinned" : (n.title ?? "")}
              </span>
            )}
            <span>{stripHtml(n.body ?? "") || n.title}</span>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note while it's fresh…"
          aria-label="New station note"
          style={{ flex: 1, minWidth: 0, height: 48, resize: "none", padding: "8px 10px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 14, boxSizing: "border-box" }}
        />
        <button
          type="button"
          disabled={!draft.trim() || saving}
          onClick={() => {
            onSave(draft.trim());
            setDraft("");
          }}
          className="shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-50"
          style={{ width: 64, border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 14 }}
        >
          Save
        </button>
      </div>
    </section>
  );
}

/** Library · N: See all / + Add and the top sources with progress. */
export function LibraryTile({ sources, bp, onOpenAll, onAdd, onOpenSource }: { sources: StudySource[]; bp: Breakpoint; onOpenAll: () => void; onAdd: () => void; onOpenSource: (s: StudySource) => void }) {
  const top = sources.slice(0, bp === "lg" ? 3 : 4);
  return (
    <Tile radius={24} className="flex shrink-0 flex-col gap-2.5" style={{ padding: 16 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap" style={eyebrow}>
          Library · {sources.length}
          {bp === "md" ? "" : " sources"}
        </span>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={onOpenAll} className="cursor-pointer whitespace-nowrap" style={{ height: 30, padding: "0 10px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain2)", color: "var(--plainText)", fontWeight: 700, fontSize: 12 }}>
            See all
          </button>
          <button type="button" onClick={onAdd} className="cursor-pointer whitespace-nowrap" style={{ height: 30, padding: "0 10px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--lemon)", color: "var(--onTile)", fontWeight: 700, fontSize: 12 }}>
            + Add
          </button>
        </div>
      </div>
      {top.length === 0 && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)" }}>Add a podcast, course or book to fuel your stations.</span>}
      {top.map((s) => {
        const k = sourceKind(s.type);
        const Icon = SOURCE_ICON[k];
        const p = sourceProgress(s);
        return (
          <button key={s.id} type="button" onClick={() => onOpenSource(s)} className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left" style={{ color: "inherit", font: "inherit" }}>
            <span className="flex shrink-0 items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, border: "2px solid var(--line)", background: SOURCE_COLOR[k], color: "var(--onTile)", transform: "rotate(-5deg)", boxSizing: "border-box" }}>
              <Icon size={15} weight="fill" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex justify-between gap-1.5">
                <span className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                  {s.title}
                </span>
                <span className="whitespace-nowrap" style={{ fontSize: 11, fontWeight: 600, color: "var(--plainMuted)" }}>
                  {p.label}
                </span>
              </div>
              <div className="overflow-hidden" style={{ height: 8, borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain2)", boxSizing: "border-box" }}>
                <div style={{ width: `${p.pct}%`, height: "100%", background: p.pct >= 100 ? "var(--mint)" : SOURCE_COLOR[k], borderRight: p.pct && p.pct < 100 ? "2px solid var(--line)" : "none" }} />
              </div>
            </div>
          </button>
        );
      })}
    </Tile>
  );
}

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  /** One full revolution of the dial = this many minutes. Defaults to a
   * range that comfortably covers a single study session — values beyond
   * that are still reachable via the "type a number" fallback below. */
  max?: number;
}

const SIZE = 168;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SNAP_MINUTES = 5;

/** Degrees clockwise from 12 o'clock, for the point (x, y) relative to the
 * dial's own center — 0 at top, 90 at 3 o'clock, etc. */
function angleFromPoint(cx: number, cy: number, x: number, y: number): number {
  const dx = x - cx;
  const dy = y - cy;
  let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
}

function pointOnCircle(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

/**
 * A minimalist circular duration dial, modeled on a smartphone alarm/timer
 * picker rather than a bare number input — drag (or tap) anywhere on the
 * ring to set minutes, one full revolution mapped to `max`. A plain
 * controlled component (value/onChange/max only, no data-fetching) so it
 * drops into TaskDetailDrawer.tsx and TodayPage.tsx's LogTimeDialog/
 * LogTimeCard unchanged in meaning. The center label doubles as a
 * direct-entry fallback (tap "Type a number instead") for durations outside
 * the dial's convenient range.
 */
export function DurationPicker({ value, onChange, max = 120 }: DurationPickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const clamped = Math.max(0, Math.min(value, max));
  const angle = (clamped / max) * 360;
  const handlePos = pointOnCircle(angle, RADIUS);

  function updateFromPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const deg = angleFromPoint(cx, cy, clientX, clientY);
    const raw = Math.round((deg / 360) * max / SNAP_MINUTES) * SNAP_MINUTES;
    const minutes = Math.max(0, Math.min(raw, max));
    if (minutes !== clamped) onChange(minutes);
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    updateFromPoint(e.clientX, e.clientY);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <input
          autoFocus
          type="number"
          min={0}
          max={1440}
          className="w-24 rounded-lg border border-hairline bg-card px-2 py-1.5 text-center text-lg font-semibold outline-none focus:border-brand-400"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const n = draft === "" ? 0 : Number(draft);
            if (!Number.isNaN(n)) onChange(Math.max(0, n));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="text-xs text-ink-400">minutes</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        className="touch-none cursor-pointer select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-hairline)" strokeWidth={STROKE} />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / max)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <circle cx={handlePos.x} cy={handlePos.y} r={STROKE / 2 + 3} fill="var(--color-brand-600)" stroke="white" strokeWidth={2} />
        <text x={CENTER} y={CENTER - 2} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-ink-900)">
          {clamped}
        </text>
        <text x={CENTER} y={CENTER + 18} textAnchor="middle" fontSize="11" fill="var(--color-ink-400)">
          min
        </text>
      </svg>
      <button
        type="button"
        className="text-xs font-medium text-brand-600 hover:underline"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
      >
        Type a number instead
      </button>
    </div>
  );
}

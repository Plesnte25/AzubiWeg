import type { CSSProperties } from "react";
import { Check } from "@phosphor-icons/react";

/**
 * Bento checkbox (README §1.6; dashboard route rows): square 24px radius 8 (or 22px radius 7 with `small`),
 * 2.5px outline, checked = mint fill + check icon, optionally tilted −6° when checked (dashboard). `circle` is the
 * station-task variant. `accent` fills an unchecked box (Plan: the first open ticket task gets a lemon box).
 *
 * A real button so it's keyboard-reachable; the row around it stays a separate click target where the handoff
 * splits "checkbox toggles, text opens" (Plan ticket).
 */
export function Checkbox({
  checked,
  onChange,
  label,
  small = false,
  circle = false,
  tiltWhenChecked = false,
  accent,
  style,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name, e.g. the task title. */
  label: string;
  small?: boolean;
  circle?: boolean;
  tiltWhenChecked?: boolean;
  accent?: string;
  style?: CSSProperties;
}) {
  const size = small ? 22 : 24;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="flex shrink-0 cursor-pointer items-center justify-center p-0"
      style={{
        width: size,
        height: size,
        borderRadius: circle ? "50%" : small ? 7 : 8,
        border: "2.5px solid var(--line)",
        background: checked ? "var(--mint)" : (accent ?? "transparent"),
        color: "var(--onTile)",
        boxSizing: "border-box",
        transform: checked && tiltWhenChecked ? "rotate(-6deg)" : "none",
        transition: "all .15s",
        ...style,
      }}
    >
      {checked && <Check size={small ? 12 : 13} weight="bold" aria-hidden="true" />}
    </button>
  );
}

import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Tape strip (handoff README §1.4): absolute, `top:-12px`, 74–96 × 22–24px, `var(--tape)`, rotated −3° to −4°,
 * radius 3. Place inside a `position: relative` parent (Tile already is).
 */
export function Tape({
  left = "40%",
  width = 86,
  height = 24,
  tilt = -4,
  style,
}: {
  left?: number | string;
  width?: number;
  height?: number;
  tilt?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        top: -12,
        left,
        width,
        height,
        background: "var(--tape)",
        transform: `rotate(${tilt}deg)`,
        borderRadius: 3,
        ...style,
      }}
    />
  );
}

type TileProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: ElementType;
  children?: ReactNode;
  /** CSS colour for the tile body; default `var(--plain)`. Text colour follows: `--plainText` on plain/plain2,
   * `--onTile` on every coloured tile (README §1.2 contrast rule). */
  bg?: string;
  /** Fixed decorative tilt in degrees (README: each tile −1.2° to +1°, values are in the source). */
  tilt?: number;
  radius?: number | string;
  /** Hard offset shadow size in px: tiles 5, hero/featured 6. */
  shadow?: number;
  /** Hover lift (dashboard tiles): rotate(0) translate(-2px,-2px) and a bigger shadow — true = 9px, or a number. */
  lift?: boolean | number;
  /** Adds a Tape strip on top; pass props to position it. */
  tape?: boolean | Parameters<typeof Tape>[0];
};

const PLAIN_BGS = new Set(["var(--plain)", "var(--plain2)"]);

/** The Bento tile: 2.5px ink outline, hard shadow, fixed tilt, optional hover lift and tape. Layout (grid-area,
 * padding, flex) comes from `className`/`style` at the call site. */
export function Tile({
  as: As = "section",
  bg = "var(--plain)",
  tilt = 0,
  radius = 24,
  shadow = 5,
  lift,
  tape,
  className,
  style,
  children,
  ...rest
}: TileProps) {
  const liftPx = lift === true ? 9 : typeof lift === "number" ? lift : null;
  return (
    <As
      {...rest}
      className={cn("relative box-border min-h-0 min-w-0", liftPx !== null ? "lift" : "tilt", className)}
      style={
        {
          background: bg,
          color: PLAIN_BGS.has(bg) ? "var(--plainText)" : "var(--onTile)",
          border: "2.5px solid var(--line)",
          borderRadius: radius,
          boxShadow: `${shadow}px ${shadow}px 0 var(--shadow)`,
          "--tilt": `${tilt}deg`,
          ...(liftPx !== null ? { "--lift": `${liftPx}px` } : {}),
          ...style,
        } as CSSProperties
      }
    >
      {tape && <Tape {...(tape === true ? {} : tape)} />}
      {children}
    </As>
  );
}

/** Eyebrow label (README §1.3): 12px/700, letter-spacing .1em, uppercase. */
export function Eyebrow({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("uppercase", className)}
      style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", ...style }}
    >
      {children}
    </span>
  );
}

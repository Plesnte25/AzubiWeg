import type { CSSProperties, ReactNode } from "react";

/** 18-point starburst polygon, literal from AzubiPlanJourney/AzubiStats. */
const STARBURST =
  "polygon(50% 0%, 61% 18%, 82% 10%, 80% 32%, 100% 40%, 85% 56%, 96% 76%, 74% 78%, 68% 100%, 50% 86%, 32% 100%, 26% 78%, 4% 76%, 15% 56%, 0% 40%, 20% 32%, 18% 10%, 39% 18%)";

/**
 * Starburst sticker (Plan gate, Stats B1; README §1.4): lemon clip-path star with a hard drop-shadow filter (a
 * box-shadow would be clipped away by clip-path, hence the filter on a wrapper). `size` is in px; callers pass
 * `calc(var(--k) * Npx)` strings to scale with the page.
 */
export function Starburst({
  size = 100,
  tilt = -10,
  shadow = 4,
  bg = "var(--lemon)",
  children,
  style,
}: {
  size?: number | string;
  tilt?: number;
  shadow?: number;
  bg?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="shrink-0"
      style={{
        filter: `drop-shadow(${shadow}px ${shadow}px 0 var(--shadow))`,
        transform: `rotate(${tilt}deg)`,
        ...style,
      }}
    >
      <div
        className="flex items-center justify-center text-center"
        style={{ width: size, height: size, background: bg, color: "var(--onTile)", clipPath: STARBURST }}
      >
        {children}
      </div>
    </div>
  );
}

/** "DU" sticker, "you are here" (README §1.4): pink circle 44–54px, 2.5px outline, 3px shadow, rotated ±12°. */
export function DuSticker({ size = 48, tilt = -12, style }: { size?: number; tilt?: number; style?: CSSProperties }) {
  return (
    <div
      aria-label="You are here"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "var(--pink)",
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        boxShadow: "3px 3px 0 var(--shadow)",
        transform: `rotate(${tilt}deg)`,
        fontSize: size >= 50 ? 14 : 13,
        fontWeight: 700,
        boxSizing: "border-box",
        ...style,
      }}
    >
      DU
    </div>
  );
}

/** Round text sticker ("fällig!", "wackel!", "+23"): a small rotated disc in a tile corner. */
export function RoundSticker({
  children,
  size = 64,
  tilt = 10,
  bg = "var(--plain)",
  style,
}: {
  children: ReactNode;
  size?: number;
  tilt?: number;
  bg?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-center"
      style={{
        width: size,
        height: size,
        background: bg,
        color: bg === "var(--plain)" ? "var(--plainText)" : "var(--onTile)",
        border: "2.5px solid var(--line)",
        boxShadow: "3px 3px 0 var(--shadow)",
        transform: `rotate(${tilt}deg)`,
        fontWeight: 700,
        lineHeight: 1,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

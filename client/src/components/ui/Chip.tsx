import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  selected?: boolean;
  /** Idle background; default `var(--plain)`. Selected always uses `--sel`/`--selText` (README §1.2: visible on
   * coloured tiles in dark mode too). */
  bg?: string;
  /** Tilt while selected, degrees (README: −1.5° to −2°). */
  selectedTilt?: number;
  size?: "sm" | "md";
  icon?: ReactNode;
};

/**
 * Filter/category chip (Words filters: 36h, padding 0 13px, 14/700; selected: sel fill, −2°, 2px shadow). The `sm`
 * size (30h, 13px) is for chip rows inside tiles and modals.
 */
export function Chip({
  selected = false,
  bg = "var(--plain)",
  selectedTilt = -2,
  size = "md",
  icon,
  className,
  style,
  children,
  type = "button",
  ...rest
}: ChipProps) {
  const isPlain = bg === "var(--plain)" || bg === "var(--plain2)";
  return (
    <button
      type={type}
      aria-pressed={selected}
      {...rest}
      className={cn("tilt inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap", className)}
      style={
        {
          height: size === "md" ? 36 : 30,
          padding: size === "md" ? "0 13px" : "0 11px",
          borderRadius: 999,
          border: `${size === "md" ? 2.5 : 2}px solid var(--line)`,
          background: selected ? "var(--sel)" : bg,
          color: selected ? "var(--selText)" : isPlain ? "var(--plainText)" : "var(--onTile)",
          fontSize: size === "md" ? 14 : 13,
          fontWeight: 700,
          boxSizing: "border-box",
          boxShadow: selected ? "2px 2px 0 var(--shadow)" : "none",
          "--tilt": selected ? `${selectedTilt}deg` : "0deg",
          transition: "background .15s, transform .15s",
          ...style,
        } as CSSProperties
      }
    >
      {icon}
      {children}
    </button>
  );
}

/** Article/gender chip (der/die/das/verb; README §1.2 gender map), rotated −3°. `big` is the detail-tile size. */
export const GENDER_COLORS: Record<string, string> = {
  der: "var(--sky)",
  die: "var(--pink)",
  das: "var(--mint)",
  verb: "var(--lilac)",
};

export function ArticleChip({
  article,
  big = false,
  style,
}: {
  article: string;
  big?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      lang="de"
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        alignSelf: big ? "flex-start" : "center",
        minWidth: big ? 0 : 42,
        height: big ? 30 : 28,
        padding: "0 9px",
        borderRadius: 8,
        border: "2.5px solid var(--line)",
        background: GENDER_COLORS[article] ?? "var(--plain2)",
        color: "var(--onTile)",
        fontSize: big ? 15 : 13,
        fontWeight: 700,
        boxSizing: "border-box",
        transform: "rotate(-3deg)",
        ...style,
      }}
    >
      {article}
    </span>
  );
}

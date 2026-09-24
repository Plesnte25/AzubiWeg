import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = `--btn` fill + 3px shadow (presses in); secondary = plain pill; dashed = disabled-looking/secondary
   * affordance (README: "dashed = locked, future, empty or secondary"). */
  variant?: "primary" | "secondary" | "dashed";
  /** 46 = modal footer / primary actions (README §10 touch target), 40 = in-tile buttons. */
  height?: number;
  icon?: ReactNode;
};

/** The Bento pill button: 2.5px outline, radius 999, 15/700. */
export function PillButton({
  variant = "primary",
  height = 46,
  icon,
  className,
  style,
  children,
  type = "button",
  disabled,
  ...rest
}: PillButtonProps) {
  const base: CSSProperties = {
    height,
    padding: "0 16px",
    borderRadius: 999,
    border: "2.5px solid var(--line)",
    fontWeight: 700,
    fontSize: height >= 46 ? 15 : 14,
    boxSizing: "border-box",
  };
  const byVariant: Record<string, CSSProperties> = {
    primary: { background: "var(--btn)", color: "var(--btnText)", boxShadow: "3px 3px 0 var(--shadow)" },
    secondary: { background: "var(--plain)", color: "var(--plainText)" },
    dashed: { background: "transparent", color: "inherit", border: "2.5px dashed var(--line)", opacity: 0.7 },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        variant === "primary" && !disabled && "press",
        className,
      )}
      style={{ ...base, ...byVariant[disabled ? "dashed" : variant], ...style }}
    >
      {icon}
      {children}
    </button>
  );
}

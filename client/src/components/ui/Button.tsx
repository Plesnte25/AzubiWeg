import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";
type Shape = "rect" | "circle";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand",
  secondary: "bg-ink-50 text-ink-900 hover:bg-hairline",
  outline: "border border-hairline bg-card text-ink-900 hover:border-brand-400",
  ghost: "text-ink-600 hover:bg-paper hover:text-ink-900",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-body gap-1.5",
  md: "h-9 px-4 text-body gap-2",
  lg: "h-11 px-5 text-body-lg gap-2",
  icon: "size-9 p-0",
};

// shape="circle" kills the repeated raw-<button> circular-icon-button markup
// (`grid size-9 shrink-0 place-items-center rounded-full border ...`) that
// was hand-rolled independently in Vocabulary/TodayPage/RoadmapPage/
// SyllabusPage — same diameters as sizeClasses' heights, just square + full-round.
const circleSizeClasses: Record<Size, string> = {
  sm: "size-8 p-0",
  md: "size-9 p-0",
  lg: "size-11 p-0",
  icon: "size-9 p-0",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  shape = "rect",
  className,
}: { variant?: Variant; size?: Size; shape?: Shape; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    shape === "circle" ? "rounded-full" : "rounded-md",
    variantClasses[variant],
    // filled variants get a press-darken on top of the global active:scale-[0.98]
    // (index.css) so the press reads on color too, not just via the scale
    (variant === "primary" || variant === "danger") && "active:brightness-95",
    shape === "circle" ? circleSizeClasses[size] : sizeClasses[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shape?: Shape;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  shape = "rect",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, shape, className })} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

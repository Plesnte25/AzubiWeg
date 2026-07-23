import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const variantClasses = {
  neutral: "border-hairline bg-ink-50 text-ink-600",
  brand: "border-brand-100 bg-brand-50 text-brand-700",
  success: "border-ok-100 bg-ok-50 text-ok-700",
  danger: "border-danger-100 bg-danger-50 text-danger-700",
  warning: "border-warning-100 bg-warning-50 text-warning-600",
  info: "border-info-100 bg-info-50 text-info-700",
};

const sizeClasses = { sm: "px-2 py-0.5 text-xs", md: "px-2.5 py-1 text-sm" };

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export function Badge({ variant = "neutral", size = "sm", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

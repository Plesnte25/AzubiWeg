import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  /** Elevation level — pick one signal per surface, never both.
   * 1 (default): top-level grouped container — border, no shadow.
   * 2: things that lift — hover states, the dragged kanban card, the active
   *    accordion panel, a "Continue" hero — shadow-md, no border.
   * 3: modals/sheets/popovers/the FAB dock — shadow-lg, no border. */
  level?: 1 | 2 | 3;
  /** Level 1 → level 2 look on hover (a 2px lift, not more — more reads as a toy). */
  interactive?: boolean;
}

const paddingClasses = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };
const levelClasses: Record<1 | 2 | 3, string> = {
  1: "border border-hairline",
  2: "shadow-md",
  3: "shadow-lg",
};

function CardRoot({ padding = "md", level = 1, interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card",
        levelClasses[level],
        paddingClasses[padding],
        interactive && "transition-[box-shadow,transform] duration-150 hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex flex-wrap items-baseline justify-between gap-2", className)} {...props} />;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-body font-medium text-ink-600", className)} {...props} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-caption text-ink-400", className)} {...props} />;
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
});

import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
  interactive?: boolean;
}

const paddingClasses = { sm: "p-3", md: "p-4", lg: "p-6" };

function CardRoot({ padding = "md", interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-hairline bg-card",
        paddingClasses[padding],
        interactive && "transition-shadow hover:shadow-md",
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
  return <h2 className={cn("text-sm font-medium text-ink-600", className)} {...props} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-ink-400", className)} {...props} />;
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
});

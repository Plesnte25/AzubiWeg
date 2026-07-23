import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-hairline)_25%,var(--color-ink-50)_37%,var(--color-hairline)_63%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-card p-4", className)}>
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

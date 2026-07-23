import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-card p-8 text-center", className)}>
      <Icon className="mb-1 size-6 text-ink-400" aria-hidden="true" />
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

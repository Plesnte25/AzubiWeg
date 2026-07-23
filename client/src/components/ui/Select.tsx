import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
}

export function Select({ label, id, className, children, ...props }: SelectProps) {
  const field = (
    <select
      id={id}
      className={cn(
        "rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) return field;

  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <div className="mt-1">{field}</div>
    </label>
  );
}

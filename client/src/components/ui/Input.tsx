import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const field = (
    <input
      id={id}
      className={cn(
        "w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-400",
        error ? "border-danger-600 focus:border-danger-600" : "border-hairline focus:border-brand-400",
        className,
      )}
      aria-invalid={error ? true : props["aria-invalid"]}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <div className="mt-1">{field}</div>
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </label>
  );
}

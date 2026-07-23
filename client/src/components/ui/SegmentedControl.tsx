import { cn } from "../../lib/cn";

interface SegmentedControlProps<T extends string> {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn("inline-flex gap-1 rounded-full border border-hairline bg-card p-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            value === opt.key ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper hover:text-ink-900",
          )}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

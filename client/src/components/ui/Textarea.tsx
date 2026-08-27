import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "bordered" | "ghost";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** "bordered" — a standard form textarea (rounded, border-hairline, bg-card),
   * matching Input.tsx's own focus treatment (border-color shift, no ring).
   * "ghost" — the borderless, soft-filled composer style already established
   * for note-taking (NotesComposer, TaskDetailDrawer's journal field): no
   * border, sits in its own bg-paper box, and shifts to bg-hairline-soft on
   * focus-within — a deliberately quiet affordance, not a colored ring. */
  variant?: Variant;
  error?: string;
  /** Ghost variant only — rendered inside the same soft box, below the
   * textarea (e.g. an attach-file trigger row). Ignored for "bordered". */
  footer?: ReactNode;
}

export function Textarea({ variant = "bordered", error, footer, className, ...props }: TextareaProps) {
  if (variant === "ghost") {
    return (
      <div className="rounded-md bg-paper p-2.5 transition-colors focus-within:bg-hairline-soft">
        <textarea
          className={cn("w-full resize-none border-0 bg-transparent text-body outline-none placeholder:text-ink-400", className)}
          aria-invalid={error ? true : props["aria-invalid"]}
          {...props}
        />
        {footer && <div className="mt-1.5">{footer}</div>}
      </div>
    );
  }

  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border bg-card px-3 py-2 text-body outline-none transition-colors placeholder:text-ink-400",
        error ? "border-danger-600 focus:border-danger-600" : "border-hairline focus:border-brand-400",
        className,
      )}
      aria-invalid={error ? true : props["aria-invalid"]}
      {...props}
    />
  );
}

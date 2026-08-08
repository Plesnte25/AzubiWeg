import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface ModalProps {
  title: string;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  /** This modal has an sm/md-specific replacement elsewhere (e.g. a bottom
   * sheet) — stay mounted (for shared trigger state) but only render visibly
   * at lg. See client/src/pages/vocabulary/AnalyticsSheet.tsx. */
  desktopOnly?: boolean;
  /** Below md, render as a full-screen takeover (no backdrop, no rounded
   * corners) instead of a centered dialog — the standard shape for
   * add/edit forms on a phone. Unaffected at md and up, where this behaves
   * exactly like the default centered-dialog-with-backdrop. Mutually
   * exclusive with desktopOnly (that's for a different pattern — a wholly
   * separate sibling component handling sm/md, e.g. a bottom sheet). */
  sheetOnSm?: boolean;
  children: ReactNode;
}

const SIZE_CLASSES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-5xl" };
// Tailwind's scanner needs each full class string literally present in
// source — can't build "md:" + SIZE_CLASSES[size] at runtime and expect it
// to be picked up, hence this parallel static map instead of a template.
const MD_SIZE_CLASSES = { sm: "md:max-w-md", md: "md:max-w-lg", lg: "md:max-w-2xl", xl: "md:max-w-5xl" };

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, size = "md", desktopOnly, sheetOnSm, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={
        desktopOnly
          ? "fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:py-12 lg:flex"
          : sheetOnSm
            ? "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card md:flex-row md:items-start md:justify-center md:bg-ink-900/40 md:p-4 md:py-12"
            : "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:py-12"
      }
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={
          sheetOnSm
            ? cn(
                // min-h-full (not min-h-screen): grows with content past one
                // viewport instead of clipping, still fills at least the screen.
                "flex min-h-full w-full min-w-0 flex-col bg-card p-5 outline-none",
                "md:min-h-0 md:animate-scale-in md:rounded-xl md:border md:border-hairline md:shadow-xl",
                MD_SIZE_CLASSES[size],
              )
            : cn(
                // min-w-0: flex items default to min-width:auto, which lets a
                // wide-min-content child (a long unbreakable string, an unwrapped
                // form control) force this box past its own max-width instead of
                // shrinking/wrapping internally — override that default.
                "animate-scale-in w-full min-w-0 rounded-xl border border-hairline bg-card p-5 shadow-xl outline-none",
                SIZE_CLASSES[size],
              )
        }
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-ink-400 hover:text-ink-900" onClick={onClose} title="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

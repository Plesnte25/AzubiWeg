import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Headerless bottom sheet — drag-handle bar, scrim, slide-up transform.
 * Styling ported exactly from the handoff's taskScrim/taskSheet (German
 * Companion App.dc.html): distinct from `Modal`'s centered-dialog/
 * sheet-on-sm pattern, this is a dedicated bottom-sheet primitive used
 * across many of the handoff's screens (task detail, exam schedule,
 * profile, add-word, ...) at every breakpoint, not just below md.
 */
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: "rgba(15,17,25,.62)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-[18px] pt-3 pb-[calc(34px+env(safe-area-inset-bottom))] transition-transform duration-400"
        style={{
          borderRadius: "20px 20px 0 0",
          background: "linear-gradient(180deg,#232532 0%,#1c1f2c 100%)",
          boxShadow: "0 0 0 1px #3f424d, 0 -18px 44px rgba(0,0,0,.5)",
          transform: open ? "translateY(0)" : "translateY(104%)",
          transitionTimingFunction: "cubic-bezier(.2,.85,.25,1)",
        }}
      >
        <div className="mx-auto mb-[15px] h-1 w-10 rounded-full" style={{ background: "rgba(233,233,237,.18)" }} />
        {children}
      </div>
    </>,
    document.body,
  );
}

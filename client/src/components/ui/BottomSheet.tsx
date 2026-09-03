import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

/** True at md+ (768px) — the breakpoint BottomSheet switches from a
 * slide-up mobile sheet to a centered desktop dialog at. A plain
 * matchMedia hook rather than a CSS-only responsive split: BottomSheet's
 * children carry real state/refs from the caller (e.g. AddWordsDialog's
 * focus-on-open textarea), so rendering `children` twice — once per
 * breakpoint block, the pattern the rest of this app uses for responsive
 * differences — would mount two independent copies fighting over the same
 * ref. One wrapper, styled differently per breakpoint, avoids that. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

/**
 * Bottom sheet below md (drag-handle bar, scrim, slide-up transform —
 * styling ported exactly from the handoff's taskScrim/taskSheet, German
 * Companion App.dc.html); a centered dialog at md+, where a slide-up-from-
 * the-bottom sheet is a phone pattern, not a desktop one — distinct from
 * `Modal`'s own centered-dialog/sheet-on-sm split, this is the dedicated
 * primitive used across most of the handoff's screens (task detail, exam
 * schedule, profile, add-word, ...) at every breakpoint.
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
  const isDesktop = useIsDesktop();

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
        className={cn(
          "fixed z-50 w-full max-w-md px-[18px] transition-[transform,opacity] duration-400",
          isDesktop
            ? "inset-0 m-auto h-fit max-h-[85vh] overflow-y-auto rounded-[20px] py-6"
            : "inset-x-0 bottom-0 mx-auto rounded-t-[20px] pt-3 pb-[calc(34px+env(safe-area-inset-bottom))]",
        )}
        style={{
          background: "linear-gradient(180deg,#232532 0%,#1c1f2c 100%)",
          boxShadow: isDesktop ? "0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(233,233,237,.1)" : "0 0 0 1px #3f424d, 0 -18px 44px rgba(0,0,0,.5)",
          transform: isDesktop ? `scale(${open ? 1 : 0.96})` : `translateY(${open ? "0" : "104%"})`,
          opacity: isDesktop && !open ? 0 : 1,
          // Mobile's off-screen translateY naturally can't overlap anything
          // while closed; desktop's centered scale-down stays put and would
          // otherwise sit there invisible but still clickable-through, right
          // on top of whatever's underneath.
          pointerEvents: open ? "auto" : "none",
          transitionTimingFunction: "cubic-bezier(.2,.85,.25,1)",
        }}
      >
        {isDesktop ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4"
            style={{ color: "rgba(233,233,237,.5)" }}
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        ) : (
          <div className="mx-auto mb-[15px] h-1 w-10 rounded-full" style={{ background: "rgba(233,233,237,.18)" }} />
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}

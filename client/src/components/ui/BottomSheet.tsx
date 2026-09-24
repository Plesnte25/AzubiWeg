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
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

/**
 * Bento sheet/dialog (handoff README §1.6). Below md: a bottom sheet at `left/right/bottom: 6px`, radius 28,
 * padding 16, 5px hard shadow, no rotation, slides up. md+: a centred dialog in the Bento modal style (radius 28,
 * padding 24, 9px shadow, −0.6° tilt, scales in). Unlike `Modal`, this stays permanently mounted with an `open`
 * prop so its close transition plays and callers can reset form state on reopen (see AddWordsDialog.tsx). Content
 * brings its own header; the md+ close button sits top-right. Body colour defaults to `var(--plain)`.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  className,
  bg = "var(--plain)",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Overrides the default md+ width (`max-w-[560px]`) — merged via `cn()`, so a `max-w-*` class here wins. */
  className?: string;
  bg?: string;
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.();
    };
  }, [open, onClose]);

  const isPlain = bg === "var(--plain)" || bg === "var(--plain2)";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-300"
        style={{
          background: "var(--scrim)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          "no-scrollbar fixed z-[61] overflow-y-auto transition-[transform,opacity] duration-300",
          isDesktop
            ? "inset-0 m-auto h-fit max-h-[calc(100%-80px)] w-[calc(100%-32px)] max-w-[560px] p-6"
            : "inset-x-1.5 bottom-[calc(6px+env(safe-area-inset-bottom))] max-h-[88%] p-4",
          className,
        )}
        style={{
          background: bg,
          color: isPlain ? "var(--plainText)" : "var(--onTile)",
          border: "2.5px solid var(--line)",
          borderRadius: 28,
          boxSizing: "border-box",
          boxShadow: isDesktop ? "9px 9px 0 var(--shadow)" : "5px 5px 0 var(--shadow)",
          transform: isDesktop ? `scale(${open ? 1 : 0.96}) rotate(-0.6deg)` : `translateY(${open ? "0" : "110%"})`,
          opacity: isDesktop && !open ? 0 : 1,
          // Mobile's off-screen translateY can't overlap anything while closed; desktop's centred scale-down stays
          // put and would otherwise sit there invisible but still clickable, on top of whatever's underneath.
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
          transitionProperty: "transform, opacity, visibility",
          transitionTimingFunction: "cubic-bezier(.2,.85,.25,1)",
        }}
      >
        {isDesktop && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex cursor-pointer items-center justify-center p-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2.5px solid var(--line)",
              background: "var(--plain)",
              color: "var(--plainText)",
              boxShadow: "2px 2px 0 var(--shadow)",
            }}
          >
            <X size={15} weight="bold" aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}

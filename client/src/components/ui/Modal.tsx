import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import { useOverlay } from "../../lib/overlay";
import { Tape } from "./Tile";

interface ModalProps {
  /** Omitted for header-less dialogs (Stats drill: tag + close only) — pass `ariaLabel` then. */
  title?: ReactNode;
  onClose: () => void;
  /** Small rotated chip above the title ("Station 8 · Grammar"). */
  tag?: ReactNode;
  subtitle?: ReactNode;
  /** Body colour by context (README §1.6); default `var(--plain)`. */
  bg?: string;
  /** md+ width in px (README: 540–580, Plan Library 720). Overrides `size`. */
  width?: number;
  /** Footer row, usually a secondary PillButton (min-width 110) plus a primary one (flex 1). */
  footer?: ReactNode;
  /** Accessible name when `title` isn't plain text. */
  ariaLabel?: string;
  /** Legacy width steps from the pre-Bento Modal (sm 460 · md 560 · lg 720 · xl 960). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Legacy: render only at Tailwind lg+ because an sm/md replacement lives elsewhere (ApplicationDetailModal). */
  desktopOnly?: boolean;
  /** Replaces the tag/title/subtitle column (Notes editor: category chips). The close button stays. */
  header?: ReactNode;
  /** Sticky-note shape (Notes editor): its radius, a fixed md+ height and md+ tilt, and on sm a tall sheet from
   * `top: 70px`. */
  sticky?: { radius: string; height: number; tilt: number };
  /** Legacy no-op: every Bento modal is a bottom sheet below md. */
  sheetOnSm?: boolean;
  children: ReactNode;
}

const SIZE_WIDTH = { sm: 460, md: 560, lg: 720, xl: 960 };
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Bento modal (handoff README §1.6). md+: centred, `translate(-50%,-50%) rotate(-0.6deg)`, radius 28, padding 24,
 * 9px shadow, tape on top, max-height `calc(100% - 80px)`. sm: bottom sheet at `left/right/bottom: 6px`, max-height
 * 88%, padding 16, 5px shadow, no rotation. Header = tag chip + 30px title + 14px subtitle + 40px round close; the
 * body scrolls; optional footer. Closes on backdrop, close button, or Esc; traps Tab; returns focus to whatever was
 * focused when it opened. Mount it conditionally (`{open && <Modal …/>}`).
 */
export function Modal({
  title,
  onClose,
  tag,
  subtitle,
  bg = "var(--plain)",
  width,
  footer,
  ariaLabel,
  size = "md",
  desktopOnly,
  header,
  sticky,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { z, isTop } = useOverlay(true);
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (!isTopRef.current()) return;
      if (e.key === "Escape") {
        onCloseRef.current();
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
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.();
    };
  }, []);

  const isPlain = bg === "var(--plain)" || bg === "var(--plain2)";

  return createPortal(
    <div className={cn("fixed inset-0", desktopOnly && "hidden lg:block")} style={{ zIndex: z }}>
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col outline-none",
          "inset-x-1.5 bottom-1.5 gap-3.5 p-4 shadow-[5px_5px_0_var(--shadow)]",
          sticky ? "top-[70px] md:h-[var(--h)]" : "max-h-[88%]",
          "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100%-80px)] md:w-[var(--w)] md:max-w-[calc(100%-32px)] md:gap-4 md:p-6",
          "md:shadow-[9px_9px_0_var(--shadow)] md:[transform:translate(-50%,-50%)_rotate(var(--tilt))]",
        )}
        style={
          {
            "--w": `${width ?? SIZE_WIDTH[size]}px`,
            "--tilt": `${sticky?.tilt ?? -0.6}deg`,
            ...(sticky ? { "--h": `${sticky.height}px` } : {}),
            background: bg,
            color: isPlain ? "var(--plainText)" : "var(--onTile)",
            border: "2.5px solid var(--line)",
            borderRadius: sticky?.radius ?? 28,
            boxSizing: "border-box",
          } as React.CSSProperties
        }
      >
        <Tape left="40%" width={86} />
        <div className={cn("flex shrink-0 justify-between gap-3", title ? "items-start" : "items-center")}>
          {header ?? (
            <div className="flex min-w-0 flex-col gap-1.5">
              {tag && (
                <span
                  className="self-start"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    background: "var(--plain)",
                    color: "var(--plainText)",
                    border: "2px solid var(--line)",
                    borderRadius: 8,
                    padding: "2px 9px",
                    transform: "rotate(-3deg)",
                  }}
                >
                  {tag}
                </span>
              )}
              {title && (
                <h2
                  style={{
                    fontSize: "calc(var(--k, 1) * 30px)",
                    fontWeight: 700,
                    letterSpacing: "-.04em",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && <span style={{ fontSize: 14, fontWeight: 600 }}>{subtitle}</span>}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex shrink-0 cursor-pointer items-center justify-center p-0"
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
        </div>
        <div
          className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain"
          style={{ padding: "2px 4px 4px 2px" }}
        >
          {children}
        </div>
        {footer && <div className="flex shrink-0 gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

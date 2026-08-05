import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Wheel + drag panning for a collapsed shelf row. React's onWheel is
 * passive, so this attaches native listeners directly to the row element —
 * see design_handoff_azubiweg_vocabulary/README.md §6. scroll-behavior:smooth
 * / behavior:'smooth' are no-ops in the target webview, so glideBy() animates
 * scrollLeft manually with requestAnimationFrame instead.
 */
export function useShelfPan(rowRef: RefObject<HTMLDivElement | null>) {
  const draggedRef = useRef(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (!el) return;
      // Only hijack genuinely horizontal input (trackpad swipe, shift+wheel)
      // into shelf-panning — a normal vertical mouse-wheel tick must bubble
      // straight to the page, or scrolling past a shelf feels "stuck."
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaX;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      // don't preventDefault at either end, so the page keeps scrolling past a shelf
      if (!atStart && !atEnd) e.preventDefault();
    }

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId: number | null = null;

    function onPointerDown(e: PointerEvent) {
      if (!el) return;
      // Touch already gets native scrolling (both the row's own
      // overflow-x-auto and the page's vertical scroll) — this drag-to-pan
      // affordance is mouse-only. Letting it run for touch pointers too
      // means a finger that drifts even slightly horizontally during a
      // vertical swipe crosses the drag threshold below and setPointerCapture
      // hijacks the gesture from the browser's native touch-scroll.
      if (e.pointerType === "touch") return;
      dragging = true;
      draggedRef.current = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      pointerId = e.pointerId;
      el.style.cursor = "grabbing";
      // Pointer capture is deferred to the drag threshold below, not set
      // here — capturing immediately on pointerdown can reroute the
      // synthesized "click" away from whatever's under the cursor (a
      // WordCard), silently breaking click-to-flip on a plain tap.
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging || !el) return;
      const dx = e.clientX - startX;
      if (!draggedRef.current && Math.abs(dx) > 3) {
        draggedRef.current = true;
        if (pointerId !== null) el.setPointerCapture(pointerId);
      }
      if (draggedRef.current) el.scrollLeft = startScroll - dx;
    }
    function onPointerUp(e: PointerEvent) {
      if (!el) return;
      dragging = false;
      pointerId = null;
      el.style.cursor = "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture was never set for a plain click — nothing to release
      }
    }

    el.style.cursor = "grab";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [rowRef]);

  const glideBy = useCallback(
    (delta: number) => {
      const el = rowRef.current;
      if (!el) return;
      glideScrollLeft(el, Math.max(0, Math.min(el.scrollLeft + delta, el.scrollWidth - el.clientWidth)));
    },
    [rowRef],
  );

  return { draggedRef, glideBy };
}

/** Manual rAF scrollLeft animation — scroll-behavior:smooth is a no-op in the target webview. */
export function glideScrollLeft(el: HTMLElement, target: number, duration = 320) {
  const start = el.scrollLeft;
  const distance = target - start;
  if (distance === 0) return;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.scrollLeft = start + distance * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Manual rAF scrollTop animation for the page — same no-smooth-scroll constraint as above. */
export function glidePageTo(target: number, duration = 320) {
  const start = window.scrollY;
  const distance = target - start;
  if (distance === 0) return;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - (1 - t) ** 3;
    window.scrollTo(0, start + distance * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

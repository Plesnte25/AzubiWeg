import { useEffect, useRef, useState } from "react";

/** Animates a numeric value transition via rAF, ease-out, ~400ms — fires
 * only when the value actually *changes*, never on mount (a count-up on
 * every page load is noise, not polish). Returns a float; round it for
 * display. */
export function useAnimatedNumber(value: number, durationMs = 400): number {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = value;
      setDisplay(value);
      return;
    }
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

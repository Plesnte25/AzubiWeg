import { useEffect, useState } from "react";

/** Bento breakpoints (README §1.1): sm < 768 <= md < 1200 <= lg. */
export type Breakpoint = "sm" | "md" | "lg";

const MD = "(min-width: 768px)";
const LG = "(min-width: 1200px)";
/** lg AND tall enough for the no-page-scroll grid — the same condition as index.css's `lgfill:` variant. */
const FILL = "(min-width: 1200px) and (min-height: 820px)";

function read(): { bp: Breakpoint; fill: boolean } {
  const m = (q: string) => window.matchMedia(q).matches;
  return { bp: m(LG) ? "lg" : m(MD) ? "md" : "sm", fill: m(FILL) };
}

/**
 * The current Bento breakpoint plus whether the lg viewport-filling layout applies. For layouts that swap whole
 * grid templates per breakpoint (the prototypes compute them in JS too); plain responsive styling should keep using
 * Tailwind's `md:` / `blg:` / `lgfill:` variants.
 */
export function useBreakpoint(): { bp: Breakpoint; fill: boolean } {
  const [state, setState] = useState(read);
  useEffect(() => {
    const queries = [MD, LG, FILL].map((q) => window.matchMedia(q));
    const onChange = () => setState(read());
    for (const q of queries) q.addEventListener("change", onChange);
    return () => {
      for (const q of queries) q.removeEventListener("change", onChange);
    };
  }, []);
  return state;
}

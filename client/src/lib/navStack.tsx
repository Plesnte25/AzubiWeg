import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Back-stack push-navigation model — a faithful port of the handoff's own
 * reference implementation (German Companion App.dc.html's go()/goBack()/
 * isTransient()/tabTo()), adapted from a single "screen" state string to
 * real React Router pathnames so deep-linking and the browser's native
 * back/forward still work (this layers ON TOP of React Router rather than
 * replacing it — see the class comment below).
 *
 * Ported rules, unchanged from the reference:
 * - push(path): if `path` is already somewhere in the stack, pop back to
 *   that entry instead of pushing a duplicate (the "Plan → Syllabus →
 *   Plan → Syllabus doesn't grow the stack" case). If the CURRENT path is
 *   transient, leaving it doesn't get recorded (you never navigate "back
 *   into" a review session). Otherwise, push the current path and move on.
 * - goBack(): pop the stack, skipping any transient entries or a stale
 *   duplicate of the current path, and navigate there — default to "/" if
 *   the stack empties.
 * - switchTab(path): selecting a bottom-tab destination resets the stack to
 *   empty — tabs are independent navigation roots, not part of each other's
 *   push history (matches tabTo() in the reference).
 */

// A path is transient if it starts with any of these — never a valid Back
// target, and Layout.tsx hides the tab bar/FAB while on one (distraction-
// free session chrome, matching the handoff). Extend as each transient
// screen is built (MCQ, fill-blank, note editor, ... land in later phases).
const TRANSIENT_PATH_PREFIXES: string[] = ["/review"];

// path prefix -> human label for the dynamic back button, e.g. "back to
// Words". Extend as pushed screens are added in later phases (Word Detail,
// Syllabus, Sources, Notes, Self-tests, ...). Longest-prefix-wins matching,
// same as ROUTE_LABELS below.
const ROUTE_LABELS: Record<string, string> = {
  "/": "Today",
  "/words": "Words",
  "/plan": "Plan",
  "/jobs": "Jobs",
  "/stats": "Stats",
};

// path prefix -> the FAB's context tag ("Link this note to /Jobs" etc.) —
// mirrors the reference's SECTION map exactly (home has no entry there
// either, i.e. no tag when capturing from Today). Extend as pushed screens
// are added.
const CONTEXT_TAGS: Record<string, string> = {
  "/words": "/Words",
  "/plan": "/Plan",
  "/jobs": "/Jobs",
  "/stats": "/Stats",
};

function longestPrefixMatch<T>(map: Record<string, T>, pathname: string): T | undefined {
  let best: string | null = null;
  for (const prefix of Object.keys(map)) {
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best.length)) {
      best = prefix;
    }
  }
  return best !== null ? map[best] : undefined;
}

export function isTransientPath(pathname: string): boolean {
  return TRANSIENT_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function labelForPath(pathname: string): string {
  return longestPrefixMatch(ROUTE_LABELS, pathname) ?? "Back";
}

export function contextTagForPath(pathname: string): string {
  return longestPrefixMatch(CONTEXT_TAGS, pathname) ?? "";
}

interface NavStackContextValue {
  /** In-app forward navigation (opening a pushed screen from a tab or
   * another pushed screen) — records history per the rules above. `state`
   * carries router location state (e.g. a curated word list for the review
   * session) without serializing it into the URL. */
  push: (path: string, options?: { state?: unknown }) => void;
  /** Resets the stack and navigates — for selecting a bottom-tab destination. */
  switchTab: (path: string) => void;
  /** Pops to the real previous screen (skipping transient/duplicate entries). */
  goBack: () => void;
  /** What goBack() will actually land on, right now — for the dynamic back label. */
  backLabel: string;
  /** The FAB's context tag for the CURRENT screen. */
  captureContext: string;
}

const NavStackContext = createContext<NavStackContextValue | null>(null);

function computeBackTarget(stack: string[], currentPath: string): string | null {
  const copy = [...stack];
  let prev = copy.pop();
  while (prev !== undefined && (isTransientPath(prev) || prev === currentPath)) prev = copy.pop();
  return prev ?? null;
}

export function NavStackProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  // a ref mirrors the state so push()/goBack() always read the latest stack
  // synchronously (avoids stale-closure bugs across rapid navigations),
  // while state exists purely to trigger a re-render for backLabel.
  const stackRef = useRef<string[]>([]);
  const [, forceRender] = useState(0);
  const setStack = useCallback((next: string[]) => {
    stackRef.current = next;
    forceRender((n) => n + 1);
  }, []);

  const push = useCallback(
    (path: string, options?: { state?: unknown }) => {
      const stack = stackRef.current;
      const current = location.pathname;
      const seenAt = stack.lastIndexOf(path);
      if (seenAt > -1) {
        setStack(stack.slice(0, seenAt));
      } else if (!isTransientPath(current)) {
        setStack([...stack, current]);
      }
      // else: leaving a transient screen — stack unchanged, don't record it
      navigate(path, { state: options?.state });
    },
    [location.pathname, navigate, setStack],
  );

  const switchTab = useCallback(
    (path: string) => {
      setStack([]);
      navigate(path);
    },
    [navigate, setStack],
  );

  const goBack = useCallback(() => {
    const stack = stackRef.current;
    const current = location.pathname;
    const copy = [...stack];
    let prev = copy.pop();
    while (prev !== undefined && (isTransientPath(prev) || prev === current)) prev = copy.pop();
    setStack(copy);
    navigate(prev ?? "/");
  }, [location.pathname, navigate, setStack]);

  const backLabel = useMemo(() => {
    const target = computeBackTarget(stackRef.current, location.pathname);
    return labelForPath(target ?? "/");
    // stackRef itself isn't reactive; re-derive whenever the render that
    // follows a setStack() call happens (forceRender's counter isn't read
    // here directly, but this hook re-runs on every provider render, which
    // setStack triggers) or the path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, stackRef.current]);

  const captureContext = contextTagForPath(location.pathname);

  const value = useMemo(
    () => ({ push, switchTab, goBack, backLabel, captureContext }),
    [push, switchTab, goBack, backLabel, captureContext],
  );

  return <NavStackContext.Provider value={value}>{children}</NavStackContext.Provider>;
}

export function useNavStack(): NavStackContextValue {
  const ctx = useContext(NavStackContext);
  if (!ctx) throw new Error("useNavStack must be used within a NavStackProvider");
  return ctx;
}

/** The FAB's "which screen was active when tapped" context, as a single
 * cross-cutting hook rather than per-screen logic (per the handoff's
 * explicit interaction note #7). */
export function useCaptureContext(): string {
  return useNavStack().captureContext;
}

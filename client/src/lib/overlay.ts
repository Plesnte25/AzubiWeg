import { useLayoutEffect, useRef, useState } from "react";
import { lockRoot } from "./inertRoot";

/**
 * Shared stack for every overlay (Modal, BottomSheet, CommandPalette). It does three jobs:
 * - z-order: each overlay that opens sits above the ones already open (a word sheet opening a details modal), instead
 *   of all of them fighting at one fixed z-index.
 * - Esc and Tab: only the topmost overlay reacts, so one Esc closes one dialog.
 * - Background scroll lock: the page behind can't scroll while any overlay is open. Setting `overflow: hidden` on
 *   <body> isn't enough. The document scrolls on <html>, and iOS Safari ignores overflow for touch scrolling, so the
 *   body is pinned with `position: fixed` at the current offset and the offset is restored when the last overlay
 *   closes.
 */
const BASE_Z = 60;
const stack: symbol[] = [];
let savedScrollY = 0;
let releaseRoot: (() => void) | null = null;

function lockPage() {
  savedScrollY = window.scrollY;
  const { documentElement: html, body } = document;
  html.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  releaseRoot = lockRoot();
}

function unlockPage() {
  const { documentElement: html, body } = document;
  html.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  window.scrollTo({ top: savedScrollY, behavior: "instant" });
  releaseRoot?.();
  releaseRoot = null;
}

/**
 * Registers an overlay while `open` is true. Returns the z-index for its outermost layer (a separate panel can use
 * `z + 1`) and an `isTop()` check for its key handlers.
 */
export function useOverlay(open: boolean): { z: number; isTop: () => boolean } {
  const id = useRef(Symbol("overlay")).current;
  const [z, setZ] = useState(BASE_Z);

  useLayoutEffect(() => {
    if (!open) return;
    if (stack.length === 0) lockPage();
    stack.push(id);
    setZ(BASE_Z + (stack.length - 1) * 2);
    return () => {
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0) unlockPage();
    };
  }, [open, id]);

  return { z, isTop: () => stack[stack.length - 1] === id };
}

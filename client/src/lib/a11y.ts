import type { KeyboardEvent } from "react";

/**
 * Spread onto a plain clickable <div> (a "row" styled with cursor-pointer,
 * not a real <button>) so it's keyboard-reachable -- role="button" + tabIndex
 * + Enter/Space activation, without touching an existing onClick.
 *
 * The e.target !== e.currentTarget guard matters: several of these rows nest
 * a real <button> (e.g. Dashboard's per-task "mark done" checkbox) that
 * already stopPropagation()s on click but not on keydown -- without this
 * guard, pressing Space on that inner button would also bubble up and
 * double-fire the row's own onClick.
 */
export function clickableRowProps(onClick: (() => void) | undefined) {
  if (!onClick) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}

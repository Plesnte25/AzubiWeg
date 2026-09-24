/**
 * While a dialog is open, the app behind it (#root) is made `inert`: no focus, no clicks, hidden from assistive
 * tech — what aria-modal promises but doesn't enforce. Dialogs portal into <body>, outside #root, so they stay live.
 * Reference-counted so stacked dialogs (a sheet opening a modal) don't un-inert the page early.
 */
let open = 0;

export function lockRoot(): () => void {
  const root = document.getElementById("root");
  open += 1;
  root?.setAttribute("inert", "");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    open -= 1;
    if (open === 0) root?.removeAttribute("inert");
  };
}

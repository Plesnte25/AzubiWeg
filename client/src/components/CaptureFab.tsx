import { PencilSimple } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { NAV_DESTINATIONS, isActivePath } from "../lib/navDestinations";
import { useCaptureContext, useNavStack } from "../lib/navStack";

/**
 * Floating quick-note capture button — present on all 5 tab screens (never
 * on a pushed/transient screen), docked bottom-right. Styling ported exactly
 * from the handoff's fabStyle (German Companion App.dc.html): 46x46,
 * absolute-positioned within the tab bar's reserved band, dark gradient
 * fill, accent-tinted border/icon.
 *
 * Pushes a fresh Note Editor pre-tagged with the current tab's context (or
 * no tag at all from Today, matching the handoff's SECTION map).
 */
export default function CaptureFab() {
  const location = useLocation();
  const { push } = useNavStack();
  const contextTag = useCaptureContext();
  const onTabScreen = NAV_DESTINATIONS.some((d) => isActivePath(d.to, d.end, location.pathname));

  if (!onTabScreen) return null;

  return (
    <button
      type="button"
      title="Capture a note"
      aria-label="Capture a note"
      onClick={() => push("/plan/notes/edit/new", { state: contextTag ? { contextTag } : undefined })}
      className="fixed right-[18px] bottom-[76px] z-40 grid size-[46px] place-items-center rounded-full border md:hidden"
      style={{
        background: "linear-gradient(160deg,#2f2b4a,#232532)",
        borderColor: "rgba(181,171,252,.45)",
        boxShadow: "0 10px 26px rgba(0,0,0,.45)",
        color: "#d2cefd",
      }}
    >
      <PencilSimple size={21} weight="regular" aria-hidden="true" />
    </button>
  );
}

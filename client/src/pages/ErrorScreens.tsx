import { useState, type ReactNode } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { ArrowClockwise, House } from "@phosphor-icons/react";
import { PillButton } from "../components/ui/PillButton";
import { Starburst } from "../components/ui/Sticker";
import { Tile } from "../components/ui/Tile";

/*
 * Not-found and crash screens (KNOWN_ISSUES #9), in the Sticker style: a starburst, a big line, and a way out.
 * NotFound is the router's catch-all inside the app frame; CrashScreen is the errorElement — for a page it renders
 * inside the frame (the nav still works), for a crash in the frame itself it stands alone.
 */

function Screen({ burst, bg, title, line, children }: { burst: string; bg: string; title: string; line: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ minHeight: "60vh", padding: 16 }}>
      <Tile bg={bg} tilt={-1} radius={28} shadow={6} lift={false} className="flex w-full flex-col items-start" style={{ maxWidth: 560, padding: "32px 28px 28px", gap: 14 }}>
        <Starburst size={92} tilt={-12} style={{ position: "absolute", top: -34, right: -18 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em" }}>{burst}</span>
        </Starburst>
        <h1 style={{ fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1, margin: 0, paddingRight: 56 }}>{title}</h1>
        <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, margin: 0 }}>{line}</p>
        <div className="flex flex-wrap" style={{ gap: 10, marginTop: 4 }}>
          {children}
        </div>
      </Tile>
    </div>
  );
}

export function NotFound() {
  const navigate = useNavigate();
  return (
    <Screen burst="404" bg="var(--sky)" title="This page wandered off." line="The link may be old, or the address has a typo. Nothing's lost — pick up where you left off.">
      <PillButton height={44} icon={<House size={16} weight="fill" aria-hidden="true" />} onClick={() => navigate("/")}>
        Back to Today
      </PillButton>
      <PillButton height={44} variant="secondary" onClick={() => navigate(-1)}>
        Go back
      </PillButton>
    </Screen>
  );
}

/** A lazy page chunk that no longer exists — the tab was opened before a deploy. */
const isStaleChunk = (error: unknown) =>
  error instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(error.message);

export function CrashScreen() {
  const error = useRouteError();
  const [open, setOpen] = useState(false);
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  const stale = isStaleChunk(error);
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <Screen
      burst={stale ? "neu!" : "hoppla"}
      bg={stale ? "var(--mint)" : "var(--tomato)"}
      title={stale ? "A new version is out." : "Something broke on this page."}
      line={stale ? "AzubiWeg was updated while this tab was open. Reload to get the new version." : "Your data is safe — this is only the screen. Reload usually fixes it; if it keeps happening, the details below help."}
    >
      <PillButton height={44} icon={<ArrowClockwise size={16} weight="bold" aria-hidden="true" />} onClick={() => window.location.reload()}>
        Reload
      </PillButton>
      <PillButton height={44} variant="secondary" icon={<House size={16} weight="fill" aria-hidden="true" />} onClick={() => window.location.assign("/")}>
        Back to Today
      </PillButton>
      {!stale && (
        <div className="w-full">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="cursor-pointer border-0 bg-transparent p-0" style={{ color: "inherit", fontSize: 13, fontWeight: 700, textDecoration: "underline" }}>
            {open ? "Hide details" : "Show details"}
          </button>
          {open && (
            <pre style={{ marginTop: 8, padding: 10, border: "2px solid var(--line)", borderRadius: 10, background: "var(--plain)", color: "var(--plainText)", fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 160, overflow: "auto" }}>{detail}</pre>
          )}
        </div>
      )}
    </Screen>
  );
}

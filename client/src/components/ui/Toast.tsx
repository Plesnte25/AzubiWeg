import { useEffect, useState } from "react";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

// Module-level pub-sub, not a Context provider — `toast.error(...)` needs to be callable from anywhere (a mutation's
// onError, a plain event handler) without every caller being inside a provider tree. <Toaster/> (mounted once, see
// main.tsx) is the only subscriber. Bento shows ONE toast at a time for 2200ms (README §1.6): a new toast replaces
// the current one and restarts the timer.
let current: ToastItem | null = null;
let listeners: ((item: ToastItem | null) => void)[] = [];
let nextId = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l(current);
}

function push(message: string, tone: ToastTone) {
  current = { id: nextId++, message, tone };
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 2200);
}

export const toast = {
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
  info: (message: string) => push(message, "info"),
};

const TONE_ICON = { success: CheckCircle, error: WarningCircle, info: Info };

/**
 * Bento toast: bottom-centre `--btn` pill, 14/700, 4px shadow, rotated −1°. Below md it sits at `bottom: 90px` to
 * clear the sm bottom nav, else 28px. Errors use a warning icon on a tomato pill so they aren't mistaken for success.
 */
export function Toaster() {
  const [item, setItem] = useState<ToastItem | null>(current);

  useEffect(() => {
    listeners.push(setItem);
    return () => {
      listeners = listeners.filter((l) => l !== setItem);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(90px+env(safe-area-inset-bottom))] z-[100] flex justify-center px-4 md:bottom-7"
    >
      {item &&
        (() => {
          const Icon = TONE_ICON[item.tone];
          const isError = item.tone === "error";
          return (
            // The slide-up animation owns `transform` (fill-mode both), so the −1° tilt lives on an inner element.
            <div key={item.id} className="animate-slide-up max-w-full">
              <div
                role={isError ? "alert" : "status"}
                className="flex items-center gap-2"
                style={{
                  padding: "10px 16px",
                  background: isError ? "var(--tomato)" : "var(--btn)",
                  color: isError ? "var(--onTile)" : "var(--btnText)",
                  border: "2.5px solid var(--line)",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: "4px 4px 0 var(--shadow)",
                  transform: "rotate(-1deg)",
                }}
              >
                <Icon size={16} weight="fill" className="shrink-0" aria-hidden="true" />
                <span className="min-w-0">{item.message}</span>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

// module-level pub-sub, not a Context provider — `toast.error(...)` needs to
// be callable from anywhere (a mutation's onError, a plain event handler)
// without every caller needing to be inside a provider tree or hold a hook
// reference. <Toaster/> (mounted once, see main.tsx) is the only subscriber.
let items: ToastItem[] = [];
let listeners: ((items: ToastItem[]) => void)[] = [];
let nextId = 0;

function emit() {
  for (const l of listeners) l(items);
}

function push(message: string, tone: ToastTone) {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 4000);
}

export const toast = {
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
  info: (message: string) => push(message, "info"),
};

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};
const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-ok-600",
  error: "text-danger-600",
  info: "text-info-600",
};

/** Mount once near the app root (see main.tsx). Bottom-right on lg, top on
 * mobile (bottom-right on a small screen sits under a thumb / the FAB dock). */
export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((l) => l !== setList);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-auto lg:items-end">
      {list.map((t) => {
        const Icon = TONE_ICON[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="animate-slide-up pointer-events-auto flex items-center gap-2 rounded-lg bg-card px-3.5 py-2.5 text-body shadow-lg"
          >
            <Icon className={cn("size-4 shrink-0", TONE_CLASS[t.tone])} aria-hidden="true" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

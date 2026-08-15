import { useEffect } from "react";
import { Bug } from "lucide-react";
import { createPortal } from "react-dom";
import dictionaryIcon from "../../assets/icons/dictionary.webp";
import deadlineIcon from "../../assets/icons/deadline.webp";
import goodFeedbackIcon from "../../assets/icons/good-feedback.webp";
import type { Word } from "../../api/types";

interface AnalyticsSheetProps {
  words: Word[];
  onClose: () => void;
}

const MASTERED_INTERVAL_DAYS = 21;

/** sm/md Analytics — a bottom sheet sized to content (unlike `AccountSheet`,
 * this stays a sheet at md too, not a popover — the handoff describes one
 * unconditional bottom-sheet shape). 4 stat tiles + one segmented mastery
 * bar, all derived straight from the already-fetched `words` prop, no
 * extra `reviewStats`/`reviewHistory` queries needed. Every word is bucketed
 * into exactly one of 4 mutually-exclusive segments (leech takes priority,
 * since a word can otherwise belong to more than one of due/learning/
 * mastered simultaneously) so the bar's proportions always sum to 100%. */
export default function AnalyticsSheet({ words, onClose }: AnalyticsSheetProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const total = words.length || 1;
  const dueToday = words.filter((w) => w.state === "due").length;
  const mastered = words.filter((w) => !w.leech && w.srInterval !== null && w.srInterval >= MASTERED_INTERVAL_DAYS).length;
  const leeches = words.filter((w) => w.leech).length;
  const newCount = words.filter((w) => !w.leech && w.srDue === null).length;
  const learning = words.length - mastered - leeches - newCount;

  const segments = [
    { key: "mastered", label: "Mastered", count: mastered, color: "var(--color-ok-600)" },
    { key: "learning", label: "Learning", count: learning, color: "var(--color-info-600)" },
    { key: "new", label: "New", count: newCount, color: "var(--color-warning-600)" },
    { key: "leech", label: "Struggling", count: leeches, color: "var(--color-danger-600)" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 lg:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-slide-up fixed inset-x-0 bottom-0 rounded-t-[20px] border-t border-hairline bg-card px-[18px] pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3.5 shadow-xl md:px-7 md:pb-7 md:pt-4">
        <div className="mb-3 h-1 w-10 self-center rounded-full bg-hairline" style={{ margin: "0 auto" }} />

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {[
            { label: "Total words", value: words.length, icon: <img src={dictionaryIcon} alt="" className="size-5" /> },
            { label: "Due today", value: dueToday, icon: <img src={deadlineIcon} alt="" className="size-5" /> },
            { label: "Mastered", value: mastered, icon: <img src={goodFeedbackIcon} alt="" className="size-5" /> },
            { label: "Leeches", value: leeches, icon: <Bug className="size-5 text-danger-600" aria-hidden="true" /> },
          ].map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col items-center gap-1 rounded-xl border border-hairline bg-paper p-3 text-center shadow-xs md:p-3.5"
            >
              {tile.icon}
              <p className="text-lg font-semibold text-ink-900 md:text-xl">{tile.value}</p>
              <p className="text-[11px] text-ink-400 md:text-xs">{tile.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-3.5 overflow-hidden rounded-full bg-paper">
          {segments.map(
            (s) =>
              s.count > 0 && (
                <div key={s.key} style={{ flexGrow: s.count, flexBasis: 0, backgroundColor: s.color }} title={`${s.label}: ${s.count}`} />
              ),
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {segments.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-ink-600">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label} {Math.round((s.count / total) * 100)}%
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import type { Word } from "../../api/types";
import VocabTile from "./VocabTile";

interface ShelfGridOverlayProps {
  title: string;
  words: Word[];
  onClose: () => void;
}

/** "See all (N)" — a full-bleed overlay grid of every word in one shelf,
 * same flippable tiles, just more of them, not congested (2 cols sm, 4 cols
 * md, per the handoff). */
export default function ShelfGridOverlay({ title, words, onClose }: ShelfGridOverlayProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-paper lg:hidden">
      <div className="mb-3.5 flex shrink-0 items-center gap-3 px-[18px] pt-4 md:mb-4 md:gap-4 md:px-7 md:pt-5">
        <button className="grid size-8 place-items-center rounded-full hover:bg-paper" onClick={onClose} title="Back">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold text-ink-900 md:text-base">
          {title} <span className="font-normal text-ink-400">{words.length}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 place-items-center gap-2.5 overflow-y-auto px-[18px] pb-4 md:grid-cols-4 md:gap-3.5 md:px-7">
        {words.map((w) => (
          <VocabTile key={w.id} word={w} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

import { cn } from "../../lib/cn";

interface CarouselDotsProps {
  count: number;
  activeIndex: number;
  color?: string;
  className?: string;
}

/** Purely-visual row of position dots echoing the active item in a PillTabs
 * row — a carousel-style sense of place among N destinations/stages, shown
 * at sm only. Tapping a dot does nothing; the PillTabs row above it is the
 * real navigation control. */
export function CarouselDots({ count, activeIndex, color = "var(--color-brand-500)", className }: CarouselDotsProps) {
  return (
    <div className={cn("flex justify-center gap-[5px]", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-[5px] rounded-full transition-[width,background-color]"
          style={{
            width: i === activeIndex ? 16 : 5,
            backgroundColor: i === activeIndex ? color : "var(--color-hairline)",
          }}
        />
      ))}
    </div>
  );
}

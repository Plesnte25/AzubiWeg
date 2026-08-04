import type { SkillProgressDatum } from "../lib/skills";
import { mergeSkillProgress } from "../lib/skills";

/** sm/md-only stand-in for SkillPerformanceRadar's 5-axis chart — radar
 * charts don't scale down legibly at phone/tablet width, so the same 5
 * display-skill percentages render as plain labeled bars instead: stacked
 * rows on sm, 5 columns side by side on md. */
export default function LinearSkillBars({ skills }: { skills: SkillProgressDatum[] }) {
  const bars = mergeSkillProgress(skills);
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:gap-3">
      {bars.map((b) => (
        <div key={b.skill} className="md:flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-ink-600">{b.label}</span>
            <span className="font-semibold text-ink-900">{b.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-paper">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${b.percent}%`, backgroundColor: b.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

import type { RoadmapSkill } from "../api/types";

export interface SkillBarSegment {
  skill: RoadmapSkill;
  label: string;
  color: string;
  done: number;
  total: number;
}

/** Horizontal segmented bar — one track per skill, sized by that skill's task
 * total, inner fill by done/total. Legend row below (this widget keeps its
 * legend; it's not one of the library chart widgets). */
export default function SegmentedSkillBar({ segments }: { segments: SkillBarSegment[] }) {
  const withTasks = segments.filter((s) => s.total > 0);

  if (withTasks.length === 0) {
    return <p className="text-sm text-ink-600">No roadmap tasks scheduled this week yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {withTasks.map((s) => {
          const percent = Math.round((s.done / s.total) * 100);
          return (
            <div
              key={s.skill}
              className="h-3 overflow-hidden rounded-full bg-paper"
              style={{ flexGrow: s.total, flexBasis: 0 }}
              title={`${s.label}: ${s.done}/${s.total} done (${percent}%)`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${percent}%`, backgroundColor: s.color }}
              />
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {withTasks.map((s) => (
          <li key={s.skill} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-medium text-ink-900">{s.done}/{s.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

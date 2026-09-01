import { BookOpen, Cards, Keyboard, PencilSimple, SpeakerHigh, Target } from "@phosphor-icons/react";
import type { RoadmapSkill } from "../../api/types";
import { DISPLAY_SKILL_LABELS, mergeSkillProgress, type SkillProgressDatum } from "../../lib/skills";

const SKILL_ICONS: Partial<Record<RoadmapSkill, typeof Cards>> = {
  grammar: Keyboard,
  vocab: Cards,
  speaking: SpeakerHigh,
  reading: BookOpen,
  writing: PencilSimple,
};

/**
 * "Mastery by skill" — the handoff's sProgress list, fed by
 * mergeSkillProgress() (already shared with Dashboard's own skill
 * breakdown) rather than a new aggregation. `benchmarkPercent` is the real
 * pass threshold for the level currently gating progress (ExamStatus,
 * already fetched elsewhere with the same query key) — not the handoff's
 * hardcoded 70%. Per-skill deltas and the handoff's specific "two tandem
 * calls a week" advice line are dropped: no previous-period comparison is
 * fetched here, and coaching copy that specific isn't something to
 * hardcode as if it were personalized.
 */
export function SkillProgressGauges({
  bySkill,
  benchmarkPercent,
  benchmarkLevel,
}: {
  bySkill: SkillProgressDatum[];
  benchmarkPercent: number;
  benchmarkLevel: string;
}) {
  const merged = mergeSkillProgress(bySkill);
  const weakest = [...merged].sort((a, b) => a.percent - b.percent)[0];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
          Mastery by skill
        </div>
        <span className="text-[10px]" style={{ color: "rgba(233,233,237,.35)" }}>
          {benchmarkLevel} benchmark = {benchmarkPercent}%
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {merged.map((s) => {
          const Icon = SKILL_ICONS[s.skill] ?? Target;
          const above = s.percent >= benchmarkPercent;
          return (
            <div key={s.skill}>
              <div className="mb-1.5 flex items-center gap-[9px]">
                <Icon size={14} weight="regular" style={{ color: s.color, flexShrink: 0 }} aria-hidden="true" />
                <span className="flex-1 text-[13.5px]">{DISPLAY_SKILL_LABELS[s.skill]}</span>
                <span className="w-9 text-right text-[13.5px] font-medium" style={{ color: above ? "#b5abfc" : "#e4c4b6" }}>
                  {s.percent}%
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-[3px]" style={{ background: "#292b31" }}>
                <div
                  className="h-full rounded-[3px] transition-[width] duration-500"
                  style={{ width: `${s.percent}%`, background: above ? "#9184d9" : "#5d5294" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {weakest && (
        <div className="mt-3 flex items-start gap-2 text-[11.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.45)" }}>
          <Target size={13} weight="regular" style={{ color: "#e4c4b6", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          {DISPLAY_SKILL_LABELS[weakest.skill]} is your weakest area right now.
        </div>
      )}
    </div>
  );
}

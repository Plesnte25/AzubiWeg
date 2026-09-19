import { Star, Warning } from "@phosphor-icons/react";
import type { CefrLevel, Themenfeld, Word } from "../../api/types";
import { LEVEL_LABELS } from "../plan/Syllabus";
import { THEMENFELD_LABELS } from "../../lib/vocab";

const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];

/**
 * Word-level rollups (Phase 4) — leech/starred counts, themenfeld/CEFR-level
 * distribution, and kaikki-enrichment coverage all come from fields already
 * sitting on every Word object Stats.tsx already has in memory (`api.words()`
 * is a full list fetch) — a pure client-side aggregation, no new endpoint.
 * Kaikki coverage is framed as a small secondary caveat, not a headline
 * stat — it's a measure of this app's own enrichment-pipeline coverage, not
 * really a "how well are you learning" number the way everything else here is.
 */
export function VocabBreakdownCard({ words }: { words: Word[] }) {
  const leechCount = words.filter((w) => w.leech).length;
  const starredCount = words.filter((w) => w.starred).length;

  const themenfeldCounts = new Map<Themenfeld, number>();
  for (const w of words) {
    for (const t of w.themenfeld) themenfeldCounts.set(t, (themenfeldCounts.get(t) ?? 0) + 1);
  }
  const topThemenfeld = [...themenfeldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const levelCounts = LEVELS.map((l) => ({ level: l, count: words.filter((w) => w.level === l).length }));
  const unclassified = words.length - levelCounts.reduce((a, l) => a + l.count, 0);

  const enrichedCount = words.filter((w) => w.declension !== null || w.conjugation !== null || w.exampleTranslation !== null).length;
  const coveragePct = words.length === 0 ? 0 : Math.round((enrichedCount / words.length) * 100);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <div className="flex items-center gap-1.5 text-[16px] font-medium">
            <Warning size={13} weight="regular" style={{ color: "#e4c4b6" }} aria-hidden="true" />
            {leechCount}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            flagged tricky
          </div>
        </div>
        <div className="flex-1 rounded-xl p-3" style={{ background: "#1c1f2c" }}>
          <div className="flex items-center gap-1.5 text-[16px] font-medium">
            <Star size={13} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
            {starredCount}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(233,233,237,.5)" }}>
            starred
          </div>
        </div>
      </div>

      {topThemenfeld.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.62)" }}>
            Top topics
          </div>
          <div className="flex flex-col gap-1">
            {topThemenfeld.map(([theme, count]) => (
              <div key={theme} className="flex items-center justify-between text-[12px]">
                <span style={{ color: "rgba(233,233,237,.65)" }}>{THEMENFELD_LABELS[theme]}</span>
                <span style={{ color: "rgba(233,233,237,.62)" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.62)" }}>
          By level
        </div>
        <div className="flex gap-1.5">
          {levelCounts.map((l) => (
            <div key={l.level} className="flex-1 rounded-lg py-1.5 text-center" style={{ background: "#20222f" }}>
              <div className="text-[13px] font-medium">{l.count}</div>
              <div className="text-[9px]" style={{ color: "rgba(233,233,237,.45)" }}>
                {LEVEL_LABELS[l.level]}
              </div>
            </div>
          ))}
          {unclassified > 0 && (
            <div className="flex-1 rounded-lg py-1.5 text-center" style={{ background: "#20222f" }}>
              <div className="text-[13px] font-medium">{unclassified}</div>
              <div className="text-[9px]" style={{ color: "rgba(233,233,237,.45)" }}>
                other
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[10.5px] leading-[1.5]" style={{ color: "rgba(233,233,237,.62)" }}>
        {coveragePct}% of your words have real grammar-table or translation data from this app's dictionary enrichment.
      </p>
    </div>
  );
}

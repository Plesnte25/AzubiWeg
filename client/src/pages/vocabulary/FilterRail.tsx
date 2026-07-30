import type { ReactNode } from "react";
import type { CefrLevel, Word } from "../../api/types";
import { cn } from "../../lib/cn";
import { GENUS_COLORS, THEMENFELD_LABELS, THEMENFELD_ORDER, WORTART_COLORS, WORTART_ORDER } from "../../lib/vocab";
import type { VocabFilters } from "./useVocabFacets";

const LEVELS: { key: CefrLevel | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "a1", label: "A1" },
  { key: "a2", label: "A2" },
  { key: "b1", label: "B1" },
];

const GENUS_ORDER = ["der", "die", "das"] as const;

interface FilterRailProps {
  filters: VocabFilters;
  onChange: (patch: Partial<VocabFilters>) => void;
  levelCounts: Record<string, number>;
  wortartCounts: Record<string, number>;
  genusCounts: Record<string, number>;
  themenfeldCounts: Record<string, number>;
  lessonCounts: Record<string, number>;
  filtered: Word[];
}

function RailSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-hairline pt-2 first:border-t-0 first:pt-0">
      <p className="mb-1.5 text-[10px] font-bold tracking-wide text-ink-400">{label}</p>
      {children}
    </div>
  );
}

export function FilterRail({
  filters,
  onChange,
  levelCounts,
  wortartCounts,
  genusCounts,
  themenfeldCounts,
  lessonCounts,
  filtered,
}: FilterRailProps) {
  return (
    // Sticky (not fixed): the page content column is centered with a
    // max-width (see Layout.tsx), so a viewport-relative `fixed` offset
    // would drift out of alignment on wide screens — sticky naturally
    // tracks the column's real left edge while still staying pinned once
    // scrolled to. Density is tuned so the whole stack fits one lg
    // viewport without its own scrollbar in the common case.
    <div className="flex shrink-0 flex-col gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-[214px] lg:self-start lg:overflow-y-auto">
      <RailSection label="LEVEL">
        <div className="flex shrink-0 gap-1 rounded-full border border-hairline bg-card p-1">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              className={cn(
                "flex-1 cursor-pointer rounded-full px-1.5 py-0.5 text-xs font-medium transition-all hover:scale-105",
                filters.level === l.key ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper",
              )}
              onClick={() => onChange({ level: l.key })}
            >
              {l.label}
              <span className="ml-1 opacity-70">{l.key === "all" ? filtered.length : (levelCounts[l.key] ?? 0)}</span>
            </button>
          ))}
        </div>
      </RailSection>

      <RailSection label="THEMENFELD">
        <div className="flex shrink-0 flex-col">
          <FacetRow
            active={filters.themenfeld === "all"}
            label="Alle"
            count={filtered.length}
            onClick={() => onChange({ themenfeld: "all" })}
          />
          {THEMENFELD_ORDER.map((t) => (
            <FacetRow
              key={t}
              active={filters.themenfeld === t}
              label={THEMENFELD_LABELS[t]}
              count={themenfeldCounts[t] ?? 0}
              dim={!themenfeldCounts[t]}
              onClick={() => onChange({ themenfeld: t })}
            />
          ))}
          <FacetRow
            active={filters.themenfeld === "unclassified"}
            label="Unclassified"
            count={themenfeldCounts.unclassified ?? 0}
            dim={!themenfeldCounts.unclassified}
            onClick={() => onChange({ themenfeld: "unclassified" })}
          />
        </div>
      </RailSection>

      <RailSection label="WORTART">
        <div className="flex shrink-0 flex-col">
          <FacetRow active={filters.wortart === "all"} label="Alle" count={filtered.length} onClick={() => onChange({ wortart: "all" })} />
          {WORTART_ORDER.map((w) => (
            <FacetRow
              key={w}
              active={filters.wortart === w}
              label={w}
              count={wortartCounts[w] ?? 0}
              dim={!wortartCounts[w]}
              dotColor={WORTART_COLORS[w]}
              onClick={() => onChange({ wortart: w })}
            />
          ))}
        </div>

        <div className="mt-1.5 flex shrink-0 gap-1 border-t border-hairline pt-1.5">
          {GENUS_ORDER.map((g) => (
            <button
              key={g}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs transition-all hover:scale-105",
                filters.genus === g ? "font-medium text-white" : "text-ink-600 hover:bg-paper",
              )}
              style={filters.genus === g ? { backgroundColor: GENUS_COLORS[g] } : undefined}
              onClick={() => onChange({ genus: filters.genus === g ? "all" : g })}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: filters.genus === g ? "white" : GENUS_COLORS[g] }}
                aria-hidden="true"
              />
              {g} {genusCounts[g] ?? 0}
            </button>
          ))}
        </div>
      </RailSection>

      <RailSection label="WOCHE / QUELLE">
        <select
          className="w-full shrink-0 cursor-pointer rounded-md border border-hairline bg-card px-2 py-1 text-xs outline-none transition-colors focus:border-brand-400"
          value={filters.lesson}
          onChange={(e) => onChange({ lesson: e.target.value })}
        >
          <option value="all">All</option>
          {Object.entries(lessonCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([lesson, count]) => (
              <option key={lesson} value={lesson}>
                {lesson} ({count})
              </option>
            ))}
        </select>
      </RailSection>
    </div>
  );
}

function FacetRow({
  active,
  label,
  count,
  dim,
  dotColor,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  dim?: boolean;
  dotColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-all hover:translate-x-0.5",
        active ? "bg-brand-50 font-medium text-brand-700" : "text-ink-600 hover:bg-paper",
        dim && !active && "text-ink-400/60",
      )}
      onClick={onClick}
    >
      {dotColor && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{count}</span>
    </button>
  );
}

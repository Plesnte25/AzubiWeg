import { useMemo } from "react";
import type { Word } from "../../api/types";
import { chipColor } from "../../lib/wordDisplay";

const W = 300;
const H = 250;
const CENTER_X = 150;
const CENTER_Y = 125;

/** Deterministic pseudo-random layout (same seed every render for a given
 * word list) — a stable, roughly-circular scatter, denser toward the
 * center. Not a physics/force layout, just enough jitter that ~20+ dots
 * don't overlap in a grid. */
function layoutFor(index: number, total: number): { x: number; y: number } {
  const golden = 2.399963229728653; // golden angle, spreads points evenly
  const i = index + 0.5;
  const radius = 18 + Math.sqrt(i / total) * 108;
  const angle = i * golden;
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * 0.82 * Math.sin(angle), // squashed to fill the wider viewBox
  };
}

/**
 * The handoff's word-constellation (sProgress) — every dot a word, size/
 * opacity by real SRS strength, a pulsing highlight on the most recently
 * reviewed word. The handoff also draws faint "word family" connecting
 * lines; there's no bulk word-family-graph endpoint (only a per-word
 * GET /words/:id/family lookup, and fetching that per displayed dot would
 * be an N+1 flood), so — same call as CLAUDE.md's declension/word-family
 * guidance elsewhere — the lines are dropped rather than faked, not
 * patched in with placeholder data.
 */
export function Constellation({ words, highlightWordId }: { words: Word[]; highlightWordId: string | null }) {
  const sample = useMemo(() => {
    // cap the dot count for a readable scatter even with a large deck;
    // prioritize showing the highlighted word if it exists
    const MAX_DOTS = 60;
    const highlighted = highlightWordId ? words.find((w) => w.id === highlightWordId) : undefined;
    const rest = words.filter((w) => w.id !== highlightWordId);
    const picked = [...(highlighted ? [highlighted] : []), ...rest].slice(0, MAX_DOTS);
    return picked.map((w, i) => {
      const pos = layoutFor(i, Math.max(picked.length, 1));
      const strength = w.state === "mastered" ? 1 : w.state === "learning" ? 0.65 : w.state === "due" ? 0.45 : 0.3;
      return { word: w, x: pos.x, y: pos.y, r: 1.3 + strength * 1.6, opacity: 0.4 + strength * 0.55 };
    });
  }, [words, highlightWordId]);

  const highlight = sample.find((s) => s.word.id === highlightWordId) ?? sample[0];

  return (
    <div className="relative grid place-items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[246px] w-[296px] lg:h-[300px] lg:w-[360px]">
        <defs>
          <radialGradient id="constellationGlow">
            <stop offset="0%" stopColor="#b5abfc" stopOpacity=".5" />
            <stop offset="100%" stopColor="#9184d9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CENTER_X} cy={CENTER_Y} r={105} fill="url(#constellationGlow)" className="animate-pulse-glow" />
        <g fill="#d2cefd">
          {sample.map((s) => (
            <circle
              key={s.word.id}
              cx={s.x}
              cy={s.y}
              r={s.r}
              opacity={s.opacity}
              fill={s.word.genus ? chipColor(s.word) : "#d2cefd"}
            />
          ))}
        </g>
        {highlight && (
          <circle cx={highlight.x} cy={highlight.y} r={5} fill="#161826" stroke="#b5abfc" strokeWidth={2} className="animate-pulse-glow" />
        )}
      </svg>
      {highlight && (
        <span
          className="pointer-events-none absolute text-[10px] leading-none whitespace-nowrap"
          style={{
            left: `${(highlight.x / W) * 100}%`,
            top: `${(highlight.y / H) * 100 + 6}%`,
            color: "#b5abfc",
          }}
        >
          {highlightWordId ? "last reviewed" : ""}
        </span>
      )}
      <div className="absolute -bottom-1 text-center text-[11px] leading-[1.5]" style={{ color: "rgba(233,233,237,.4)" }}>
        Every dot a word
      </div>
    </div>
  );
}
